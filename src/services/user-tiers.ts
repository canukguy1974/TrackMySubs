import type { UserProfile } from '@/types';

export interface UserLimits {
  maxGmailScansPerDay: number;
  maxConnectedEmails: number;
  hasDailyAutoScan: boolean;
  hasSMSNotifications: boolean;
  hasCalendarView: boolean;
  maxSubscriptions: number;
}

export const FREE_TIER_LIMITS: UserLimits = {
  maxGmailScansPerDay: 1,
  maxConnectedEmails: 1,
  hasDailyAutoScan: false,
  hasSMSNotifications: false,
  hasCalendarView: false,
  maxSubscriptions: 10
};

export const PREMIUM_TIER_LIMITS: UserLimits = {
  maxGmailScansPerDay: 20, // reasonable daily limit to prevent abuse
  maxConnectedEmails: 5,
  hasDailyAutoScan: true,
  hasSMSNotifications: true,
  hasCalendarView: true,
  maxSubscriptions: 100 // reasonable limit to prevent abuse
};

export class UserTierService {
  static getUserLimits(user: UserProfile): UserLimits {
    return user.isPremium ? PREMIUM_TIER_LIMITS : FREE_TIER_LIMITS;
  }

  static canPerformGmailScan(user: UserProfile, dailyScansUsed: number = 0): boolean {
    const limits = this.getUserLimits(user);
    return dailyScansUsed < limits.maxGmailScansPerDay;
  }

  static canConnectEmail(user: UserProfile, currentConnections: number): boolean {
    const limits = this.getUserLimits(user);
    return currentConnections < limits.maxConnectedEmails;
  }

  static canAddSubscription(user: UserProfile, currentSubscriptions: number): boolean {
    const limits = this.getUserLimits(user);
    return currentSubscriptions < limits.maxSubscriptions;
  }

  static getUpgradeMessage(feature: string): string {
    return `This ${feature} feature is available for Premium users. Upgrade to unlock 20 daily Gmail scans, multiple email connections, SMS notifications, and daily auto-scans!`;
  }

  static getDailyScansRemaining(user: UserProfile, dailyScansUsed: number): number {
    const limits = this.getUserLimits(user);
    return Math.max(0, limits.maxGmailScansPerDay - dailyScansUsed);
  }
}

// Track daily usage (in production, this would be stored in database)
export interface DailyUsage {
  userId: string;
  date: string; // YYYY-MM-DD
  gmailScans: number;
  lastScanAt?: Date;
}

export class UsageTracker {
  // In production, these would be database operations
  static async getDailyUsage(userId: string): Promise<DailyUsage> {
    const today = new Date().toISOString().split('T')[0];
    // This is a mock - in production, fetch from database
    return {
      userId,
      date: today,
      gmailScans: 0
    };
  }

  static async incrementGmailScan(userId: string): Promise<DailyUsage> {
    const usage = await this.getDailyUsage(userId);
    usage.gmailScans += 1;
    usage.lastScanAt = new Date();
    // In production, save to database
    return usage;
  }

  static async resetDailyUsage(userId: string): Promise<void> {
    // In production, reset or create new daily usage record
    console.log(`Resetting daily usage for user ${userId}`);
  }
}
