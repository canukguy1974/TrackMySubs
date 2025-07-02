
'use client';

import React, { useState, useMemo, useTransition } from 'react';
import SubscriptionCard from '@/components/dashboard/subscription-card';
import AddSubscriptionModal from '@/components/dashboard/add-subscription-modal';
import FilterControls from '@/components/dashboard/filter-controls';
import SubscriptionCalendar from '@/components/dashboard/subscription-calendar';
import { Button } from '@/components/ui/button';
import type { Subscription, SubscriptionCategory, UserProfile } from '@/types';
import { PlusCircle, MailSearch, AlertTriangle, Calendar, LayoutGrid, Mail } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { detectSubscriptionFromEmail, DetectSubscriptionFromEmailInput } from '@/ai/flows/detect-subscription-from-email';
import { categorizeSubscription, CategorizeSubscriptionInput } from '@/ai/flows/categorize-subscription';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { addSubscription, updateSubscription, deleteSubscription, toggleNotification } from '@/app/actions/subscriptions';
import { updateUser } from '@/app/actions/user';
import { UserTierService, UsageTracker } from '@/services/user-tiers';
import { Input } from '@/components/ui/input';

// Helper function to validate date strings
function isValidDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.getTime() > 0;
}


interface DashboardClientProps {
  initialSubscriptions: Subscription[];
  userProfile: UserProfile;
}

export default function DashboardClient({
  initialSubscriptions,
  userProfile,
}: DashboardClientProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);
  const [currentUser, setCurrentUser] = useState<UserProfile>(userProfile);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SubscriptionCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  
  // Gmail scan state
  const [isGmailScanOpen, setIsGmailScanOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isGmailScanning, setIsGmailScanning] = useState(false);
  const [gmailScanResult, setGmailScanResult] = useState<any>(null);
  const [dailyScansUsed, setDailyScansUsed] = useState(0);
  
  // User tier information
  const userLimits = useMemo(() => UserTierService.getUserLimits(currentUser), [currentUser]);
  const scansRemaining = useMemo(() => UserTierService.getDailyScansRemaining(currentUser, dailyScansUsed), [currentUser, dailyScansUsed]);

  const handleSaveSubscription = (subscriptionData: Omit<Subscription, 'id' | 'userId'>) => {
    startTransition(async () => {
      const isUpdating = !!editingSubscription;
      try {
        if (isUpdating && editingSubscription._id) {
          const fullSub: Subscription = {
            ...subscriptionData,
            _id: editingSubscription._id,
            id: editingSubscription.id,
            userId: currentUser.uid,
          };
          await updateSubscription(currentUser.uid, fullSub);
          setSubscriptions(prev => prev.map(s => s.id === fullSub.id ? fullSub : s));
        } else {
          const newSub = await addSubscription(currentUser.uid, subscriptionData);
          setSubscriptions(prev => [newSub, ...prev]);
        }
        toast({ title: "Subscription Saved!", description: `${subscriptionData.serviceName} has been ${isUpdating ? 'updated' : 'added'}.` });
        setEditingSubscription(null);
      } catch (error) {
        console.error('Error saving subscription:', error);
        toast({ title: "Error", description: "Failed to save subscription. Please try again.", variant: "destructive" });
      }
    });
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleDeleteSubscription = (subscriptionId: string) => {
    startTransition(async () => {
      const subToDelete = subscriptions.find(s => s._id === subscriptionId);
      if (!subToDelete) return;

      try {
        await deleteSubscription(currentUser.uid, subscriptionId);
        setSubscriptions(prev => prev.filter(s => s._id !== subscriptionId));
        toast({ title: "Subscription Deleted", description: `${subToDelete.serviceName} has been removed.`, variant: "destructive" });
      } catch (error) {
        console.error('Error deleting subscription:', error);
        toast({ title: "Error", description: "Failed to delete subscription. Please try again.", variant: "destructive" });
      }
    });
  };

  const handleToggleNotification = (subscriptionId: string, enabled: boolean) => {
    startTransition(async () => {
      try {
        await toggleNotification(currentUser.uid, subscriptionId, enabled);
        setSubscriptions(prev => prev.map(s => s._id === subscriptionId ? { ...s, notificationsEnabled: enabled } : s));
        toast({ title: "Notification Preference Updated" });
      } catch (error) {
        console.error('Error updating notification preference:', error);
        toast({ title: "Error", description: "Failed to update notification preference.", variant: "destructive" });
      }
    });
  };
  
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions || !Array.isArray(subscriptions)) {
      return [];
    }
    return subscriptions.filter(sub => {
      if (!sub || typeof sub.serviceName !== 'string') {
        return false;
      }
      const categoryMatch = selectedCategory === 'all' || sub.category === selectedCategory;
      const searchTermMatch = sub.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && searchTermMatch;
    });
  }, [subscriptions, selectedCategory, searchTerm]);

  const openAddModal = () => {
    setEditingSubscription(null);
    setIsModalOpen(true);
  };

  const handleScanEmail = async () => {
    if (!emailContent.trim()) {
      toast({ title: "Email content is empty", description: "Please paste email content to scan.", variant: "destructive" });
      return;
    }
    setIsScanning(true);
    setScanProgress(30);

    try {
      const input: DetectSubscriptionFromEmailInput = { emailContent };
      const result = await detectSubscriptionFromEmail(input);
      setScanProgress(70);
      
      if (result.isSubscriptionRelated && result.serviceName) {
        const categoryInput: CategorizeSubscriptionInput = {
          subscriptionName: result.serviceName,
          subscriptionDescription: `Detected from email. Billing: ${result.billingDate || 'N/A'}.`,
        };
        const categoryResult = await categorizeSubscription(categoryInput);
        setScanProgress(90);

        const newSubscriptionData: Omit<Subscription, 'id' | 'userId'> = {
          serviceName: result.serviceName,
          billingDate: result.billingDate && isValidDate(result.billingDate) ? new Date(result.billingDate).toISOString() : undefined,
          nextBillingDate: result.billingDate && isValidDate(result.billingDate) ? new Date(result.billingDate).toISOString() : undefined,
          renewalPeriod: 'monthly', // Default, user can edit
          price: 0, // Will need to be filled in by user
          currency: 'USD',
          paymentMethod: (result.paymentMethod as Subscription["paymentMethod"]) || 'Unknown',
          trialEndDate: result.trialEndDate && isValidDate(result.trialEndDate) ? new Date(result.trialEndDate).toISOString() : undefined,
          category: categoryResult.category as SubscriptionCategory || 'Other',
          autoRenew: true,
          notificationsEnabled: true,
          detectedFromEmail: true,
          notes: `Detected from email.`,
        };
        
        const newSub = await addSubscription(currentUser.uid, newSubscriptionData);
        setSubscriptions(prev => [newSub, ...prev]);

        toast({ title: "Subscription Detected!", description: `${result.serviceName} added. Please review details.` });
      
        if(!currentUser.isPremium){
           const updatedUser = await updateUser(currentUser.uid, { freeScansUsed: (currentUser.freeScansUsed || 0) + 1 });
           if (updatedUser) setCurrentUser(updatedUser);
        }

      } else {
        toast({ title: "No Subscription Detected", description: "The AI could not identify a subscription in the email." });
      }
    } catch (error) {
      console.error("Error scanning email:", error);
      toast({ title: "Scan Failed", description: "An error occurred during AI processing.", variant: "destructive" });
    } finally {
      setScanProgress(100);
      setTimeout(() => {
        setIsScanning(false);
        setIsScanModalOpen(false);
        setEmailContent('');
        setScanProgress(0);
      }, 1000);
    }
  };
  
  const canScan = currentUser.isPremium || (currentUser.freeScansUsed || 0) < 1;
  const emailScansRemaining = !currentUser.isPremium ? 1 - (currentUser.freeScansUsed || 0) : Infinity;
  
  const handleGmailScan = async () => {
    // Check if user can perform Gmail scan
    if (!UserTierService.canPerformGmailScan(currentUser, dailyScansUsed)) {
      toast({ 
        title: "Daily limit reached", 
        description: UserTierService.getUpgradeMessage('Gmail scanning'),
        variant: "destructive" 
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({ title: "Phone number required", description: "Please enter your phone number for notifications.", variant: "destructive" });
      return;
    }

    // Check for Gmail OAuth tokens
    const gmailTokensKey = Object.keys(localStorage).find(key => key.startsWith('gmail_tokens_'));
    let accessToken = null;
    
    if (gmailTokensKey) {
      try {
        const tokens = JSON.parse(localStorage.getItem(gmailTokensKey) || '{}');
        accessToken = tokens.accessToken;
      } catch (error) {
        console.error('Error parsing Gmail tokens:', error);
      }
    }

    if (!accessToken) {
      toast({ 
        title: "Gmail not connected", 
        description: "Please connect your Gmail account first in the Connect Account page.",
        variant: "destructive" 
      });
      return;
    }

    setIsGmailScanning(true);
    setGmailScanResult(null);

    try {
      const response = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          phoneNumber,
          userProfile: currentUser,
          isPremium: currentUser.isPremium
        }),
      });

      const result = await response.json();
      setGmailScanResult(result);

      if (result.success) {
        // Update daily scans count
        setDailyScansUsed(prev => prev + 1);
        
        // Add found subscriptions to the list with proper format
        if (result.subscriptions && result.subscriptions.length > 0) {
          const newSubscriptions = await Promise.all(
            result.subscriptions.map(async (sub: any) => {
              const newSub = await addSubscription(currentUser.uid, {
                ...sub,
                userId: currentUser.uid
              });
              return newSub;
            })
          );
          setSubscriptions(prev => [...prev, ...newSubscriptions]);
        }
        
        toast({ 
          title: "Gmail scan completed!", 
          description: result.message + (result.smsEnabled ? ' SMS notification sent!' : '')
        });
      } else if (result.requiresUpgrade) {
        toast({ 
          title: "Upgrade required", 
          description: result.message,
          variant: "destructive" 
        });
      } else if (result.requiresAuth) {
        toast({ 
          title: "Authentication required", 
          description: result.error,
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Scan failed", 
          description: result.error || 'Gmail scan failed',
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error scanning Gmail:', error);
      toast({ 
        title: "Scan failed", 
        description: 'Failed to scan Gmail. Please try again.',
        variant: "destructive" 
      });
    } finally {
      setIsGmailScanning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Subscription Dashboard</h1>
          <p className="text-muted-foreground">Manage all your active and upcoming subscriptions.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsScanModalOpen(true)} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={!canScan && !currentUser.isPremium}>
            <MailSearch className="mr-2 h-4 w-4" /> Scan Email
            {!currentUser.isPremium && ` (${emailScansRemaining} free scan${emailScansRemaining === 1 ? '' : 's'} left)`}
          </Button>
          <Button 
            onClick={() => setIsGmailScanOpen(true)} 
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity"
            disabled={!UserTierService.canPerformGmailScan(currentUser, dailyScansUsed) && !currentUser.isPremium}
          >
            <Mail className="mr-2 h-4 w-4" /> 
            Gmail Scan
            {` (${scansRemaining} left today)`}
          </Button>
          <Button onClick={openAddModal} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Subscription
          </Button>
          {currentUser.isPremium && (
            <Button 
              variant="outline" 
              onClick={() => setViewMode(viewMode === 'grid' ? 'calendar' : 'grid')}
              className="flex items-center gap-2"
            >
              {viewMode === 'grid' ? (
                <><Calendar className="mr-2 h-4 w-4" /> Calendar View</>
              ) : (
                <><LayoutGrid className="mr-2 h-4 w-4" /> Grid View</>
              )}
            </Button>
          )}
        </div>
      </div>

      {!currentUser.isPremium && (currentUser.freeScansUsed || 0) >= 1 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3 text-yellow-300">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm">You've used your free AI email scan. <Button variant="link" className="p-0 h-auto text-yellow-300 hover:text-yellow-200" asChild><Link href="/billing">Upgrade to Premium</Link></Button> for unlimited scans!</p>
        </div>
      )}
      
      {!currentUser.isPremium && scansRemaining <= 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-300">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm">Daily Gmail scan limit reached. <Button variant="link" className="p-0 h-auto text-red-300 hover:text-red-200" asChild><Link href="/billing">Upgrade to Premium</Link></Button> for 20 daily scans and SMS notifications!</p>
        </div>
      )}

      {viewMode === 'grid' && (
        <FilterControls
          categories={[]}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onResetFilters={() => { setSelectedCategory('all'); setSearchTerm(''); }}
        />
      )}

      {viewMode === 'calendar' && currentUser.isPremium ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📅 Premium Calendar View</h3>
            <p className="text-sm text-muted-foreground">View all your subscription billing dates at a glance.</p>
          </div>
          <SubscriptionCalendar subscriptions={subscriptions} />
        </div>
      ) : (
        filteredSubscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubscriptions.map(sub => (
              <SubscriptionCard
                key={sub._id || sub.id}
                subscription={sub}
                onEdit={handleEditSubscription}
                onDelete={() => handleDeleteSubscription(sub._id!)}
                onToggleNotification={handleToggleNotification}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg shadow">
            <h3 className="text-xl font-semibold">No Subscriptions Found</h3>
            <p className="text-muted-foreground mt-2">
              {searchTerm || selectedCategory !== 'all' ? "Try adjusting your filters or " : "Get started by adding a new subscription."}
            </p>
            {searchTerm || selectedCategory !== 'all' ? 
              <Button variant="outline" onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }} className="mt-4">Clear Filters</Button> :
              <Button onClick={openAddModal} className="mt-4">Add Manually</Button>
            }
          </div>
        )
      )}

      <AddSubscriptionModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveSubscription}
        existingSubscription={editingSubscription}
        isPending={isPending}
      />

      <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Email for Subscriptions</DialogTitle>
            <DialogDescription>
              Paste the full content of an email below. Our AI will try to detect subscription details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Textarea
              placeholder="Paste email content here..."
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={10}
              disabled={isScanning}
            />
            {isScanning && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Scanning with AI...</p>
                <Progress value={scanProgress} className="w-full" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScanModalOpen(false)} disabled={isScanning}>Cancel</Button>
            <Button onClick={handleScanEmail} disabled={isScanning || !emailContent.trim() || (!canScan && !currentUser.isPremium)}>
              {isScanning ? 'Scanning...' : 'Scan with AI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Gmail Scan Modal */}
      <Dialog open={isGmailScanOpen} onOpenChange={setIsGmailScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gmail Subscription Scan</DialogTitle>
            <DialogDescription>
              Connect your Gmail to automatically scan for subscription emails and get SMS notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label htmlFor="phone" className="text-sm font-medium">Phone Number for SMS Notifications</label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isGmailScanning}
              />
              {!userLimits.hasSMSNotifications && (
                <p className="text-xs text-muted-foreground mt-1">
                  SMS notifications are a Premium feature. Free users will see results on screen only.
                </p>
              )}
            </div>
            
            {!currentUser.isPremium && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  📱 <strong>Free Tier:</strong> {scansRemaining} Gmail scan{scansRemaining === 1 ? '' : 's'} remaining today
                </p>
                <p className="text-xs text-blue-200 mt-1">
                  Upgrade to Premium for unlimited daily scans, SMS notifications, and auto-scanning!
                </p>
              </div>
            )}
            
            {gmailScanResult && (
              <div className={`p-3 rounded-lg border ${gmailScanResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className="text-sm font-medium">
                  {gmailScanResult.success ? '✅ ' : '❌ '}
                  {gmailScanResult.message || (gmailScanResult.success ? 'Gmail scan completed!' : 'Scan failed')}
                </p>
                {gmailScanResult.success && gmailScanResult.count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Found {gmailScanResult.count} subscription{gmailScanResult.count === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGmailScanOpen(false)} disabled={isGmailScanning}>Cancel</Button>
            <Button 
              onClick={handleGmailScan} 
              disabled={isGmailScanning || !phoneNumber.trim() || (!UserTierService.canPerformGmailScan(currentUser, dailyScansUsed) && !currentUser.isPremium)}
            >
              {isGmailScanning ? 'Scanning Gmail...' : 'Start Gmail Scan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
