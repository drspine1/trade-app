/**
 * Property-based tests for RealtimeEngine.
 *
 * Properties covered:
 *   Property 1: Price positivity
 *   Property 2: Price bounds (±50% of initial)
 *   Property 3: Interval deduplication
 *   Property 11: Throttle update rate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { RealtimeEngine } from '../../lib/realtime';

// Use fake timers so we can control setInterval without real delays
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ─── Property 1: Price positivity ────────────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 1
describe('RealtimeEngine — Property 1: Price positivity', () => {
  it('every emitted price is strictly greater than zero', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100_000, noNaN: true }),  // initialPrice
        fc.integer({ min: 1, max: 50 }),                      // number of ticks
        (initialPrice, ticks) => {
          const engine = new RealtimeEngine();
          const prices: number[] = [];

          engine.startPriceUpdate(
            'TEST',
            initialPrice,
            (newPrice) => prices.push(newPrice),
            100,  // intervalMs
            0     // throttleMs = 0 (no throttle, capture every tick)
          );

          vi.advanceTimersByTime(100 * ticks);
          engine.stopAll();

          return prices.every((p) => p > 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Price bounds ─────────────────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 2
describe('RealtimeEngine — Property 2: Price bounds', () => {
  it('every emitted price stays within [initialPrice * 0.5, initialPrice * 1.5]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 100_000, noNaN: true }),
        fc.integer({ min: 1, max: 100 }),
        (initialPrice, ticks) => {
          const engine = new RealtimeEngine();
          const prices: number[] = [];

          engine.startPriceUpdate(
            'TEST',
            initialPrice,
            (newPrice) => prices.push(newPrice),
            100,
            0
          );

          vi.advanceTimersByTime(100 * ticks);
          engine.stopAll();

          const lower = initialPrice * 0.5;
          const upper = initialPrice * 1.5;
          return prices.every((p) => p >= lower && p <= upper);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Interval deduplication ──────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 3
describe('RealtimeEngine — Property 3: Interval deduplication', () => {
  it('calling startPriceUpdate N times for the same symbol results in exactly 1 active interval', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),  // number of start calls
        (startCalls) => {
          const engine = new RealtimeEngine();

          for (let i = 0; i < startCalls; i++) {
            engine.startPriceUpdate('TEST', 100, () => {}, 1000, 0);
          }

          const activeCount = engine.activeCount;
          engine.stopAll();
          return activeCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stopPriceUpdate then startPriceUpdate results in exactly 1 active interval', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (cycles) => {
          const engine = new RealtimeEngine();

          for (let i = 0; i < cycles; i++) {
            engine.startPriceUpdate('TEST', 100, () => {}, 1000, 0);
            engine.stopPriceUpdate('TEST');
          }
          engine.startPriceUpdate('TEST', 100, () => {}, 1000, 0);

          const activeCount = engine.activeCount;
          engine.stopAll();
          return activeCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Throttle update rate ───────────────────────────────────────
// Feature: trading-dashboard-refactor, Property 11
describe('RealtimeEngine — Property 11: Throttle update rate', () => {
  it('callback fires at most ceil(T / throttleMs) + 1 times in window T', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),  // throttleMs
        fc.integer({ min: 1, max: 20 }),       // number of throttleMs windows
        (throttleMs, windows) => {
          const engine = new RealtimeEngine();
          let callCount = 0;
          const T = throttleMs * windows;

          engine.startPriceUpdate(
            'TEST',
            100,
            () => { callCount++; },
            50,        // intervalMs much smaller than throttleMs to generate many ticks
            throttleMs
          );

          vi.advanceTimersByTime(T);
          engine.stopAll();

          const maxAllowed = Math.ceil(T / throttleMs) + 1;
          return callCount <= maxAllowed;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when throttleMs = 0, every tick fires the callback', () => {
    const engine = new RealtimeEngine();
    let callCount = 0;
    const ticks = 10;

    engine.startPriceUpdate('TEST', 100, () => { callCount++; }, 100, 0);
    vi.advanceTimersByTime(100 * ticks);
    engine.stopAll();

    expect(callCount).toBe(ticks);
  });
});
