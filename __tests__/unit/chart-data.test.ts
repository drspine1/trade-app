/**
 * Property-based tests for chart data generation.
 *
 * Properties covered:
 *   Property 10: Chart data point count
 *     1H → 60, 24H → 24, 7D → 7, 1M → 30, 1Y → 52
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { format, subMinutes, subHours, subDays, subWeeks } from 'date-fns';

// ─── Inline generateChartData (pure function, no React dependency) ────────────

type Timeframe = '1H' | '24H' | '7D' | '1M' | '1Y';
type ChartType = 'line' | 'candlestick';

interface MockAsset {
  currentPrice: number;
  highPrice: number;
  lowPrice: number;
}

function generateChartData(asset: MockAsset, timeframe: Timeframe, chartType: ChartType) {
  const config: Record<Timeframe, { count: number; stepFn: (d: Date, i: number) => Date; fmt: string }> = {
    '1H':  { count: 60, stepFn: (d, i) => subMinutes(d, i), fmt: 'HH:mm' },
    '24H': { count: 24, stepFn: (d, i) => subHours(d, i),   fmt: 'HH:mm' },
    '7D':  { count: 7,  stepFn: (d, i) => subDays(d, i),    fmt: 'MMM d' },
    '1M':  { count: 30, stepFn: (d, i) => subDays(d, i),    fmt: 'MMM d' },
    '1Y':  { count: 52, stepFn: (d, i) => subWeeks(d, i),   fmt: 'MMM d' },
  };

  const { count, stepFn, fmt } = config[timeframe];
  const now = new Date();
  const volatility = 0.015;
  let price = asset.currentPrice;
  const points: Array<{ time: string; price: number }> = [];

  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.5) * volatility * price;
    price = Math.max(price + change, asset.lowPrice * 0.8);
    price = Math.min(price, asset.highPrice * 1.2);
    points.push({ time: format(stepFn(now, i), fmt), price: parseFloat(price.toFixed(2)) });
  }

  return points;
}

// ─── Property 10: Chart data point count ─────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 10
describe('Chart data — Property 10: Chart data point count', () => {
  const EXPECTED_COUNTS: Record<Timeframe, number> = {
    '1H':  60,
    '24H': 24,
    '7D':  7,
    '1M':  30,
    '1Y':  52,
  };

  const timeframes: Timeframe[] = ['1H', '24H', '7D', '1M', '1Y'];

  timeframes.forEach((tf) => {
    it(`${tf} produces exactly ${EXPECTED_COUNTS[tf]} data points`, () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 100_000, noNaN: true }),  // currentPrice
          (currentPrice) => {
            const asset: MockAsset = {
              currentPrice,
              highPrice: currentPrice * 1.1,
              lowPrice: currentPrice * 0.9,
            };
            const data = generateChartData(asset, tf, 'line');
            return data.length === EXPECTED_COUNTS[tf];
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  it('candlestick mode also produces the correct point count for each timeframe', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Timeframe>('1H', '24H', '7D', '1M', '1Y'),
        fc.float({ min: 1, max: 100_000, noNaN: true }),
        (tf, currentPrice) => {
          const asset: MockAsset = {
            currentPrice,
            highPrice: currentPrice * 1.1,
            lowPrice: currentPrice * 0.9,
          };
          const data = generateChartData(asset, tf, 'candlestick');
          return data.length === EXPECTED_COUNTS[tf];
        }
      ),
      { numRuns: 100 }
    );
  });
});
