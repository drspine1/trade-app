'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Asset } from '@/lib/store';

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  inPortfolio?: boolean;
}

export const AssetCard = React.memo(function AssetCard({ asset, onSelect, inPortfolio }: AssetCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const prevPriceRef = useRef<number>(asset.currentPrice);

  useEffect(() => {
    if (!cardRef.current) return;
    const prev = prevPriceRef.current;
    const curr = asset.currentPrice;
    if (curr === prev) return;
    prevPriceRef.current = curr;

    const color = curr > prev ? '#4ade8033' : '#f8717133';
    gsap.fromTo(
      cardRef.current,
      { backgroundColor: color },
      { backgroundColor: 'transparent', duration: 0.5, ease: 'power2.out' }
    );
  }, [asset.currentPrice]);

  const isPositive = asset.changePercent24h >= 0;

  return (
    <button
      ref={cardRef}
      onClick={() => onSelect(asset)}
      className="w-full p-4 rounded-xl text-left transition-colors"
      style={{
        background: 'var(--color-bg-3)',
        border: '1px solid var(--color-bg-4)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-bg-4)';
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--color-white)' }}>
            {asset.symbol}
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-light)' }}>{asset.name}</p>
        </div>
        {inPortfolio && (
          <span
            className="px-2 py-1 text-xs rounded"
            style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary-vibrant)' }}
          >
            Owned
          </span>
        )}
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="font-bold text-lg" style={{ color: 'var(--color-white)' }}>
            ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
            {isPositive ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
          </p>
        </div>
        <div
          className="px-3 py-1 rounded text-sm font-medium"
          style={{
            background: isPositive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            color: isPositive ? '#4ade80' : '#f87171',
          }}
        >
          {isPositive ? '↗' : '↘'} ${Math.abs(asset.change24h).toFixed(2)}
        </div>
      </div>

      {asset.highPrice && asset.lowPrice && (
        <div
          className="mt-3 pt-3 text-xs space-y-1"
          style={{ borderTop: '1px solid var(--color-bg-4)', color: 'var(--color-light)' }}
        >
          <div className="flex justify-between">
            <span>24h High: ${asset.highPrice.toFixed(2)}</span>
            <span>Low: ${asset.lowPrice.toFixed(2)}</span>
          </div>
        </div>
      )}
    </button>
  );
});
