import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from "@/lib/auth/get-session";
import { db } from '@/db';
import { paymentHistory } from '@/db/schema/stripe';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(req: NextRequest) {
  try {
    console.log('📦 Checkout request received');
    
    // 获取用户信息
    const session = await getServerSession()
    console.log('🔐 Session data:', session);
    
    if (!session?.user?.id) {
      console.log('❌ Unauthorized: No user ID in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('✅ User ID:', userId);
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL;
    
    // 创建 Stripe checkout session（使用一次性支付）
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment', // 一次性支付模式
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Holiday Pack - 200 Credits',
              description: '200 Holiday Credits for AI Christmas Pet Portraits',
            },
            unit_amount: 1000, // $10.00 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      customer_email: session?.user?.email || undefined,
      metadata: {
        userId: userId || 'anonymous',
        credits: '200',
      },
    });

    // 在数据库中创建支付记录（如果有用户ID）
    if (userId) {
      await db.insert(paymentHistory).values({
        id: randomUUID(),
        userId,
        stripePaymentIntentId: checkoutSession.payment_intent as string | null, // 可能为 null，在支付完成时通过 webhook 更新
        stripeSessionId: checkoutSession.id,
        amount: 1000, // $10.00 in cents
        currency: 'usd',
        status: 'pending',
        credits: 200,
      });
    }

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
