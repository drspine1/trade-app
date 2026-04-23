# Implementation Plan: Trading Dashboard Refactor

## Overview

Incremental refactor of the Pure Technique trading dashboard. Each task builds on the previous, ending with full integration and property-based test coverage. All tasks are TypeScript/Next.js (App Router). No task is left unconnected — every step is wired into the running application before moving on.

## Tasks

- [x] 1. Foundation — constants, CSS dedup, install dependencies
  - [x] 1.1 Create `lib/constants.ts` exporting `DEFAULT_USER_ID = 'user_default'`
    - Single source of truth for the hardcoded user ID used across all API routes
    - _Requirements: 15.1, 15.2_

  - [x] 1.2 Delete `styles/globals.css` and verify `app/globals.css` is the sole CSS entry point
    - Remove the duplicate file; confirm `app/layout.tsx` already imports `./globals.css`
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Install `gsap` and `@tanstack/react-virtual` via pnpm
    - Run `pnpm add gsap @tanstack/react-virtual`
    - Also install dev deps: `pnpm add -D fast-check vitest @vitest/coverage-v8 @types/gsap`
    - _Requirements: 10.1, 13.3_

- [x] 2. Store — verify and harden the four Zustand slices in `lib/store.ts`
  - [x] 2.1 Audit and update `lib/store.ts` to match design interfaces exactly
    - Rename `PortfolioAsset` → `Holding` and add `userId` field to `Transaction` interface
    - Ensure `addTransaction` prepends (newest first) and `updateAsset` maps without mutating other assets
    - _Requirements: 17.1, 16.4_

  - [ ]* 2.2 Write property test — MarketStore update isolation (Property 14)
    - **Property 14: MarketStore update isolation**
    - **Validates: Requirements 17.1**
    - File: `__tests__/unit/store.test.ts`

- [x] 3. RealtimeEngine — throttle, price bounds, interval dedup
  - [x] 3.1 Refactor `lib/realtime.ts` to add `throttleMs` parameter and price clamping
    - Add `throttleMs: number = 500` to `startPriceUpdate` signature
    - Clamp `basePrice` to `[initialPrice * 0.5, initialPrice * 1.5]` after each tick
    - Implement throttle: track `lastEmitTime`, only invoke callback when `now - lastEmitTime >= throttleMs`; bypass when `throttleMs === 0`
    - Preserve existing `stopPriceUpdate(symbol)` call at the top of `startPriceUpdate` (interval dedup)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 3.2 Write property test — price positivity (Property 1)
    - **Property 1: Price positivity**
    - **Validates: Requirements 3.2**
    - File: `__tests__/unit/realtime.test.ts`

  - [ ]* 3.3 Write property test — price bounds (Property 2)
    - **Property 2: Price bounds**
    - **Validates: Requirements 3.3**
    - File: `__tests__/unit/realtime.test.ts`

  - [ ]* 3.4 Write property test — interval deduplication (Property 3)
    - **Property 3: Interval deduplication**
    - **Validates: Requirements 3.5, 3.6**
    - File: `__tests__/unit/realtime.test.ts`

  - [ ]* 3.5 Write property test — throttle update rate (Property 11)
    - **Property 11: Throttle update rate**
    - **Validates: Requirements 11.2, 11.3**
    - File: `__tests__/unit/realtime.test.ts`

- [x] 4. API routes — import DEFAULT_USER_ID, fix totalValue bug, confirm sort order
  - [x] 4.1 Update all five API routes to import `DEFAULT_USER_ID` from `@/lib/constants`
    - Replace `const userId = 'user_default'` in `assets/route.ts`, `portfolio/route.ts`, `trade/route.ts`, `transactions/route.ts`, `watchlist/route.ts`
    - _Requirements: 15.2, 15.3_

  - [x] 4.2 Fix `totalValue` bug in `app/api/trade/route.ts`
    - After updating the portfolio, fetch current market prices from the `Asset` collection
    - Build a `priceMap` and recalculate `totalHoldingsValue` using `currentPrice` (not `averagePrice`)
    - _Requirements: 6.1, 6.4, 17.2_

  - [ ]* 4.3 Write property test — trade cash invariant (Property 4)
    - **Property 4: Trade cash invariant**
    - **Validates: Requirements 4.1, 5.1, 17.3, 17.4**
    - File: `__tests__/unit/trade-logic.test.ts`

  - [ ]* 4.4 Write property test — BUY holding correctness (Property 5)
    - **Property 5: BUY holding correctness**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - File: `__tests__/unit/trade-logic.test.ts`

  - [ ]* 4.5 Write property test — trade rejection invariants (Property 6)
    - **Property 6: Trade rejection invariants**
    - **Validates: Requirements 4.5, 5.3, 5.4**
    - File: `__tests__/unit/trade-logic.test.ts`

  - [ ]* 4.6 Write property test — portfolio totalValue invariant (Property 7)
    - **Property 7: Portfolio totalValue invariant**
    - **Validates: Requirements 6.1, 6.4, 17.2**
    - File: `__tests__/unit/store.test.ts`

  - [ ]* 4.7 Write property test — transaction total integrity (Property 12)
    - **Property 12: Transaction total integrity**
    - **Validates: Requirements 16.3, 16.5**
    - File: `__tests__/unit/transaction.test.ts`

  - [ ]* 4.8 Write property test — transaction sort order (Property 13)
    - **Property 13: Transaction sort order**
    - **Validates: Requirements 16.4**
    - File: `__tests__/unit/transaction.test.ts`

- [x] 5. New pages — portfolio, history, asset detail, 404
  - [x] 5.1 Create `app/portfolio/page.tsx`
    - Client component; uses `usePortfolio()` hook; renders `<PortfolioCard>` with loading skeleton and error+retry state
    - _Requirements: 1.2, 14.2, 14.4_

  - [x] 5.2 Create `app/history/page.tsx`
    - Client component; uses `useTransactions()` hook; renders `<TransactionList>` with loading spinner
    - _Requirements: 1.3_

  - [x] 5.3 Create `app/asset/[symbol]/page.tsx`
    - Client component; reads `params.symbol`; finds asset from `useMarketStore`; renders `<AssetChart>` + buy/sell buttons + `<TradeModal>`
    - _Requirements: 1.4_

  - [x] 5.4 Create `app/not-found.tsx`
    - Static component; renders a 404 message with a `<Link href="/">` back to Market
    - _Requirements: 1.6_

- [x] 6. New components — NavHeader, PriceTicker, WatchlistPanel, TransactionList
  - [x] 6.1 Create `components/NavHeader.tsx`
    - No props; reads `usePortfolioStore` for live portfolio value display
    - Nav links to `/`, `/portfolio`, `/history` using Next.js `<Link>`; active link highlighted via `usePathname()`
    - _Requirements: 1.1, 8.3_

  - [x] 6.2 Create `components/PriceTicker.tsx`
    - `React.memo`; reads from `useMarketStore`; CSS `ticker-scroll` animation on a duplicated asset list for seamless loop
    - Each item: symbol, currentPrice, changePercent24h with green/red coloring
    - _Requirements: 8.3, 8.5_

  - [x] 6.3 Create `components/WatchlistPanel.tsx`
    - Local state: `query`, `debouncedQuery` (300ms), `watchlistSymbols`, `loading`, `error`
    - Fetch watchlist on mount; filter assets from `useMarketStore` by debounced query
    - Add: `POST /api/watchlist`; Remove: `DELETE /api/watchlist?symbol=X`; error state with retry button
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 8.1_

  - [ ]* 6.4 Write property test — watchlist deduplication (Property 8)
    - **Property 8: Watchlist deduplication**
    - **Validates: Requirements 7.3, 17.5**
    - File: `__tests__/unit/store.test.ts`

  - [ ]* 6.5 Write property test — watchlist round-trip (Property 9)
    - **Property 9: Watchlist round-trip**
    - **Validates: Requirements 7.4, 17.6**
    - File: `__tests__/unit/store.test.ts`

  - [x] 6.6 Create `components/TransactionList.tsx`
    - `React.memo`; accepts `transactions: Transaction[]`
    - When `transactions.length === 0`, render empty state message
    - When `transactions.length > 50`, use `useVirtualizer` from `@tanstack/react-virtual` (`estimateSize: () => 52`, `overscan: 5`, fixed-height outer container)
    - Columns: Asset, Type, Quantity, Price, Total, Date
    - _Requirements: 8.2, 8.4, 13.2, 13.3, 13.4, 12.2_

- [ ] 7. Checkpoint — ensure all new components compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Updated components — AssetCard, PortfolioCard, TradeModal, AssetChart
  - [x] 8.1 Update `components/AssetCard.tsx` — React.memo + GSAP price flash
    - Wrap with `React.memo`
    - Add `cardRef = useRef<HTMLButtonElement>` and `prevPriceRef = useRef<number>`
    - `useEffect` on `asset.currentPrice`: call `gsap.fromTo` with green (`#16a34a33`) or red (`#dc262633`) background flash, `duration: 0.5, ease: 'power2.out'`
    - _Requirements: 10.2, 10.3, 12.1, 12.4_

  - [x] 8.2 Update `components/PortfolioCard.tsx` — React.memo + currentPrice fix
    - Wrap with `React.memo`
    - Ensure holdings value uses `asset.currentPrice` (already present via `|| asset.averagePrice` fallback — confirm it is correct)
    - _Requirements: 6.3, 12.3_

  - [x] 8.3 Update `components/TradeModal.tsx` — GSAP scale animation
    - Add `modalRef = useRef<HTMLDivElement>` on the inner modal div
    - Replace Framer Motion `scale` on inner div with GSAP: open → `gsap.fromTo(modalRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.4)' })`
    - Close → `handleClose` calls `gsap.to(modalRef.current, { scale: 0.85, opacity: 0, duration: 0.15, ease: 'power2.in', onComplete: onClose })`
    - Retain Framer Motion `AnimatePresence` + backdrop `opacity` transition
    - Ensure API errors display inline without closing the modal (already handled by `setError`)
    - _Requirements: 10.4, 10.5, 10.6, 14.5_

  - [x] 8.4 Update `components/AssetChart.tsx` — timeframes + candlestick
    - Add state: `timeframe: '1H' | '24H' | '7D' | '1M' | '1Y'` (default `'24H'`), `chartType: 'line' | 'candlestick'` (default `'line'`)
    - Implement `generateChartData(asset, timeframe, chartType)` pure function producing correct point counts: 1H→60, 24H→24, 7D→7, 1M→30, 1Y→52
    - For candlestick: generate OHLC points; render with Recharts `ComposedChart` + custom `<Bar>` shape drawing wicks and bodies
    - Add timeframe selector buttons and chart type toggle to the UI
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 8.5 Write property test — chart data point count (Property 10)
    - **Property 10: Chart data point count**
    - **Validates: Requirements 9.6**
    - File: `__tests__/unit/chart-data.test.ts`

- [x] 9. Update `app/layout.tsx` — add NavHeader and PriceTicker
  - Import and render `<NavHeader>` and `<PriceTicker>` inside `<body>`, above `{children}`
  - Both are client components; layout itself remains a Server Component
  - _Requirements: 1.1, 8.3_

- [x] 10. Update `app/page.tsx` — market view with WatchlistPanel and virtualized asset list
  - Remove the tab navigation (portfolio and history tabs now live at their own routes)
  - Render market view only: virtualized asset list (use `useVirtualizer`, `estimateSize: () => 120`, `overscan: 3`, trigger when `assets.length > 20`) + `<AssetChart>` + `<WatchlistPanel>`
  - Wrap `handleAssetSelect` and trade handlers in `useCallback`
  - Add loading spinner for assets fetch; add error message + Retry button that calls `fetchAssets()` again
  - _Requirements: 1.5, 13.1, 13.3, 13.4, 14.1, 14.3, 14.6_

- [x] 11. Update hooks — useAssets throttleMs, usePortfolio totalValue fix
  - [x] 11.1 Update `hooks/useAssets.ts` to pass `throttleMs` to `realtimeEngine.startPriceUpdate`
    - Pass `2000` as `intervalMs` and `500` as `throttleMs` (matching design defaults)
    - Expose a `refetch` function that can be called by the Retry button in `app/page.tsx`
    - _Requirements: 11.1, 14.3, 14.6_

  - [x] 11.2 Update `hooks/usePortfolio.ts` to ensure `totalValue` recalculation uses `currentPrice`
    - The existing `useEffect` on `assets` already does this — verify the logic matches design exactly: `sum(holding.quantity * (currentAsset?.currentPrice || holding.averagePrice))`
    - _Requirements: 6.2, 6.4_

- [ ] 12. Checkpoint — full integration smoke check
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Property-based tests — remaining properties
  - The property tests for Properties 1–14 are distributed as sub-tasks in tasks 2–8 above. This task consolidates any remaining test file scaffolding.
  - [x] 13.1 Create `vitest.config.ts` at project root if not present
    - Configure `include: ['__tests__/**/*.test.ts']`, `environment: 'node'`
    - _Requirements: 17.1_

  - [ ]* 13.2 Verify all 14 property tests are present and passing
    - Run `pnpm vitest run --coverage`
    - Confirm Properties 1–14 each have at least one `fc.assert(fc.property(...))` call with `numRuns: 100`
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3, 5.4, 6.1, 6.4, 7.3, 7.4, 9.6, 11.2, 11.3, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [x] 14. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` minimum
- GSAP is imported only in `'use client'` components — no SSR issues
- The four Zustand slices remain co-located in `lib/store.ts` (no file split)
- `styles/globals.css` is deleted; `app/globals.css` is the single CSS entry point
