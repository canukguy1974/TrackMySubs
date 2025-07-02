import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/services/twilio';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber }: { phoneNumber: string } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Mock subscription data (simulating what would be extracted from Gmail)
    const mockSubscriptions = [
      {
        serviceName: 'Netflix',
        amount: '15.99',
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: '2025-01-15',
        confidence: 0.95,
        source: 'gmail'
      },
      {
        serviceName: 'Spotify Premium',
        amount: '9.99',
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: '2025-01-20',
        confidence: 0.92,
        source: 'gmail'
      },
      {
        serviceName: 'Adobe Creative Cloud',
        amount: '52.99',
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: '2025-01-25',
        confidence: 0.88,
        source: 'gmail'
      }
    ];

    console.log(`Mock Gmail scan found ${mockSubscriptions.length} subscriptions`);

    // Create SMS message
    const messageBody = mockSubscriptions
      .map(sub => `${sub.serviceName} - $${sub.amount} ${sub.billingCycle}`)
      .join('\n');

    // Send SMS notification
    const smsResult = await sendSms(
      phoneNumber, 
      `🔔 TrackMySubs (MOCK TEST): Found ${mockSubscriptions.length} subscription(s):\n${messageBody}\n\nThis is a test with mock data.`
    );

    console.log('SMS result:', smsResult);

    return NextResponse.json({ 
      success: true, 
      subscriptions: mockSubscriptions, 
      count: mockSubscriptions.length,
      smsResult,
      note: 'This is a mock test with simulated Gmail data'
    });
  } catch (error) {
    console.error('Mock Gmail test error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
