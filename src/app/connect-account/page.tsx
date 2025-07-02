
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, PlusCircle, Trash2, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

interface LinkedAccount {
  id: string;
  provider: 'gmail';
  email: string;
  lastScan?: string;
  isScanning?: boolean;
}

const initialAccounts: LinkedAccount[] = [
  { id: 'gmail1', provider: 'gmail', email: 'alex.ryder@gmail.com', lastScan: '2024-06-29T12:00:00Z' },
  { id: 'gmail2', provider: 'gmail', email: 'personal.subscriptions@gmail.com', lastScan: '2024-06-26T12:00:00Z' },
];

export default function ConnectAccountPage() {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(initialAccounts);
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle OAuth callback tokens
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const success = searchParams.get('success');
    
    if (success === 'true' && accessToken && refreshToken) {
      // Store the tokens and get user info
      handleOAuthSuccess(accessToken, refreshToken);
      
      // Clean up URL
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [searchParams]);

  const handleOAuthSuccess = async (accessToken: string, refreshToken: string) => {
    try {
      setIsConnecting(true);
      
      // Get user's Gmail profile info
      const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const userInfo = await response.json();
        
        // Store the Gmail account connection
        const newAccount: LinkedAccount = {
          id: crypto.randomUUID(),
          provider: 'gmail',
          email: userInfo.email,
        };
        
        // Add to linked accounts if not already connected
        setLinkedAccounts(prev => {
          const exists = prev.some(acc => acc.email === userInfo.email);
          if (exists) {
            toast({ 
              title: 'Account Already Connected', 
              description: `${userInfo.email} is already linked to your account.`,
              variant: 'destructive'
            });
            return prev;
          }
          
          toast({ 
            title: 'Gmail Account Connected!', 
            description: `${userInfo.email} has been successfully connected.` 
          });
          
          return [...prev, newAccount];
        });
        
        // Store tokens securely (in production, this would be server-side)
        localStorage.setItem(`gmail_tokens_${userInfo.email}`, JSON.stringify({
          accessToken,
          refreshToken,
          email: userInfo.email
        }));
        
      } else {
        throw new Error('Failed to get user info');
      }
    } catch (error) {
      console.error('OAuth success handling error:', error);
      toast({ 
        title: 'Connection Error', 
        description: 'Failed to complete Gmail connection. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectGmail = () => {
    // Redirect to Gmail OAuth initiation
    window.location.href = '/api/auth/gmail';
  };

  const handleRemoveAccount = (accountId: string) => {
    setLinkedAccounts(prev => prev.filter(acc => acc.id !== accountId));
    toast({ title: 'Account Removed', variant: 'destructive' });
  };

  const handleScanAccount = async (accountId: string) => {
    // Find the account before updating state to avoid circular references
    const accountToScan = linkedAccounts.find(a => a.id === accountId);
    if (!accountToScan) return;
    
    setLinkedAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, isScanning: true } : acc));
    toast({ title: `Scanning ${accountToScan.email}...`, description: 'Looking for subscription emails...' });
    
    try {
      // Try to get real Gmail tokens
      const storedTokens = localStorage.getItem(`gmail_tokens_${accountToScan.email}`);
      let scanResult;
      
      if (storedTokens) {
        // Use real Gmail API
        const tokens = JSON.parse(storedTokens);
        const response = await fetch('/api/scan/gmail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: accountToScan.email,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          })
        });
        
        if (response.ok) {
          scanResult = await response.json();
        } else {
          throw new Error('Gmail API scan failed');
        }
      } else {
        // Fallback to mock scan
        const response = await fetch('/api/scan/mock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: accountToScan.email })
        });
        
        if (response.ok) {
          scanResult = await response.json();
        } else {
          throw new Error('Mock scan failed');
        }
      }
      
      // Update state
      setLinkedAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, isScanning: false, lastScan: new Date().toISOString() } : acc));
      
      // Show results
      if (scanResult.subscriptions && scanResult.subscriptions.length > 0) {
        const foundList = scanResult.subscriptions.map((sub: any) => `${sub.name} (${sub.price}/${sub.cycle})`).join(', ');
        toast({ 
          title: 'Scan Complete!', 
          description: `Found ${scanResult.subscriptions.length} subscription${scanResult.subscriptions.length > 1 ? 's' : ''}: ${foundList}. Check your dashboard to review.`,
          duration: 6000
        });
        
        // Send SMS notification if premium user
        if (user?.isPremium && scanResult.subscriptions.length > 0) {
          try {
            await fetch('/api/sms/notify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: accountToScan.email,
                subscriptions: scanResult.subscriptions
              })
            });
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
        }
      } else {
        toast({ 
          title: 'Scan Complete!', 
          description: `No new subscriptions found in ${accountToScan.email}.` 
        });
      }
      
    } catch (error) {
      console.error('Scan error:', error);
      setLinkedAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, isScanning: false } : acc));
      toast({ 
        title: 'Scan Failed', 
        description: 'There was an error scanning your Gmail account. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold font-headline tracking-tight">Connect Accounts</h1>
      <p className="text-muted-foreground">
        Link your email accounts to automatically detect and manage your subscriptions.
        SubScribe currently supports Gmail.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image src="/google-g-logo.svg" alt="Gmail Logo" width={24} height={24} data-ai-hint="google logo" />
            Connect Gmail Account
          </CardTitle>
          <CardDescription>
            Allow SubScribe to securely scan your Gmail inbox for subscription-related emails. 
            We only look for relevant information and respect your privacy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnectGmail} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
            <PlusCircle className="mr-2 h-4 w-4" /> Connect New Gmail Account
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>Manage your currently connected email accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          {linkedAccounts.length === 0 ? (
            <p className="text-muted-foreground">No accounts connected yet.</p>
          ) : (
            <ul className="space-y-4">
              {linkedAccounts.map(account => (
                <li key={account.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                  <div className="flex items-center gap-3">
                     <Image src="/google-g-logo.svg" alt="Gmail Logo" width={20} height={20} data-ai-hint="google logo" />
                    <div>
                      <p className="font-medium">{account.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Last scan: {account.lastScan ? new Date(account.lastScan).toLocaleDateString() : 'Never'}
                        {account.isScanning && <span className="ml-2 text-primary animate-pulse">(Scanning...)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0 self-end sm:self-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleScanAccount(account.id)}
                      disabled={account.isScanning}
                    >
                      {account.isScanning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Scan Now
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will disconnect {account.email} from SubScribe. 
                            Detected subscriptions from this account will remain unless manually deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveAccount(account.id)}>
                            Confirm Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="text-primary w-5 h-5" /> How Scanning Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. You authorize SubScribe to access your Gmail account (read-only access for emails).</p>
          <p>2. Our AI scans your emails for patterns related to subscriptions, trials, and payments.</p>
          <p>3. We extract key information like service name, billing dates, and amounts.</p>
          <p>4. Your privacy is paramount. We do not store email content, only extracted subscription data.</p>
          <p>5. You can revoke access at any time from this page or your Google Account settings.</p>
        </CardContent>
      </Card>
    </div>
  );
}
