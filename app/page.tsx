'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAssets } from '@/hooks/useAssets';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useMarketStore, useUIStore, usePortfolioStore } from '@/lib/store';
import { AssetCard } from '@/components/AssetCard';
import { AssetChart } from '@/components/AssetChart';
import { TradeModal } from '@/components/TradeModal';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { RefreshCw } from 'lucide-react';

const VIRTUALIZE_THRESHOLD = 20;
const ASSET_ROW_HEIGHT = 120;

export default function Home() {
  const { loading: assetsLoading, error: assetsError, refetch } = useAssets();
  const { executeTrade } = usePortfolio();

  const assets    = useMarketStore((s) => s.assets);
  const portfolio = usePortfolioStore((s) => s.portfolio);

  const {
    selectedSymbol, showBuyModal, showSellModal, selectedAssetForTrade,
    setSelectedSymbol, setShowBuyModal, setShowSellModal, setSelectedAssetForTrade,
  } = useUIStore();

  const selectedAsset   = assets.find((a) => a.symbol === selectedSymbol) ?? null;
  const portfolioAssets = portfolio?.assets ?? [];

  const handleAssetSelect = useCallback((asset: typeof assets[0]) => {
    setSelectedSymbol(asset.symbol);
    setSelectedAssetForTrade(asset);
  }, [setSelectedSymbol, setSelectedAssetForTrade]);

  const handleBuyClick  = useCallback(() => setShowBuyModal(true),  [setShowBuyModal]);
  const handleSellClick = useCallback(() => setShowSellModal(true), [setShowSellModal]);

  const handleTrade = useCallback(async (quantity: number) => {
    if (!selectedAssetForTrade) return;
    const type = showBuyModal ? 'BUY' : 'SELL';
    await executeTrade(selectedAssetForTrade.symbol, type, quantity);
  }, [selectedAssetForTrade, showBuyModal, executeTrade]);

  const assetListRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = assets.length > VIRTUALIZE_THRESHOLD;

  const assetVirtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => assetListRef.current,
    estimateSize: () => ASSET_ROW_HEIGHT,
    overscan: 3,
    enabled: shouldVirtualize,
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-1)' }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Asset List ── */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-white)' }}>
              Market Assets
            </h2>

            {assetsLoading && (
              <div className="flex justify-center py-8">
                <div
                  className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                />
              </div>
            )}

            {assetsError && !assetsLoading && (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm" style={{ color: '#f87171' }}>{assetsError}</p>
                <button
                  onClick={refetch}
                  className="flex items-center gap-2 text-sm mx-auto transition-colors"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            )}

            {!assetsLoading && !assetsError && (
              shouldVirtualize ? (
                <div ref={assetListRef} className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                  <div style={{ height: `${assetVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {assetVirtualizer.getVirtualItems().map((vRow) => {
                      const asset = assets[vRow.index];
                      return (
                        <div
                          key={asset.symbol}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%',
                            height: `${vRow.size}px`,
                            transform: `translateY(${vRow.start}px)`,
                            paddingBottom: '12px',
                          }}
                        >
                          <AssetCard
                            asset={asset}
                            onSelect={handleAssetSelect}
                            inPortfolio={portfolioAssets.some((pa) => pa.symbol === asset.symbol)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {assets.map((asset) => (
                    <AssetCard
                      key={asset.symbol}
                      asset={asset}
                      onSelect={handleAssetSelect}
                      inPortfolio={portfolioAssets.some((pa) => pa.symbol === asset.symbol)}
                    />
                  ))}
                </div>
              )
            )}
          </div>

          {/* ── Chart + Trade ── */}
          <div className="lg:col-span-2 space-y-6">
            <AssetChart asset={selectedAsset} />

            {selectedAsset && (
              <div
                className="rounded-xl p-6"
                style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}
              >
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-white)' }}>
                  Trading — {selectedAsset.symbol}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleBuyClick}
                    className="px-6 py-3 font-semibold rounded-lg transition-colors"
                    style={{ background: '#16a34a', color: 'var(--color-white)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#15803d')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#16a34a')}
                  >
                    Buy {selectedAsset.symbol}
                  </button>
                  <button
                    onClick={handleSellClick}
                    className="px-6 py-3 font-semibold rounded-lg transition-colors"
                    style={{ background: '#dc2626', color: 'var(--color-white)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#b91c1c')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#dc2626')}
                  >
                    Sell {selectedAsset.symbol}
                  </button>
                </div>

                <div
                  className="grid grid-cols-2 gap-4 mt-6 pt-6"
                  style={{ borderTop: '1px solid var(--color-bg-4)' }}
                >
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-light)' }}>24h Volume</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-white)' }}>
                      ${(selectedAsset.volume24h / 1_000_000_000).toFixed(2)}B
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-light)' }}>24h Range</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-white)' }}>
                      ${selectedAsset.lowPrice.toFixed(2)} – ${selectedAsset.highPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Watchlist ── */}
          <div className="lg:col-span-1">
            <WatchlistPanel onSelectAsset={(symbol) => {
              const asset = assets.find((a) => a.symbol === symbol);
              if (asset) handleAssetSelect(asset);
            }} />
          </div>
        </div>
      </main>

      {selectedAssetForTrade && (
        <>
          <TradeModal
            isOpen={showBuyModal} asset={selectedAssetForTrade} type="BUY"
            portfolio={portfolio} onClose={() => setShowBuyModal(false)} onSubmit={handleTrade}
          />
          <TradeModal
            isOpen={showSellModal} asset={selectedAssetForTrade} type="SELL"
            portfolio={portfolio} onClose={() => setShowSellModal(false)} onSubmit={handleTrade}
          />
        </>
      )}
    </div>
  );
}
