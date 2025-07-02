import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { planName, userId } = await request.json();

    // Define your pricing based on plan
    const priceData = {
      'Premium': {
        unit_amount: 500, // $5.00 in cents
        currency: 'usd' as const,
        product_data: {
          name: 'SubScribe Premium',
          description: 'Unlimited AI email scans, advanced reminders, and premium features',
        },
        recurring: {
          interval: 'month' as const,
        },
      },
    };

    if (!priceData[planName as keyof typeof priceData]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: priceData[planName as keyof typeof priceData],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?canceled=true`,
      metadata: {
        userId,
        planName,
      },
      customer_email: undefined, // You can pass user email here if needed
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}
