'use client';

import { useTransactions } from '@/hooks/useTransactions';
import { TransactionList } from '@/components/TransactionList';

export default function HistoryPage() {
  const { transactions, loading, error } = useTransactions();

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--color-bg-1)' }}>
        <div className="flex items-center gap-3" style={{ color: 'var(--color-light)' }}>
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <span>Loading transaction history…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--color-bg-1)' }}>
        <p className="text-lg" style={{ color: '#f87171' }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-2 md:px-6 p-6" style={{ background: 'var(--color-bg-1)' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-white)' }}>
          Transaction History
        </h1>
        <TransactionList transactions={transactions} />
      </div>
    </main>
  );
}
