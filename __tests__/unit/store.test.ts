/**
 * Property-based tests for Zustand store logic.
 *
 * Properties covered:
 *   Property 7: Portfolio totalValue invariant
 *   Property 8: Watchlist deduplication
 *   Property 9: Watchlist round-trip
 *   Property 14: MarketStore update isolation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Helpers (pure functions mirroring store reducers) ────────────────────────

interface Asset {
  symbol: string;
  currentPrice: number;
}

interface Holding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
}

interface Portfolio {
  cash: number;
  assets: Holding[];
  totalValue: number;
}

function computeTotalValue(portfolio: Portfolio, marketAssets: Asset[]): number {
  const holdingsValue = portfolio.assets.reduce((sum, holding) => {
    const market = marketAssets.find((a) => a.symbol === holding.symbol);
    const price = market?.currentPrice ?? holding.currentPrice ?? holding.averagePrice;
    return sum + holding.quantity * price;
  }, 0);
  return portfolio.cash + holdingsValue;
}

function updateAsset(assets: Asset[], symbol: string, updates: Partial<Asset>): Asset[] {
  return assets.map((a) => (a.symbol === symbol ? { ...a, ...updates } : a));
}

function addToWatchlist(symbols: string[], symbol: string): string[] {
  if (symbols.includes(symbol)) return symbols;
  return [...symbols, symbol];
}

function removeFromWatchlist(symbols: string[], symbol: string): string[] {
  return symbols.filter((s) => s !== symbol);
}

// ─── Property 7: Portfolio totalValue invariant ───────────────────────────────
// Feature: trading-dashboard-refactor, Property 7
describe('Store — Property 7: Portfolio totalValue invariant', () => {
  it('totalValue = cash + sum(quantity * currentPrice) for all holdings', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100_000, noNaN: true }),  // cash
        fc.array(
          fc.record({
            symbol: fc.constantFrom('BTC', 'ETH', 'AAPL', 'TSLA'),
            quantity: fc.float({ min: 0.001, max: 100, noNaN: true }),
            averagePrice: fc.float({ min: 1, max: 100_000, noNaN: true }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            symbol: fc.constantFrom('BTC', 'ETH', 'AAPL', 'TSLA'),
            currentPrice: fc.float({ min: 1, max: 100_000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 4 }
        ),
        (cash, holdings, marketAssets) => {
          // Deduplicate holdings by symbol (take last)
          const uniqueHoldings = Object.values(
            holdings.reduce((acc, h) => ({ ...acc, [h.symbol]: h }), {} as Record<string, typeof holdings[0]>)
          );

          const portfolio: Portfolio = {
            cash,
            assets: uniqueHoldings,
            totalValue: 0,
          };

          const computed = computeTotalValue(portfolio, marketAssets);
          const expected = cash + uniqueHoldings.reduce((sum, h) => {
            const market = marketAssets.find((a) => a.symbol === h.symbol);
            const price = market?.currentPrice ?? h.averagePrice;
            return sum + h.quantity * price;
          }, 0);

          return Math.abs(computed - expected) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: Watchlist deduplication ─────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 8
describe('Store — Property 8: Watchlist deduplication', () => {
  it('adding a symbol already in the watchlist does not change its length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('BTC', 'ETH', 'AAPL', 'TSLA', 'MSFT'), { minLength: 1, maxLength: 5 }),
        (symbols) => {
          const unique = [...new Set(symbols)];
          const symbolToAdd = unique[0]; // already present

          const result = addToWatchlist(unique, symbolToAdd);
          return result.length === unique.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Watchlist round-trip ────────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 9
describe('Store — Property 9: Watchlist round-trip', () => {
  it('add then remove the same symbol returns the original watchlist (order-independent)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('BTC', 'ETH', 'AAPL', 'TSLA', 'MSFT'), { minLength: 0, maxLength: 5 }),
        fc.constantFrom('BTC', 'ETH', 'AAPL', 'TSLA', 'MSFT'),
        (symbols, symbolToToggle) => {
          const original = [...new Set(symbols)].filter((s) => s !== symbolToToggle);

          const afterAdd = addToWatchlist(original, symbolToToggle);
          const afterRemove = removeFromWatchlist(afterAdd, symbolToToggle);

          const originalSorted = [...original].sort();
          const resultSorted = [...afterRemove].sort();

          return JSON.stringify(originalSorted) === JSON.stringify(resultSorted);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: MarketStore update isolation ────────────────────────────────
// Feature: trading-dashboard-refactor, Property 14
describe('Store — Property 14: MarketStore update isolation', () => {
  it('updateAsset(symbolA) leaves all other assets unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            symbol: fc.string({ minLength: 1, maxLength: 5 }),
            currentPrice: fc.float({ min: 1, max: 100_000, noNaN: true }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.float({ min: 1, max: 100_000, noNaN: true }),
        (assets, newPrice) => {
          // Deduplicate by symbol
          const unique = Object.values(
            assets.reduce((acc, a) => ({ ...acc, [a.symbol]: a }), {} as Record<string, typeof assets[0]>)
          );
          if (unique.length < 2) return true;

          const targetSymbol = unique[0].symbol;
          const updated = updateAsset(unique, targetSymbol, { currentPrice: newPrice });

          // All non-target assets must be identical
          return unique
            .filter((a) => a.symbol !== targetSymbol)
            .every((original) => {
              const inUpdated = updated.find((a) => a.symbol === original.symbol);
              return inUpdated?.currentPrice === original.currentPrice;
            });
        }
      ),
      { numRuns: 100 }
    );
  });
});
