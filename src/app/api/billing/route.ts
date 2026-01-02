import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '@/lib/auth-client';
import { db } from '@/db';
import { userCredits, paymentHistory, creditTransactions } from '@/db/schema/stripe';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // 获取用户信息
    const { data: session } = await authClient.getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取用户积分信息
    const creditsData = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    const credits = creditsData.length > 0 ? creditsData[0] : null;

    // 获取支付历史
    const payments = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, userId))
      .orderBy(desc(paymentHistory.createdAt));

    // 获取积分交易记录
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));

    return NextResponse.json({
      credits,
      payments,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}
