'use client';

import { use, useState, useCallback } from 'react';
import { useMarketStore, useUIStore, usePortfolioStore } from '@/lib/store';
import { AssetChart } from '@/components/AssetChart';
import { TradeModal } from '@/components/TradeModal';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchWithSession } from '@/lib/fetchWithSession';

interface AssetPageProps {
  params: Promise<{ symbol: string }>;
}

export default function AssetPage({ params }: AssetPageProps) {
  const { symbol } = use(params);
  const assets    = useMarketStore((s) => s.assets);
  const asset     = assets.find((a) => a.symbol === symbol.toUpperCase()) ?? null;
  const portfolio = usePortfolioStore((s) => s.portfolio);

  const { showBuyModal, showSellModal, setShowBuyModal, setShowSellModal } = useUIStore();
  const [, setTradeError] = useState<string | null>(null);

  const handleBuy  = useCallback(() => { setTradeError(null); setShowBuyModal(true);  }, [setShowBuyModal]);
  const handleSell = useCallback(() => { setTradeError(null); setShowSellModal(true); }, [setShowSellModal]);

  const handleTrade = useCallback(async (quantity: number) => {
    if (!asset) return;
    const type = showBuyModal ? 'BUY' : 'SELL';
    setTradeError(null);
    const res = await fetchWithSession('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: asset.symbol, type, quantity, price: asset.currentPrice }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Trade failed');
    }
  }, [asset, showBuyModal]);

  if (!asset) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--color-bg-1)' }}>
        <div className="text-center space-y-4">
          <p className="text-lg" style={{ color: 'var(--color-light)' }}>
            Asset &quot;{symbol}&quot; not found.
          </p>
          <Link href="/" className="flex items-center gap-2 justify-center transition-colors"
            style={{ color: 'var(--color-primary)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Market
          </Link>
        </div>
      </main>
    );
  }

  const isPositive = asset.changePercent24h >= 0;

  return (
    <main className="min-h-screen p-6" style={{ background: 'var(--color-bg-1)' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/" style={{ color: 'var(--color-light)' }}
            className="transition-colors hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-white)' }}>{asset.symbol}</h1>
              <span style={{ color: 'var(--color-light)' }}>{asset.name}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--color-white)' }}>
                ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="flex items-center gap-1 text-sm font-medium"
                style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleBuy}
              className="px-6 py-2 font-semibold rounded-lg transition-colors"
              style={{ background: '#16a34a', color: 'var(--color-white)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#15803d')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#16a34a')}
            >Buy</button>
            <button onClick={handleSell}
              className="px-6 py-2 font-semibold rounded-lg transition-colors"
              style={{ background: '#dc2626', color: 'var(--color-white)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#b91c1c')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#dc2626')}
            >Sell</button>
          </div>
        </div>

        <AssetChart asset={asset} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '24h High',   value: `$${asset.highPrice.toLocaleString()}` },
            { label: '24h Low',    value: `$${asset.lowPrice.toLocaleString()}` },
            { label: '24h Change', value: `${isPositive ? '+' : ''}$${asset.change24h.toFixed(2)}` },
            { label: '24h Volume', value: `$${(asset.volume24h / 1e9).toFixed(2)}B` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-light)' }}>{label}</p>
              <p className="font-semibold" style={{ color: 'var(--color-white)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {(showBuyModal || showSellModal) && (
        <TradeModal
          isOpen={showBuyModal || showSellModal}
          asset={asset}
          type={showBuyModal ? 'BUY' : 'SELL'}
          portfolio={portfolio}
          onClose={() => { setShowBuyModal(false); setShowSellModal(false); }}
          onSubmit={handleTrade}
        />
      )}
    </main>
  );
}
