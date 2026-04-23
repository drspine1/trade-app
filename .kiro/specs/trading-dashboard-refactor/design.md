# Design Document — Trading Dashboard Refactor

## Overview

This document describes the technical design for refactoring the Pure Technique trading dashboard. The application is a Next.js 14 App Router simulation of a real-time trading platform backed by MongoDB. The current codebase is functional at MVP level but has structural gaps, a portfolio value bug, duplicate CSS, missing components, and no performance optimizations.

The refactor achieves five goals without changing user-visible functionality:
1. Migrate from a single-page tab layout to proper App Router pages
2. Fix the `totalValue` bug (averagePrice → currentPrice)
3. Add missing PRD components (WatchlistPanel, TransactionList, PriceTicker)
4. Integrate GSAP animations and throttled/bounded RealtimeEngine
5. Add React.memo, useCallback, and @tanstack/react-virtual for performance

---

## Architecture

### High-Level Data Flow

```
MongoDB
  └── API Routes (Next.js Route Handlers)
        ├── /api/assets        → seed + fetch Asset documents
        ├── /api/portfolio     → fetch Portfolio, enrich with currentPrice
        ├── /api/trade         → BUY/SELL, update Portfolio + create Transaction
        ├── /api/transactions  → fetch Transaction history (sorted desc)
        └── /api/watchlist     → GET/POST/DELETE watchlist symbols

Zustand Stores (client)
  ├── useMarketStore     → Asset[] + loading/error
  ├── usePortfolioStore  → Portfolio + loading/error
  ├── useTransactionsStore → Transaction[] + loading/error
  └── useUIStore         → selectedSymbol, modal visibility, selectedAssetForTrade

RealtimeEngine (lib/realtime.ts)
  └── setInterval per symbol → throttled → useMarketStore.updateAsset()
        └── usePortfolio hook reacts → recalculates totalValue from currentPrice

React Component Tree
  app/layout.tsx (persistent nav + PriceTicker)
    ├── app/page.tsx           (Market: AssetList + AssetChart + WatchlistPanel)
    ├── app/portfolio/page.tsx (PortfolioCard)
    ├── app/history/page.tsx   (TransactionList)
    └── app/asset/[symbol]/page.tsx (AssetChart detail + TradeModal)
```

### Key Design Decisions

- **Store split stays in `lib/store.ts`**: The four Zustand slices already exist in `lib/store.ts`. Rather than splitting into four files (which would require updating every import), the slices remain co-located in one file. This is idiomatic for small-to-medium Zustand projects and avoids a large import churn refactor.
- **GSAP for micro-animations, Framer Motion for page transitions**: Framer Motion's `AnimatePresence` handles route-level enter/exit. GSAP handles price flash (imperative DOM mutation) and modal scale (replacing the existing Framer Motion scale on the modal inner div).
- **Throttle in RealtimeEngine, not in the store**: The throttle lives in `RealtimeEngine.startPriceUpdate` so the store remains a pure reducer. This keeps the store testable without timing concerns.
- **Price bounds enforced in RealtimeEngine**: `basePrice` is clamped to `[initialPrice * 0.5, initialPrice * 1.5]` after each tick, guaranteeing the ±50% invariant and preventing negative prices.
- **`lib/constants.ts` for DEFAULT_USER_ID**: All five API routes import from this single file.

---

## Folder Structure After Refactor

```
app/
  globals.css                  ← single CSS entry point (keep)
  layout.tsx                   ← add persistent nav + PriceTicker
  page.tsx                     ← Market view (AssetList + AssetChart + WatchlistPanel)
  portfolio/
    page.tsx                   ← NEW: PortfolioCard page
  history/
    page.tsx                   ← NEW: TransactionList page
  asset/
    [symbol]/
      page.tsx                 ← NEW: Asset detail page
  not-found.tsx                ← NEW: 404 page
  api/
    assets/route.ts
    portfolio/route.ts
    trade/route.ts             ← fix totalValue calculation
    transactions/route.ts
    watchlist/route.ts

components/
  AssetCard.tsx                ← add React.memo + GSAP price flash
  AssetChart.tsx               ← add timeframe selector + candlestick toggle
  PortfolioCard.tsx            ← add React.memo + fix currentPrice usage
  TradeModal.tsx               ← replace Framer Motion scale with GSAP
  WatchlistPanel.tsx           ← NEW
  TransactionList.tsx          ← NEW (with virtualization)
  PriceTicker.tsx              ← NEW
  NavHeader.tsx                ← NEW: extracted persistent nav

hooks/
  useAssets.ts                 ← pass throttleMs to RealtimeEngine
  usePortfolio.ts              ← fix totalValue recalc (currentPrice)
  useTransactions.ts
  use-mobile.ts
  use-toast.ts

lib/
  store.ts                     ← keep 4 slices co-located
  realtime.ts                  ← add throttleMs + price bounds
  models.ts
  mongodb.ts
  constants.ts                 ← NEW: DEFAULT_USER_ID
  utils.ts

styles/
  globals.css                  ← DELETE (duplicate)
```

---

## Components and Interfaces

### NavHeader

Persistent header rendered in `app/layout.tsx`. Contains the PT logo, nav links (`/`, `/portfolio`, `/history`), and the live portfolio value display.

```typescript
// No props — reads from usePortfolioStore directly
export function NavHeader(): JSX.Element
```

Nav links use Next.js `<Link>`. Active link is highlighted via `usePathname()`.

---

### PriceTicker

A horizontally auto-scrolling strip showing live prices for all assets. Rendered in `app/layout.tsx` below the nav so it appears on every page.

```typescript
interface PriceTickerProps {
  // no props — reads from useMarketStore
}
export const PriceTicker = React.memo(function PriceTicker(): JSX.Element)
```

Implementation: CSS `animation: ticker-scroll linear infinite` on a duplicated asset list (seamless loop). Each item shows `symbol`, `currentPrice`, and `changePercent24h` with green/red coloring. Updates reflect within one render cycle because the component subscribes to `useMarketStore`.

---

### AssetCard

```typescript
interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  inPortfolio?: boolean;
}
export const AssetCard = React.memo(function AssetCard(props: AssetCardProps): JSX.Element)
```

GSAP price flash: a `useRef` on the card container. A `useEffect` watches `asset.currentPrice`. When it changes, `gsap.to(ref.current, { backgroundColor: color, duration: 0.15, yoyo: true, repeat: 1 })` fires — green for increase, red for decrease. The previous price is tracked in a `useRef<number>` to determine direction.

`onSelect` is passed as a stable `useCallback` from the parent to prevent unnecessary re-renders.

---

### AssetChart

```typescript
type Timeframe = '1H' | '24H' | '7D' | '1M' | '1Y';
type ChartType = 'line' | 'candlestick';

interface OHLCPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface LinePoint {
  time: string;
  price: number;
}

interface AssetChartProps {
  asset: Asset | null;
}
export function AssetChart({ asset }: AssetChartProps): JSX.Element
```

State: `timeframe: Timeframe` (default `'24H'`), `chartType: ChartType` (default `'line'`).

Data point counts per timeframe (Requirement 9.6):
| Timeframe | Points | Interval |
|-----------|--------|----------|
| 1H        | 60     | 1 min    |
| 24H       | 24     | 1 hour   |
| 7D        | 7      | 1 day    |
| 1M        | 30     | 1 day    |
| 1Y        | 52     | 1 week   |

`generateChartData(asset, timeframe, chartType)` is a pure function that produces deterministic-seeded mock data from `asset.currentPrice`, `asset.highPrice`, `asset.lowPrice`. For candlestick, it generates OHLC points. For line, it generates `{ time, price }` points.

Candlestick rendering uses Recharts `ComposedChart` with a custom `<Bar>` shape that draws OHLC wicks and bodies.

---

### WatchlistPanel

```typescript
interface WatchlistPanelProps {
  // reads watchlist from API, assets from useMarketStore
}
export function WatchlistPanel(): JSX.Element
```

Local state: `query: string`, `debouncedQuery: string` (300ms debounce via `useEffect` + `setTimeout`), `watchlistSymbols: string[]`, `loading: boolean`, `error: string | null`.

Filtered assets = `useMarketStore().assets.filter(a => a.symbol.includes(debouncedQuery.toUpperCase()) || a.name.toLowerCase().includes(debouncedQuery.toLowerCase()))` intersected with watchlist symbols for the watched list, and the full asset list for the add-search.

Add: `POST /api/watchlist { symbol }`. Remove: `DELETE /api/watchlist?symbol=X`. On error, shows error message with a retry button.

---

### TransactionList

```typescript
interface TransactionListProps {
  transactions: Transaction[];
}
export const TransactionList = React.memo(function TransactionList(
  props: TransactionListProps
): JSX.Element)
```

Virtualization: when `transactions.length > 50`, uses `@tanstack/react-virtual` `useVirtualizer` with `estimateSize: () => 52` (row height in px) and `overscan: 5`. The outer container has a fixed height (`max-h-[600px] overflow-auto`). When `transactions.length === 0`, renders an empty state message.

Columns: Asset, Type, Quantity, Price, Total, Date — matching the existing inline table in `app/page.tsx`.

---

### TradeModal

```typescript
interface TradeModalProps {
  isOpen: boolean;
  asset: Asset | null;
  type: 'BUY' | 'SELL';
  portfolio: Portfolio | null;
  onClose: () => void;
  onSubmit: (quantity: number) => Promise<void>;
}
export function TradeModal(props: TradeModalProps): JSX.Element | null
```

GSAP replaces the existing Framer Motion `scale: 0.9 → 1` on the modal inner div:
- **Open**: `gsap.fromTo(modalRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.4)' })`
- **Close**: `gsap.to(modalRef.current, { scale: 0.85, opacity: 0, duration: 0.15, onComplete: onClose })`

The backdrop overlay retains Framer Motion `opacity: 0 → 1` (page-level transition). The modal inner div uses a `useRef` and GSAP. Error messages from the API are displayed inline without closing the modal (Requirement 14.5).

---

## Data Models

These are the TypeScript interfaces used across the client. They mirror the Mongoose schemas in `lib/models.ts`.

```typescript
// lib/store.ts (client-side types)

export interface Asset {
  symbol: string;
  name: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  highPrice: number;
  lowPrice: number;
  volume24h: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice?: number;   // enriched from MarketStore, not persisted
}

export interface Portfolio {
  _id?: string;
  userId: string;
  assets: Holding[];       // renamed from PortfolioAsset for clarity
  cash: number;
  totalValue: number;      // always = cash + sum(holding.quantity * holding.currentPrice)
  updatedAt?: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;           // always = quantity * price
  timestamp: string;
}
```

---

## Zustand Store Slices

All four slices remain in `lib/store.ts`.

### useMarketStore

```typescript
interface MarketState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  setAssets: (assets: Asset[]) => void;
  updateAsset: (symbol: string, updates: Partial<Asset>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

`updateAsset` maps over `assets`, replacing only the matching symbol. All other assets are returned unchanged (Requirement 17.1).

### usePortfolioStore

```typescript
interface PortfolioState {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  setPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (updates: Partial<Portfolio>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

### useTransactionsStore

```typescript
interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

`addTransaction` prepends to the array (newest first, matching API sort order).

### useUIStore

```typescript
interface UIState {
  selectedSymbol: string | null;
  showBuyModal: boolean;
  showSellModal: boolean;
  selectedAssetForTrade: Asset | null;
  setSelectedSymbol: (symbol: string | null) => void;
  setShowBuyModal: (show: boolean) => void;
  setShowSellModal: (show: boolean) => void;
  setSelectedAssetForTrade: (asset: Asset | null) => void;
}
```

---

## API Route Designs

### lib/constants.ts

```typescript
export const DEFAULT_USER_ID = 'user_default';
```

All five API routes replace the inline `const userId = 'user_default'` with `import { DEFAULT_USER_ID } from '@/lib/constants'`.

### GET /api/portfolio — totalValue fix

The existing route already enriches holdings with `currentPrice` from the Asset collection. The bug is in `app/api/trade/route.ts` which recalculates `totalValue` using `asset.averagePrice` instead of `currentPrice`. Fix:

```typescript
// BEFORE (buggy):
const totalHoldingsValue = portfolio.assets.reduce((sum, asset) => {
  return sum + asset.quantity * asset.averagePrice;  // ← wrong
}, 0);

// AFTER (correct):
const symbols = portfolio.assets.map((a) => a.symbol);
const marketAssets = await Asset.find({ symbol: { $in: symbols } }).lean();
const priceMap = new Map(marketAssets.map((a) => [a.symbol, a.currentPrice]));
const totalHoldingsValue = portfolio.assets.reduce((sum, asset) => {
  const currentPrice = priceMap.get(asset.symbol) ?? asset.averagePrice;
  return sum + asset.quantity * currentPrice;
}, 0);
portfolio.totalValue = portfolio.cash + totalHoldingsValue;
```

### POST /api/trade — BUY/SELL logic (unchanged structure, bug fix only)

The trade route logic is correct for BUY averaging and SELL removal. The only fix is the `totalValue` recalculation above. Transaction creation is already correct (`total = quantity * price`).

### GET /api/transactions — sort order

Already correct: `.sort({ timestamp: -1 })`. No change needed.

### POST /api/watchlist — dedup

Already correct: `if (!watchlist.symbols.includes(symbol))` guard. No change needed.

---

## RealtimeEngine Redesign

```typescript
export class RealtimeEngine {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private volatilityMap: Map<string, number> = new Map();

  startPriceUpdate(
    symbol: string,
    initialPrice: number,
    callback: (newPrice: number, change24h: number, changePercent24h: number) => void,
    intervalMs: number = 2000,
    throttleMs: number = 500          // NEW: throttle parameter
  ): void

  stopPriceUpdate(symbol: string): void
  stopAll(): void
}
```

### Price Bounds

```typescript
// Inside the interval callback:
basePrice += totalChange;

// Clamp to ±50% of initialPrice (never negative)
const lowerBound = initialPrice * 0.5;
const upperBound = initialPrice * 1.5;
basePrice = Math.max(lowerBound, Math.min(upperBound, basePrice));
```

### Interval Dedup

`startPriceUpdate` calls `this.stopPriceUpdate(symbol)` before creating a new interval. This is already present in the current code and is preserved.

### Throttle Implementation

```typescript
// Throttle: track last emit time per symbol
let lastEmitTime = 0;

const intervalId = setInterval(() => {
  // ... compute basePrice ...

  if (throttleMs === 0) {
    callback(basePrice, change24h, changePercent24h);
    return;
  }

  const now = Date.now();
  if (now - lastEmitTime >= throttleMs) {
    lastEmitTime = now;
    callback(basePrice, change24h, changePercent24h);
  }
}, intervalMs);
```

When `throttleMs = 0`, every tick is passed through. When `throttleMs > 0`, the callback fires at most once per `throttleMs` window.

---

## Performance Patterns

### React.memo

```typescript
// AssetCard — memoized, re-renders only when asset prop changes
export const AssetCard = React.memo(function AssetCard({ asset, onSelect, inPortfolio }: AssetCardProps) { ... });

// PortfolioCard — memoized
export const PortfolioCard = React.memo(function PortfolioCard({ portfolio }: PortfolioCardProps) { ... });

// TransactionList — memoized
export const TransactionList = React.memo(function TransactionList({ transactions }: TransactionListProps) { ... });
```

### useCallback for handlers

In `app/page.tsx` and asset detail page, `onSelect` and trade handlers are wrapped in `useCallback` with appropriate deps to prevent new function references on every render.

### Virtualized Lists

```typescript
// TransactionList — virtualize when > 50 items
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: transactions.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 52,
  overscan: 5,
});

// Asset list in app/page.tsx — virtualize when > 20 items
const assetVirtualizer = useVirtualizer({
  count: assets.length,
  getScrollElement: () => assetListRef.current,
  estimateSize: () => 120,
  overscan: 3,
});
```

The outer container has a fixed height and `overflow-auto`. The inner container has `height: virtualizer.getTotalSize()` with absolutely positioned items.

---

## GSAP Animation Patterns

### Installation

```bash
pnpm add gsap
```

GSAP is imported as `import gsap from 'gsap'` in client components only (no SSR issues since these components are `'use client'`).

### Price Flash (AssetCard)

```typescript
const cardRef = useRef<HTMLButtonElement>(null);
const prevPriceRef = useRef<number>(asset.currentPrice);

useEffect(() => {
  if (!cardRef.current) return;
  const direction = asset.currentPrice > prevPriceRef.current ? 'up' : 'down';
  prevPriceRef.current = asset.currentPrice;

  const color = direction === 'up' ? '#16a34a' : '#dc2626'; // green-600 / red-600
  gsap.fromTo(
    cardRef.current,
    { backgroundColor: color + '33' },  // 20% opacity
    { backgroundColor: 'transparent', duration: 0.5, ease: 'power2.out' }
  );
}, [asset.currentPrice]);
```

### Modal Scale (TradeModal)

```typescript
const modalRef = useRef<HTMLDivElement>(null);

// On open:
useEffect(() => {
  if (isOpen && modalRef.current) {
    gsap.fromTo(
      modalRef.current,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.4)' }
    );
  }
}, [isOpen]);

// On close (called before onClose callback):
const handleClose = () => {
  if (modalRef.current) {
    gsap.to(modalRef.current, {
      scale: 0.85,
      opacity: 0,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: onClose,
    });
  } else {
    onClose();
  }
};
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Assets fetch fails | MarketStore `error` set; page shows error message + Retry button that calls `fetchAssets()` again |
| Portfolio fetch fails | PortfolioStore `error` set; portfolio area shows error + Retry |
| Trade submission fails | TradeModal displays API error message inline; modal stays open |
| Watchlist fetch fails | WatchlistPanel shows error + retry button |
| Unknown route | `app/not-found.tsx` renders 404 with link back to `/` |
| RealtimeEngine price drift | Clamped in engine; store never receives out-of-bounds value |

Error state is reset before each retry attempt (`setError(null)` then re-fetch).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property-based testing is applicable here because the core trading logic (price simulation, trade execution, store reducers, watchlist management) consists of pure functions with clear input/output behavior and universal invariants that hold across a wide input space.

### Property 1: Price positivity

*For any* symbol and any positive initial price, every price value emitted by `RealtimeEngine` over any number of ticks SHALL be strictly greater than zero.

**Validates: Requirements 3.2**

---

### Property 2: Price bounds

*For any* symbol and any positive initial price `P`, every price value emitted by `RealtimeEngine` SHALL fall within the range `[P * 0.5, P * 1.5]`.

**Validates: Requirements 3.3**

---

### Property 3: Interval deduplication

*For any* symbol, calling `startPriceUpdate` one or more times SHALL result in exactly one active interval for that symbol in the engine's internal map.

**Validates: Requirements 3.5, 3.6**

---

### Property 4: Trade cash invariant

*For any* valid BUY trade where `cash >= quantity * price`, the portfolio cash after the trade SHALL equal `cash_before - (quantity * price)`. *For any* valid SELL trade where `holding.quantity >= sellQuantity`, the portfolio cash after the trade SHALL equal `cash_before + (sellQuantity * price)`.

**Validates: Requirements 4.1, 5.1, 17.3, 17.4**

---

### Property 5: BUY holding correctness

*For any* BUY trade on a new symbol, the resulting Holding SHALL have `averagePrice == price`, `quantity == quantity`, and `totalCost == quantity * price`. *For any* BUY trade on an existing Holding, the resulting Holding SHALL have `averagePrice == (oldTotalCost + newTotal) / (oldQuantity + newQuantity)` and `totalCost == oldTotalCost + newTotal`.

**Validates: Requirements 4.2, 4.3, 4.4**

---

### Property 6: Trade rejection invariants

*For any* BUY trade where `quantity * price > cash`, the API SHALL reject with HTTP 400. *For any* SELL trade where the symbol is not in the portfolio, the API SHALL reject with HTTP 400. *For any* SELL trade where `sellQuantity > holding.quantity`, the API SHALL reject with HTTP 400.

**Validates: Requirements 4.5, 5.3, 5.4**

---

### Property 7: Portfolio totalValue invariant

*For any* portfolio state, `portfolio.totalValue` SHALL equal `portfolio.cash + sum(holding.quantity * holding.currentPrice)` for all holdings, where `currentPrice` is sourced from the MarketStore (not `averagePrice`).

**Validates: Requirements 6.1, 6.4, 17.2**

---

### Property 8: Watchlist deduplication

*For any* watchlist and any symbol already present in it, adding that symbol again SHALL produce a watchlist with the same length as before the add operation.

**Validates: Requirements 7.3, 17.5**

---

### Property 9: Watchlist round-trip

*For any* watchlist and any symbol, adding that symbol then removing it SHALL produce a watchlist with the same set of symbols as the original (order-independent).

**Validates: Requirements 7.4, 17.6**

---

### Property 10: Chart data point count

*For any* timeframe in `{1H, 24H, 7D, 1M, 1Y}`, the array returned by `generateChartData` SHALL have exactly the specified number of points: 1H→60, 24H→24, 7D→7, 1M→30, 1Y→52.

**Validates: Requirements 9.6**

---

### Property 11: Throttle update rate

*For any* `throttleMs > 0` and any burst of N price ticks emitted in a window of T milliseconds, the number of times `updateAsset` is called in the MarketStore SHALL be no more than `ceil(T / throttleMs) + 1`.

**Validates: Requirements 11.2, 11.3**

---

### Property 12: Transaction total integrity

*For any* transaction, `transaction.total` SHALL equal `transaction.quantity * transaction.price`.

**Validates: Requirements 16.3, 16.5**

---

### Property 13: Transaction sort order

*For any* set of transactions returned by `GET /api/transactions`, each transaction's `timestamp` SHALL be greater than or equal to the `timestamp` of the next transaction in the array (descending order).

**Validates: Requirements 16.4**

---

### Property 14: MarketStore update isolation

*For any* MarketStore state containing multiple assets, calling `updateAsset(symbolA, updates)` SHALL leave all assets with `symbol !== symbolA` with identical field values to before the update.

**Validates: Requirements 17.1**

---

## Testing Strategy

### Property-Based Testing Library

Use **fast-check** (TypeScript-native, works with Jest/Vitest):

```bash
pnpm add -D fast-check vitest @vitest/coverage-v8
```

Each property test runs a minimum of 100 iterations. Tests are tagged with a comment referencing the design property:

```typescript
// Feature: trading-dashboard-refactor, Property 4: Trade cash invariant
it('BUY deducts exact cash amount', () => {
  fc.assert(fc.property(
    fc.float({ min: 0.01, max: 10000 }),   // quantity
    fc.float({ min: 0.01, max: 100000 }),  // price
    (quantity, price) => {
      const cash = quantity * price * 1.5; // always sufficient
      const result = applyBuyTrade({ cash, assets: [] }, { quantity, price, symbol: 'TEST' });
      expect(result.cash).toBeCloseTo(cash - quantity * price, 5);
    }
  ), { numRuns: 100 });
});
```

### Unit Tests (example-based)

Focus on:
- Specific API route responses (correct HTTP status codes)
- Empty state rendering (TransactionList with 0 items)
- Error state rendering (retry button appears on fetch failure)
- GSAP animation calls (mock gsap, assert `gsap.fromTo` called with correct color)
- Nav link active state (usePathname mock)

### Integration Tests

- Full BUY/SELL flow against a test MongoDB instance
- Watchlist GET/POST/DELETE sequence
- Portfolio totalValue after a trade (verifies the averagePrice bug is fixed)

### Test File Structure

```
__tests__/
  unit/
    realtime.test.ts          ← Properties 1, 2, 3, 11
    store.test.ts             ← Properties 7, 8, 9, 14
    trade-logic.test.ts       ← Properties 4, 5, 6
    chart-data.test.ts        ← Property 10
    transaction.test.ts       ← Properties 12, 13
  integration/
    trade-api.test.ts
    portfolio-api.test.ts
    watchlist-api.test.ts
```
