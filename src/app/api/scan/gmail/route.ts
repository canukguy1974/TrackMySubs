import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, accessToken, refreshToken } = await req.json();

    if (!email || !accessToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Mock subscription data for now
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
        name: 'Adobe Creative Cloud',
        price: '$52.99',
        cycle: 'monthly',
        nextBilling: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        service: 'adobe'
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Return random subset of subscriptions
    const foundCount = Math.floor(Math.random() * 3) + 1;
    const subscriptions = mockSubscriptions.slice(0, foundCount);

    console.log(`Gmail scan for ${email}: Found ${subscriptions.length} subscriptions`);

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
      message: `Found ${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''} in ${email}`
    });

  } catch (error) {
    console.error('Gmail scan error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to scan Gmail account' 
    }, { status: 500 });
  }
}
