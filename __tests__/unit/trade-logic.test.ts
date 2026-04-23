/**
 * Property-based tests for trade execution logic.
 *
 * Properties covered:
 *   Property 4: Trade cash invariant (BUY deducts, SELL credits)
 *   Property 5: BUY holding correctness (averagePrice, totalCost)
 *   Property 6: Trade rejection invariants (insufficient funds/quantity)
 *
 * These tests exercise pure functions extracted from the trade route logic,
 * keeping them independent of MongoDB.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure trade logic (mirrors app/api/trade/route.ts) ───────────────────────

interface Holding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

interface PortfolioState {
  cash: number;
  assets: Holding[];
}

type TradeResult =
  | { success: true; portfolio: PortfolioState }
  | { success: false; error: string };

function applyBuyTrade(
  portfolio: PortfolioState,
  symbol: string,
  quantity: number,
  price: number
): TradeResult {
  const total = quantity * price;

  if (portfolio.cash < total) {
    return { success: false, error: 'Insufficient funds' };
  }

  const newAssets = [...portfolio.assets.map((a) => ({ ...a }))];
  const existing = newAssets.find((a) => a.symbol === symbol);

  if (existing) {
    const newTotalCost = existing.totalCost + total;
    const newQuantity = existing.quantity + quantity;
    existing.averagePrice = newTotalCost / newQuantity;
    existing.totalCost = newTotalCost;
    existing.quantity = newQuantity;
  } else {
    newAssets.push({ symbol, quantity, averagePrice: price, totalCost: total });
  }

  return {
    success: true,
    portfolio: { cash: portfolio.cash - total, assets: newAssets },
  };
}

function applySellTrade(
  portfolio: PortfolioState,
  symbol: string,
  quantity: number,
  price: number
): TradeResult {
  const total = quantity * price;
  const assetIndex = portfolio.assets.findIndex((a) => a.symbol === symbol);

  if (assetIndex === -1) {
    return { success: false, error: 'Asset not found in portfolio' };
  }

  const asset = portfolio.assets[assetIndex];

  if (asset.quantity < quantity) {
    return { success: false, error: 'Insufficient quantity to sell' };
  }

  const newAssets = portfolio.assets.map((a) => ({ ...a }));
  const target = newAssets[assetIndex];
  target.quantity -= quantity;

  const finalAssets = target.quantity === 0
    ? newAssets.filter((_, i) => i !== assetIndex)
    : newAssets;

  return {
    success: true,
    portfolio: { cash: portfolio.cash + total, assets: finalAssets },
  };
}

// ─── Property 4: Trade cash invariant ────────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 4
describe('Trade logic — Property 4: Trade cash invariant', () => {
  it('BUY deducts exactly quantity * price from cash', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100, noNaN: true }),    // quantity
        fc.float({ min: 0.01, max: 10_000, noNaN: true }), // price
        (quantity, price) => {
          const total = quantity * price;
          const cash = total * 2; // always sufficient
          const portfolio: PortfolioState = { cash, assets: [] };

          const result = applyBuyTrade(portfolio, 'TEST', quantity, price);
          if (!result.success) return false;

          return Math.abs(result.portfolio.cash - (cash - total)) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('SELL credits exactly quantity * price to cash', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100, noNaN: true }),
        fc.float({ min: 0.01, max: 10_000, noNaN: true }),
        (quantity, price) => {
          const total = quantity * price;
          const portfolio: PortfolioState = {
            cash: 0,
            assets: [{ symbol: 'TEST', quantity: quantity * 2, averagePrice: price, totalCost: quantity * 2 * price }],
          };

          const result = applySellTrade(portfolio, 'TEST', quantity, price);
          if (!result.success) return false;

          return Math.abs(result.portfolio.cash - total) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: BUY holding correctness ─────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 5
describe('Trade logic — Property 5: BUY holding correctness', () => {
  it('new holding has averagePrice = price, quantity = qty, totalCost = qty * price', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100, noNaN: true }),
        fc.float({ min: 0.01, max: 10_000, noNaN: true }),
        (quantity, price) => {
          const total = quantity * price;
          const portfolio: PortfolioState = { cash: total * 2, assets: [] };

          const result = applyBuyTrade(portfolio, 'NEW', quantity, price);
          if (!result.success) return false;

          const holding = result.portfolio.assets.find((a) => a.symbol === 'NEW');
          if (!holding) return false;

          return (
            Math.abs(holding.averagePrice - price) < 0.0001 &&
            Math.abs(holding.quantity - quantity) < 0.0001 &&
            Math.abs(holding.totalCost - total) < 0.0001
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('existing holding averagePrice = (oldTotalCost + newTotal) / (oldQty + newQty)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 50, noNaN: true }),   // existing quantity
        fc.float({ min: 1, max: 5_000, noNaN: true }),   // existing price
        fc.float({ min: 0.01, max: 50, noNaN: true }),   // new quantity
        fc.float({ min: 1, max: 5_000, noNaN: true }),   // new price
        (existingQty, existingPrice, newQty, newPrice) => {
          const existingTotal = existingQty * existingPrice;
          const newTotal = newQty * newPrice;
          const portfolio: PortfolioState = {
            cash: newTotal * 2,
            assets: [{ symbol: 'TEST', quantity: existingQty, averagePrice: existingPrice, totalCost: existingTotal }],
          };

          const result = applyBuyTrade(portfolio, 'TEST', newQty, newPrice);
          if (!result.success) return false;

          const holding = result.portfolio.assets.find((a) => a.symbol === 'TEST');
          if (!holding) return false;

          const expectedAvg = (existingTotal + newTotal) / (existingQty + newQty);
          const expectedTotalCost = existingTotal + newTotal;

          return (
            Math.abs(holding.averagePrice - expectedAvg) < 0.0001 &&
            Math.abs(holding.totalCost - expectedTotalCost) < 0.0001
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 6: Trade rejection invariants ───────────────────────────────────
// Feature: trading-dashboard-refactor, Property 6
describe('Trade logic — Property 6: Trade rejection invariants', () => {
  it('BUY is rejected when cash < quantity * price', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100, noNaN: true }),
        fc.float({ min: 0.01, max: 10_000, noNaN: true }),
        (quantity, price) => {
          const total = quantity * price;
          const portfolio: PortfolioState = { cash: total * 0.5, assets: [] }; // insufficient

          const result = applyBuyTrade(portfolio, 'TEST', quantity, price);
          return !result.success && result.error === 'Insufficient funds';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('SELL is rejected when symbol not in portfolio', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100, noNaN: true }),
        fc.float({ min: 0.01, max: 10_000, noNaN: true }),
        (quantity, price) => {
          const portfolio: PortfolioState = { cash: 100_000, assets: [] };
          const result = applySellTrade(portfolio, 'MISSING', quantity, price);
          return !result.success && result.error === 'Asset not found in portfolio';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('SELL is rejected when holding quantity < sell quantity', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 50, noNaN: true }),  // holding quantity
        fc.float({ min: 0.01, max: 10_000, noNaN: true }),
        (holdingQty, price) => {
          const sellQty = holdingQty * 2; // always more than held
          const portfolio: PortfolioState = {
            cash: 0,
            assets: [{ symbol: 'TEST', quantity: holdingQty, averagePrice: price, totalCost: holdingQty * price }],
          };
          const result = applySellTrade(portfolio, 'TEST', sellQty, price);
          return !result.success && result.error === 'Insufficient quantity to sell';
        }
      ),
      { numRuns: 100 }
    );
  });
});
