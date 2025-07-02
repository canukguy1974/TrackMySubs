'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export default function TestGmailPage() {
  const [credentials, setCredentials] = useState<GmailCredentials | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check if we got credentials from OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiryDate = urlParams.get('expiry_date');
    
    if (accessToken && refreshToken && expiryDate) {
      const creds: GmailCredentials = {
        access_token: accessToken,
        refresh_token: refreshToken,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: parseInt(expiryDate)
      };
      setCredentials(creds);
      toast({ title: 'Gmail Connected!', description: 'You can now test the scanning functionality.' });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleGmailAuth = async () => {
    try {
      const response = await fetch('/api/auth/gmail');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({ title: 'Error', description: 'Failed to get auth URL', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to initiate Gmail auth', variant: 'destructive' });
    }
  };

  const handleTestScan = async () => {
    if (!credentials) {
      toast({ title: 'Error', description: 'Please authenticate with Gmail first', variant: 'destructive' });
      return;
    }

    if (!phoneNumber) {
      toast({ title: 'Error', description: 'Please enter a phone number for SMS testing', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          credentials,
          isPremium: true
        })
      });

      const data = await response.json();
      setTestResults(data);

      if (data.success) {
        toast({ 
          title: 'Test Completed!', 
          description: `Found ${data.subscriptions?.length || 0} subscriptions. SMS sent to ${phoneNumber}` 
        });
      } else {
        toast({ title: 'Test Failed', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to test scan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gmail & SMS Testing</h1>
        <p className="text-muted-foreground">Test Gmail OAuth authentication and SMS notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Gmail Authentication</CardTitle>
          <CardDescription>
            First, authenticate with Gmail to get OAuth tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!credentials ? (
            <Button onClick={handleGmailAuth}>
              Connect Gmail Account
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">✅ Gmail Connected Successfully!</p>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm font-mono">
                  <strong>Access Token:</strong> {credentials.access_token.substring(0, 20)}...
                </p>
                <p className="text-sm font-mono">
                  <strong>Refresh Token:</strong> {credentials.refresh_token?.substring(0, 20)}...
                </p>
                <p className="text-sm font-mono">
                  <strong>Expiry Date:</strong> {new Date(credentials.expiry_date).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Phone Number for SMS</CardTitle>
          <CardDescription>
            Enter your phone number to receive SMS notifications (must be verified in Twilio for free accounts)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (with country code, e.g., +1234567890)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Test Gmail Scan & SMS</CardTitle>
          <CardDescription>
            Run a complete test of Gmail scanning and SMS notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTestScan} 
            disabled={!credentials || !phoneNumber || loading}
            className="mb-4"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </Button>

          {testResults && (
            <div className="space-y-4">
              <h3 className="font-semibold">Test Results:</h3>
              <Textarea
                value={JSON.stringify(testResults, null, 2)}
                readOnly
                className="h-64 font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Make sure your .env.local file has all required Google and Twilio credentials</p>
          <p>• For Twilio free accounts, verify your phone number in the Twilio Console first</p>
          <p>• The expiry_date is a Unix timestamp in milliseconds</p>
          <p>• In production, credentials should be stored securely in your database, not in URLs</p>
        </CardContent>
      </Card>
    </div>
  );
}
