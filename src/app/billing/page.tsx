'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter, useSearchParams } from 'next/navigation';

interface BillingData {
  credits: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    credits: number;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    createdAt: string;
  }>;
}

function BillingContent() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
      router.push('/');
      return;
    }

    fetchBillingData();
  }, [session, router]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/billing');
      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }
      const data = await response.json();
      setBillingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-bounce text-4xl">🐾</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-red-600 dark:text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  const { credits, payments, transactions } = billingData!;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4 festive-font">
            Billing & Credits
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Manage your credits and view payment history
          </p>
        </div>

        {/* 积分概览 */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800 mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Credit Balance</h2>
          {credits ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Current Balance</div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white">{credits.balance}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Purchased</div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white">{credits.totalPurchased}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Used</div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white">{credits.totalUsed}</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
              <div className="text-slate-500 dark:text-slate-400 mb-4">No credits yet</div>
              <button
                onClick={() => router.push('/pricing')}
                className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all"
              >
                Buy Credits
              </button>
            </div>
          )}
        </div>

        {/* 支付历史 */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800 mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Payment History</h2>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      ${(payment.amount / 100).toFixed(2)} USD
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {payment.credits} credits purchased
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(payment.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${
                      payment.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {payment.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400">No payments yet</div>
          )}
        </div>

        {/* 积分交易记录 */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Transaction History</h2>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {transaction.type === 'purchase' ? 'Credit Purchase' : 'Credit Usage'}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      transaction.amount > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400">No transactions yet</div>
          )}
        </div>

        <Suspense fallback={null}>
          <SuccessNotification />
        </Suspense>
      </div>
    </div>
  );
}

function SuccessNotification() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  if (!success) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-xl">
      Payment successful! Credits have been added to your account.
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-bounce text-4xl">🐾</div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
