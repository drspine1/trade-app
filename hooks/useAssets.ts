'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useMarketStore, Asset } from '@/lib/store';
import { realtimeEngine } from '@/lib/realtime';

export function useAssets() {
  const { assets, loading, error, setAssets, updateAsset, setLoading, setError } =
    useMarketStore();

  const connectedRef = useRef(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Try to seed real prices from Finnhub REST quotes
      // This runs silently — if it fails (no API key) we just use DB prices
      try {
        await fetch('/api/quotes');
      } catch {
        // Non-fatal — DB may already have prices from a previous run
      }

      // Step 2: Fetch the asset list from our DB (now with real prices if available)
      const response = await fetch('/api/assets');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }

      const assetList: Asset[] = Array.isArray(data) ? data : [];
      setAssets(assetList);

      if (assetList.length === 0) return;

      // Step 3: Register each asset for price updates
      assetList.forEach((asset) => {
        realtimeEngine.startPriceUpdate(
          asset.symbol,
          asset.currentPrice,
          (newPrice, change24h, changePercent24h) => {
            updateAsset(asset.symbol, { currentPrice: newPrice, change24h, changePercent24h });
          },
          2000,
          500
        );
      });

      // Step 4: Connect SSE stream (single connection for all symbols)
      // Falls back to simulation automatically if Finnhub key not configured
      if (!connectedRef.current) {
        connectedRef.current = true;
        realtimeEngine.connect(assetList.map((a) => a.symbol));
      }
    } catch (err) {
      setError((err as Error).message);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [setAssets, setError, setLoading, updateAsset]);

  useEffect(() => {
    fetchAssets();
    return () => {
      realtimeEngine.stopAll();
      connectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { assets, loading, error, refetch: fetchAssets };
}
