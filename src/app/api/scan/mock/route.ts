import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Mock subscription data
    const mockSubscriptions = [
      {
        name: 'Netflix',
        price: '$15.99',
        cycle: 'monthly',
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        service: 'netflix'
      },
      {
        name: 'Spotify Premium',
        price: '$9.99',
        cycle: 'monthly',
        nextBilling: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        service: 'spotify'
      },
      {
        name: 'Disney+',
        price: '$7.99',
        cycle: 'monthly',
        nextBilling: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        service: 'disney'
      },
      {
        name: 'YouTube Premium',
        price: '$11.99',
        cycle: 'monthly',
        nextBilling: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        service: 'youtube'
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return random subset of subscriptions
    const foundCount = Math.floor(Math.random() * 4) + 1;
    const subscriptions = mockSubscriptions.slice(0, foundCount);

    console.log(`Mock Gmail scan for ${email}: Found ${subscriptions.length} subscriptions`);

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
      message: `Mock scan found ${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''} in ${email}`
    });

  } catch (error) {
    console.error('Mock Gmail scan error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to perform mock scan' 
    }, { status: 500 });
  }
}
