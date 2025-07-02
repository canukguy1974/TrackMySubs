'use server';

// Mock AI implementation for testing purposes
// This simulates the AI responses while the real API is being set up

import type { DetectSubscriptionFromEmailInput, DetectSubscriptionFromEmailOutput } from './flows/detect-subscription-from-email';
import type { CategorizeSubscriptionInput, CategorizeSubscriptionOutput } from './flows/categorize-subscription';

export async function mockDetectSubscriptionFromEmail(input: DetectSubscriptionFromEmailInput): Promise<DetectSubscriptionFromEmailOutput> {
  const { emailContent } = input;
  
  // Simple keyword-based detection for testing
  const content = emailContent.toLowerCase();
  
  // Check for subscription-related keywords
  const subscriptionKeywords = ['subscription', 'billing', 'renewed', 'trial', 'payment', 'charge'];
  const isSubscriptionRelated = subscriptionKeywords.some(keyword => content.includes(keyword));
  
  if (!isSubscriptionRelated) {
    return {
      isSubscriptionRelated: false,
    };
  }
  
  // Extract service name (simple pattern matching)
  let serviceName: string | undefined;
  const servicePatterns = [
    /netflix/i,
    /spotify/i,
    /disney\+?/i,
    /amazon prime/i,
    /youtube premium/i,
    /adobe/i,
    /microsoft/i,
    /apple/i,
    /google/i
  ];
  
  for (const pattern of servicePatterns) {
    if (pattern.test(content)) {
      serviceName = content.match(pattern)?.[0];
      break;
    }
  }
  
  // Extract billing date (simple pattern)
  const dateMatch = content.match(/(?:next billing|billing date|renewal date).*?(\w+ \d{1,2},? \d{4})/i);
  const billingDate = dateMatch?.[1];
  
  // Extract payment method
  let paymentMethod: string | undefined;
  if (content.includes('visa')) paymentMethod = 'Visa';
  else if (content.includes('mastercard')) paymentMethod = 'Mastercard';
  else if (content.includes('paypal')) paymentMethod = 'PayPal';
  else if (content.includes('card')) paymentMethod = 'Card';
  
  return {
    isSubscriptionRelated: true,
    serviceName: serviceName || 'Unknown Service',
    billingDate,
    paymentMethod,
    isMarketingEmail: false,
    isReceipt: content.includes('receipt') || content.includes('invoice'),
    isTermsChange: content.includes('terms') && content.includes('change'),
  };
}

export async function mockCategorizeSubscription(input: CategorizeSubscriptionInput): Promise<CategorizeSubscriptionOutput> {
  const { subscriptionName } = input;
  const name = subscriptionName.toLowerCase();
  
  // Simple categorization based on service name
  let category: CategorizeSubscriptionOutput['category'] = 'Other';
  let confidence = 0.8;
  
  if (name.includes('netflix') || name.includes('disney') || name.includes('hulu')) {
    category = 'Entertainment';
    confidence = 0.95;
  } else if (name.includes('spotify') || name.includes('apple music') || name.includes('youtube music')) {
    category = 'Music';
    confidence = 0.95;
  } else if (name.includes('amazon') || name.includes('ebay') || name.includes('shopify')) {
    category = 'Shopping';
    confidence = 0.9;
  } else if (name.includes('news') || name.includes('times') || name.includes('post')) {
    category = 'News';
    confidence = 0.85;
  }
  
  return {
    category,
    confidence,
  };
}
