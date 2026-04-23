'use client';

import { useEffect, useCallback } from 'react';
import { usePortfolioStore, useMarketStore } from '@/lib/store';
import { fetchWithSession } from '@/lib/fetchWithSession';

export function usePortfolio() {
  const { portfolio, loading, error, setPortfolio, updatePortfolio, setLoading, setError } =
    usePortfolioStore();
  const assets = useMarketStore((s) => s.assets);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithSession('/api/portfolio');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }

      setPortfolio(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setPortfolio, setError, setLoading]);

  useEffect(() => {
    fetchPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate totalValue whenever live prices change
  useEffect(() => {
    if (!portfolio || assets.length === 0) return;

    const totalHoldingsValue = portfolio.assets.reduce((sum, holding) => {
      const marketAsset = assets.find((a) => a.symbol === holding.symbol);
      const currentPrice = marketAsset?.currentPrice ?? holding.currentPrice ?? holding.averagePrice;
      return sum + holding.quantity * currentPrice;
    }, 0);

    const newTotalValue = totalHoldingsValue + portfolio.cash;

    if (Math.abs(newTotalValue - portfolio.totalValue) > 0.001) {
      updatePortfolio({
        totalValue: newTotalValue,
        assets: portfolio.assets.map((holding) => {
          const marketAsset = assets.find((a) => a.symbol === holding.symbol);
          return {
            ...holding,
            currentPrice: marketAsset?.currentPrice ?? holding.currentPrice ?? holding.averagePrice,
          };
        }),
      });
    }
  }, [assets, portfolio, updatePortfolio]);

  const executeTrade = useCallback(
    async (symbol: string, type: 'BUY' | 'SELL', quantity: number) => {
      const asset = assets.find((a) => a.symbol === symbol);
      if (!asset) throw new Error('Asset not found');

      const response = await fetchWithSession('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, type, quantity, price: asset.currentPrice }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Trade failed');
      }

      setPortfolio(data.portfolio);
      return data;
    },
    [assets, setPortfolio]
  );

  return { portfolio, loading, error, executeTrade, refetch: fetchPortfolio };
}
