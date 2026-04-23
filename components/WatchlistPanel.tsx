'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMarketStore } from '@/lib/store';
import { Search, Plus, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { fetchWithSession } from '@/lib/fetchWithSession';

interface WatchlistPanelProps {
  onSelectAsset?: (symbol: string) => void;
}

export function WatchlistPanel({ onSelectAsset }: WatchlistPanelProps) {
  const assets = useMarketStore((s) => s.assets);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/watchlist');
      if (!res.ok) throw new Error('Failed to load watchlist');
      const data = await res.json();
      setWatchlistSymbols(data.symbols ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const addToWatchlist = useCallback(async (symbol: string) => {
    try {
      const res = await fetchWithSession('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) throw new Error('Failed to add');
      const data = await res.json();
      setWatchlistSymbols(data.symbols ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    try {
      const res = await fetchWithSession(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      const data = await res.json();
      setWatchlistSymbols(data.symbols ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const filteredAssets = assets.filter((a) => {
    if (!debouncedQuery) return true;
    const q = debouncedQuery.toLowerCase();
    return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  const watchedAssets   = filteredAssets.filter((a) =>  watchlistSymbols.includes(a.symbol));
  const unwatchedAssets = filteredAssets.filter((a) => !watchlistSymbols.includes(a.symbol));

  return (
    <div
      className="rounded-xl flex flex-col h-full"
      style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-bg-4)' }}
    >
      {/* Header + search */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--color-bg-4)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--color-white)' }}>Watchlist</h2>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-light)' }}
          />
          <input
            type="text"
            placeholder="Search assets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--color-bg-4)',
              border: '1px solid var(--color-bg-4)',
              color: 'var(--color-white)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--color-bg-4)')}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-sm gap-2" style={{ color: 'var(--color-light)' }}>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            Loading…
          </div>
        )}

        {error && (
          <div className="p-3 text-center space-y-2">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            <button
              onClick={fetchWatchlist}
              className="flex items-center gap-1 text-sm mx-auto transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Watched */}
            {watchedAssets.map((asset) => {
              const isPositive = asset.changePercent24h >= 0;
              return (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between p-2 rounded-lg group transition-colors"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Link
                    href={`/asset/${asset.symbol}`}
                    onClick={() => onSelectAsset?.(asset.symbol)}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-white)' }}>{asset.symbol}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-light)' }}>{asset.name}</p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="text-sm" style={{ color: 'var(--color-white)' }}>
                          ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs" style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
                          {isPositive ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => removeFromWatchlist(asset.symbol)}
                    className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                    style={{ color: 'var(--color-light)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f87171')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-light)')}
                    aria-label={`Remove ${asset.symbol}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Add section */}
            {unwatchedAssets.length > 0 && (
              <>
                {watchedAssets.length > 0 && (
                  <p className="text-xs px-2 py-1" style={{ color: 'var(--color-bg-4)', filter: 'brightness(2)' }}>
                    Add to watchlist
                  </p>
                )}
                {unwatchedAssets.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center justify-between p-2 rounded-lg transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-light)' }}>{asset.symbol}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-bg-4)', filter: 'brightness(2)' }}>{asset.name}</p>
                    </div>
                    <button
                      onClick={() => addToWatchlist(asset.symbol)}
                      className="p-1 transition-colors"
                      style={{ color: 'var(--color-light)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4ade80')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-light)')}
                      aria-label={`Add ${asset.symbol}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}

            {filteredAssets.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--color-light)' }}>
                No assets match &quot;{debouncedQuery}&quot;
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
