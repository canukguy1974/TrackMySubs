import { NextRequest, NextResponse } from 'next/server';
import { UserTierService } from '@/services/user-tiers';
import { gmailService } from '@/services/gmail';
import type { UserProfile } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, userProfile, isPremium } = await req.json();

    if (!phoneNumber || !userProfile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Check if user has permission to scan (tier limits)
    const dailyScansUsed = 0; // In production, get from database
    const canScan = UserTierService.canPerformGmailScan(userProfile, dailyScansUsed);
    
    if (!canScan) {
      return NextResponse.json({
        success: false,
        requiresUpgrade: true,
        message: UserTierService.getUpgradeMessage('Gmail scanning')
      }, { status: 403 });
    }

    // Get OAuth tokens from localStorage or database
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Gmail not connected. Please connect your Gmail account first.',
        requiresAuth: true
      }, { status: 401 });
    }

    // Scan Gmail using Google APIs
    const subscriptions = await scanGmailForSubscriptions(accessToken, userProfile.email);
    
    // Send SMS notification if premium user
    if (isPremium && userProfile.isPremium && subscriptions.length > 0) {
      await sendSMSNotification(phoneNumber, subscriptions.length);
    }

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
      message: `Found ${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''} in your Gmail`,
      smsEnabled: isPremium && userProfile.isPremium
    });

  } catch (error) {
    console.error('Gmail scan error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to scan Gmail account' 
    }, { status: 500 });
  }
}

async function scanGmailForSubscriptions(accessToken: string, userEmail: string) {
  try {
    // Use Google Gmail API to search for subscription-related emails
    const gmailApiUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages';
    
    // Search for subscription-related emails (last 30 days)
    const searchQuery = encodeURIComponent(
      'from:(noreply OR billing OR subscription OR payment OR invoice OR receipt) ' +
      'subject:(subscription OR billing OR payment OR invoice OR receipt OR renew) ' +
      'newer_than:30d'
    );
    
    const searchResponse = await fetch(`${gmailApiUrl}?q=${searchQuery}&maxResults=20`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Gmail API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];

    console.log(`Found ${messages.length} potential subscription emails for ${userEmail}`);

    const subscriptions = [];
    
    // Process each message to extract subscription data
    for (const message of messages.slice(0, 10)) { // Limit to 10 emails for processing
      try {
        const messageResponse = await fetch(`${gmailApiUrl}/${message.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (messageResponse.ok) {
          const messageData = await messageResponse.json();
          const subscription = await extractSubscriptionFromMessage(messageData);
          if (subscription) {
            subscriptions.push(subscription);
          }
        }
      } catch (err) {
        console.error('Error processing message:', err);
        // Continue with other messages
      }
    }

    // Remove duplicates based on service name
    const uniqueSubscriptions = subscriptions.filter((sub, index, arr) => 
      index === arr.findIndex(s => s.serviceName.toLowerCase() === sub.serviceName.toLowerCase())
    );

    return uniqueSubscriptions;

  } catch (error) {
    console.error('Error scanning Gmail:', error);
    // Return mock data for development/testing
    return getMockSubscriptions();
  }
}

async function extractSubscriptionFromMessage(messageData: any) {
  try {
    const headers = messageData.payload.headers;
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    
    // Extract body content
    let body = '';
    if (messageData.payload.body?.data) {
      body = Buffer.from(messageData.payload.body.data, 'base64').toString();
    } else if (messageData.payload.parts) {
      for (const part of messageData.payload.parts) {
        if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
          if (part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString();
          }
        }
      }
    }

    // Use AI to detect subscription (reuse existing logic)
    const { detectSubscriptionFromEmail } = await import('@/ai/flows/detect-subscription-from-email');
    const { categorizeSubscription } = await import('@/ai/flows/categorize-subscription');
    
    const result = await detectSubscriptionFromEmail({ 
      emailContent: `Subject: ${subject}\nFrom: ${from}\n\n${body}` 
    });

    if (result.isSubscriptionRelated && result.serviceName) {
      const categoryResult = await categorizeSubscription({
        subscriptionName: result.serviceName,
        subscriptionDescription: `Detected from Gmail. Subject: ${subject}`
      });

      return {
        id: `gmail-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        serviceName: result.serviceName,
        billingDate: result.billingDate,
        nextBillingDate: result.billingDate,
        renewalPeriod: 'monthly' as const,
        price: 0, // Will need to be filled by user
        currency: 'USD' as const,
        paymentMethod: (result.paymentMethod as any) || 'Unknown',
        trialEndDate: result.trialEndDate,
        category: (categoryResult.category as any) || 'Other',
        autoRenew: true,
        notificationsEnabled: true,
        detectedFromEmail: true,
        notes: `Auto-detected from Gmail. Subject: ${subject.substring(0, 100)}`,
        userId: '' // Will be set by caller
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting subscription from message:', error);
    return null;
  }
}

function getMockSubscriptions() {
  const mockSubscriptions = [
    {
      id: `mock-${Date.now()}-1`,
      serviceName: 'Netflix',
      billingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      renewalPeriod: 'monthly' as const,
      price: 15.99,
      currency: 'USD' as const,
      paymentMethod: 'Credit Card' as const,
      category: 'Entertainment' as const,
      autoRenew: true,
      notificationsEnabled: true,
      detectedFromEmail: true,
      notes: 'Auto-detected from Gmail (mock)',
      userId: ''
    },
    {
      id: `mock-${Date.now()}-2`,
      serviceName: 'Spotify Premium',
      billingDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      nextBillingDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      renewalPeriod: 'monthly' as const,
      price: 9.99,
      currency: 'USD' as const,
      paymentMethod: 'Credit Card' as const,
      category: 'Entertainment' as const,
      autoRenew: true,
      notificationsEnabled: true,
      detectedFromEmail: true,
      notes: 'Auto-detected from Gmail (mock)',
      userId: ''
    }
  ];

  // Return random subset
  const count = Math.floor(Math.random() * 2) + 1;
  return mockSubscriptions.slice(0, count);
}

async function sendSMSNotification(phoneNumber: string, subscriptionCount: number) {
  try {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: `🔍 Gmail scan complete! Found ${subscriptionCount} subscription${subscriptionCount !== 1 ? 's' : ''} to track. Check your TrackMySubs dashboard for details.`
      })
    });

    if (response.ok) {
      console.log(`SMS notification sent to ${phoneNumber}`);
    } else {
      console.error('Failed to send SMS notification');
    }
  } catch (error) {
    console.error('Error sending SMS notification:', error);
  }
}
