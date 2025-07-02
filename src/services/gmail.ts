import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface SubscriptionEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
}

export interface ExtractedSubscription {
  serviceName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  nextBillingDate?: string;
  confidence: number;
  source: 'gmail';
}

class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/auth/gmail/callback`
    );
  }

  setCredentials(credentials: GmailCredentials) {
    this.oauth2Client.setCredentials(credentials);
  }

  async getAuthUrl(): Promise<string> {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  async getTokens(code: string): Promise<GmailCredentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens as GmailCredentials;
  }

  async refreshAccessToken(refreshToken: string): Promise<GmailCredentials> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials as GmailCredentials;
  }

  async scanForSubscriptions(credentials: GmailCredentials, maxResults: number = 50): Promise<ExtractedSubscription[]> {
    this.setCredentials(credentials);
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    try {
      // Search for subscription-related emails
      const searchQueries = [
        'subject:(subscription OR billing OR payment OR invoice OR receipt)',
        'from:(noreply OR billing OR subscriptions OR payments)',
        'subject:(trial OR premium OR upgrade OR plan)',
        'body:(monthly OR annual OR billing cycle OR next payment)'
      ];

      const allEmails: SubscriptionEmail[] = [];

      for (const query of searchQueries) {
        try {
          const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: Math.ceil(maxResults / searchQueries.length)
          });

          if (response.data.messages) {
            for (const message of response.data.messages.slice(0, 10)) {
              try {
                const email = await gmail.users.messages.get({
                  userId: 'me',
                  id: message.id!
                });

                const headers = email.data.payload?.headers || [];
                const subject = headers.find(h => h.name === 'Subject')?.value || '';
                const from = headers.find(h => h.name === 'From')?.value || '';
                const date = headers.find(h => h.name === 'Date')?.value || '';

                allEmails.push({
                  id: message.id!,
                  subject,
                  from,
                  date,
                  snippet: email.data.snippet || '',
                  body: this.extractEmailBody(email.data)
                });
              } catch (emailError) {
                console.warn(`Failed to fetch email ${message.id}:`, emailError);
              }
            }
          }
        } catch (queryError) {
          console.warn(`Search query failed: ${query}`, queryError);
        }
      }

      // Remove duplicates
      const uniqueEmails = allEmails.filter((email, index, self) => 
        index === self.findIndex(e => e.id === email.id)
      );

      // Extract subscription information
      return this.extractSubscriptionData(uniqueEmails);
    } catch (error) {
      console.error('Gmail scanning failed:', error);
      throw new Error('Failed to scan Gmail for subscriptions');
    }
  }

  private extractEmailBody(payload: any): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
        if (part.parts) {
          const nestedBody = this.extractEmailBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return '';
  }

  private extractSubscriptionData(emails: SubscriptionEmail[]): ExtractedSubscription[] {
    const subscriptions: ExtractedSubscription[] = [];

    // Common service patterns
    const servicePatterns = [
      { pattern: /netflix/i, name: 'Netflix' },
      { pattern: /spotify/i, name: 'Spotify' },
      { pattern: /adobe/i, name: 'Adobe' },
      { pattern: /microsoft/i, name: 'Microsoft' },
      { pattern: /google/i, name: 'Google' },
      { pattern: /amazon prime/i, name: 'Amazon Prime' },
      { pattern: /disney/i, name: 'Disney+' },
      { pattern: /hulu/i, name: 'Hulu' },
      { pattern: /apple/i, name: 'Apple' },
      { pattern: /dropbox/i, name: 'Dropbox' },
      { pattern: /github/i, name: 'GitHub' },
      { pattern: /zoom/i, name: 'Zoom' },
      { pattern: /slack/i, name: 'Slack' },
      { pattern: /notion/i, name: 'Notion' }
    ];

    // Price patterns
    const pricePattern = /\$?(\d+(?:\.\d{2})?)\s*(?:\/\s*)?(month|monthly|year|yearly|annual)?/gi;
    const currencyPattern = /(\$|USD|EUR|GBP|CAD)/i;

    for (const email of emails) {
      const fullText = `${email.subject} ${email.snippet} ${email.body || ''}`.toLowerCase();
      
      // Find service name
      let serviceName = 'Unknown Service';
      let confidence = 0.3;

      for (const service of servicePatterns) {
        if (service.pattern.test(fullText)) {
          serviceName = service.name;
          confidence = 0.8;
          break;
        }
      }

      // If no known service, try to extract from sender
      if (serviceName === 'Unknown Service') {
        const fromDomain = email.from.match(/@([^>]+)/)?.[1];
        if (fromDomain) {
          serviceName = fromDomain.split('.')[0];
          serviceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
          confidence = 0.6;
        }
      }

      // Extract price information
      const priceMatches = Array.from(fullText.matchAll(pricePattern));
      if (priceMatches.length > 0) {
        const match = priceMatches[0];
        const amount = match[1];
        const cycle = match[2] || 'monthly';
        
        let currency = 'USD';
        const currencyMatch = fullText.match(currencyPattern);
        if (currencyMatch) {
          currency = currencyMatch[1] === '$' ? 'USD' : currencyMatch[1];
        }

        // Try to extract next billing date
        const datePattern = /(next billing|renewal|due).*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i;
        const dateMatch = fullText.match(datePattern);
        let nextBillingDate: string | undefined;
        
        if (dateMatch) {
          nextBillingDate = dateMatch[2];
        }

        subscriptions.push({
          serviceName,
          amount,
          currency,
          billingCycle: cycle,
          nextBillingDate,
          confidence,
          source: 'gmail'
        });
      }
    }

    // Remove duplicates and low confidence results
    return subscriptions
      .filter(sub => sub.confidence > 0.5)
      .filter((sub, index, self) => 
        index === self.findIndex(s => s.serviceName === sub.serviceName)
      );
  }
}

export const gmailService = new GmailService();
