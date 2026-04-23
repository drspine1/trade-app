'use client';

import React from 'react';
import { Portfolio } from '@/lib/store';

interface PortfolioCardProps {
  portfolio: Portfolio | null;
}

const INITIAL_CASH = 100_000;

export const PortfolioCard = React.memo(function PortfolioCard({ portfolio }: PortfolioCardProps) {
  if (!portfolio) return null;

  const holdingsValue = portfolio.assets.reduce((sum, asset) => {
    const currentPrice = asset.currentPrice ?? asset.averagePrice;
    return sum + asset.quantity * currentPrice;
  }, 0);

  const totalValue = holdingsValue + portfolio.cash;
  const gainLoss = totalValue - INITIAL_CASH;
  const gainLossPercent = (gainLoss / INITIAL_CASH) * 100;
  const isPositive = gainLoss >= 0;

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}
    >
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-white)' }}>
        Portfolio Overview
      </h2>

      <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mb-6">
        {/* Total Value */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-bg-4)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--color-light)' }}>Total Value</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-white)' }}>
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm mt-2 font-semibold" style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
            {isPositive ? '+' : ''}${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
          </p>
        </div>

        {/* Cash Balance */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-bg-4)', border: '1px solid var(--color-bg-4)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--color-light)' }}>Cash Balance</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Holdings */}
      <div
        className="rounded-lg p-4"
        style={{ background: 'var(--color-bg-4)', border: '1px solid var(--color-bg-4)' }}
      >
        <p className="text-sm mb-3" style={{ color: 'var(--color-light)' }}>Holdings Value</p>
        <p className="text-2xl font-bold mb-4" style={{ color: 'var(--color-white)' }}>
          ${holdingsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        {portfolio.assets.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {portfolio.assets.map((asset) => {
              const currentPrice = asset.currentPrice ?? asset.averagePrice;
              const value = asset.quantity * currentPrice;
              const unrealizedGain = value - asset.totalCost;
              const gainPercent = asset.totalCost > 0 ? (unrealizedGain / asset.totalCost) * 100 : 0;
              const isAssetPositive = unrealizedGain >= 0;

              return (
                <div
                  key={asset.symbol}
                  className="flex justify-between items-center py-2"
                  style={{ borderBottom: '1px solid var(--color-bg-3)' }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-white)' }}>{asset.symbol}</p>
                    <p className="text-xs" style={{ color: 'var(--color-light)' }}>
                      {asset.quantity.toFixed(4)} @ ${asset.averagePrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--color-white)' }}>
                      ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs font-semibold" style={{ color: isAssetPositive ? '#4ade80' : '#f87171' }}>
                      {isAssetPositive ? '+' : ''}${unrealizedGain.toFixed(2)} ({gainPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-light)' }}>No holdings yet. Start trading!</p>
        )}
      </div>
    </div>
  );
});
