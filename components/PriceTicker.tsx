'use client';

import React from 'react';
import { useMarketStore } from '@/lib/store';

export const PriceTicker = React.memo(function PriceTicker() {
  const assets = useMarketStore((s) => s.assets);
  if (assets.length === 0) return null;

  const items = [...assets, ...assets]; // duplicate for seamless loop

  return (
    <div
      className="overflow-hidden border-b"
      style={{ background: 'var(--color-bg-2)', borderColor: 'var(--color-bg-4)' }}
    >
      <div
        className="flex gap-8 py-2 px-4 whitespace-nowrap"
        style={{ animation: 'ticker-scroll 40s linear infinite' }}
      >
        {items.map((asset, i) => {
          const isPositive = asset.changePercent24h >= 0;
          return (
            <span key={`${asset.symbol}-${i}`} className="inline-flex items-center gap-2 text-sm">
              <span className="font-semibold" style={{ color: 'var(--color-white)' }}>
                {asset.symbol}
              </span>
              <span style={{ color: 'var(--color-light)' }}>
                ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
                {isPositive ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
});
