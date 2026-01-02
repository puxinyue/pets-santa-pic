import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authClient } from '@/lib/auth-client';
import { db } from '@/db';
import { paymentHistory } from '@/db/schema/stripe';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(req: NextRequest) {
  try {
    // 获取用户信息
    const { data: session } = await authClient.getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 创建 Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      customer_email: session.user.email || undefined,
      metadata: {
        userId,
        credits: '200',
      },
    });

    // 在数据库中创建支付记录
    await db.insert(paymentHistory).values({
      id: randomUUID(),
      userId,
      stripePaymentIntentId: checkoutSession.payment_intent as string,
      stripeSessionId: checkoutSession.id,
      amount: 1000, // $10.00 in cents
      currency: 'usd',
      status: 'pending',
      credits: 200,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
