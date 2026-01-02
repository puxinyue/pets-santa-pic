import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { paymentHistory, userCredits, creditTransactions } from '@/db/schema/stripe';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    // 确保请求不被认证中间件拦截
    // 立即返回响应以避免重定向
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
   console.log('event', event);
    // 处理不同类型的事件
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentIntentId = session.payment_intent as string;
        const sessionId = session.id;
        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits || '0');

        if (!userId || !credits) {
          console.error('Missing userId or credits in metadata');
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // 通过 session ID 查找支付记录并更新（包括 payment_intent_id）
        await db
          .update(paymentHistory)
          .set({ 
            status: 'completed',
            stripePaymentIntentId: paymentIntentId, // 更新 payment_intent_id
          })
          .where(eq(paymentHistory.stripeSessionId, sessionId));

        // 获取或创建用户积分记录
        const existingCredits = await db
          .select()
          .from(userCredits)
          .where(eq(userCredits.userId, userId))
          .limit(1);

        if (existingCredits.length === 0) {
          // 创建新的用户积分记录
          await db.insert(userCredits).values({
            id: randomUUID(),
            userId,
            balance: credits,
            totalPurchased: credits,
            totalUsed: 0,
          });

          // 创建积分交易记录
          await db.insert(creditTransactions).values({
            id: randomUUID(),
            userId,
            type: 'purchase',
            amount: credits,
            description: `Purchased ${credits} credits`,
          });
        } else {
          // 更新现有用户积分记录
          const currentCredits = existingCredits[0];
          await db
            .update(userCredits)
            .set({
              balance: currentCredits.balance + credits,
              totalPurchased: currentCredits.totalPurchased + credits,
            })
            .where(eq(userCredits.userId, userId));

          // 创建积分交易记录
          const paymentRecord = await db
            .select()
            .from(paymentHistory)
            .where(eq(paymentHistory.stripeSessionId, sessionId))
            .limit(1);
          
          await db.insert(creditTransactions).values({
            id: randomUUID(),
            userId,
            paymentId: paymentRecord[0]?.id,
            type: 'purchase',
            amount: credits,
            description: `Purchased ${credits} credits`,
          });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = paymentIntent.id;

        // 更新支付状态为失败（通过 payment_intent_id 查找，此时应该已经存在）
        await db
          .update(paymentHistory)
          .set({ status: 'failed' })
          .where(eq(paymentHistory.stripePaymentIntentId, paymentIntentId));

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
