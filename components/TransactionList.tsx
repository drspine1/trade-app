'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Transaction } from '@/lib/store';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
}

const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 52;

export const TransactionList = React.memo(function TransactionList({ transactions }: TransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    enabled: transactions.length > VIRTUALIZE_THRESHOLD,
  });

  if (transactions.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}
      >
        <p className="text-lg" style={{ color: 'var(--color-light)' }}>No transactions yet</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-bg-4)', filter: 'brightness(2)' }}>
          Your trade history will appear here
        </p>
      </div>
    );
  }

  const shouldVirtualize = transactions.length > VIRTUALIZE_THRESHOLD;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}
    >
      {/* Header row */}
      <div
        className="grid grid-cols-6 gap-4 px-4 py-3 text-[9px] md:text-xs font-medium uppercase tracking-wider"
        style={{ borderBottom: '1px solid var(--color-bg-4)', color: 'var(--color-light)' }}
      >
        <span>Asset</span>
        <span>Type</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Price</span>
        <span className="text-right">Total</span>
        <span className="text-right">Date</span>
      </div>

      {shouldVirtualize ? (
        <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '600px' }}>
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={transactions[virtualRow.index]._id}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TxRow tx={transactions[virtualRow.index]} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {transactions.map((tx) => <TxRow key={tx._id} tx={tx} />)}
        </div>
      )}
    </div>
  );
});

function TxRow({ tx }: { tx: Transaction }) {
  const isBuy = tx.type === 'BUY';
  return (
    <div
      className="grid grid-cols-6 gap-4 px-4 py-3 text-[9px] md:text-sm transition-colors"
      style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-bg-4) 60%, transparent)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-4)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="font-semibold" style={{ color: 'var(--color-white)' }}>{tx.symbol}</span>
      <span>
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
          style={{
            background: isBuy ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            color: isBuy ? '#4ade80' : '#f87171',
          }}
        >
          {tx.type}
        </span>
      </span>
      <span className="text-right" style={{ color: 'var(--color-light)' }}>{tx.quantity.toLocaleString()}</span>
      <span className="text-right" style={{ color: 'var(--color-light)' }}>
        ${tx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="text-right font-medium" style={{ color: 'var(--color-white)' }}>
        ${tx.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="text-right text-xs" style={{ color: 'var(--color-light)' }}>
        {format(new Date(tx.timestamp), 'MMM d, HH:mm')}
      </span>
    </div>
  );
}
