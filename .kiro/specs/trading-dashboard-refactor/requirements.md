# Requirements Document

## Introduction

This spec covers the refactor and improvement of the Pure Technique trading dashboard — a Next.js App Router application that simulates real-time stock and crypto trading. The codebase is functional at an MVP level but has structural gaps, missing PRD features, performance risks, and maintainability issues that must be addressed without changing user-visible functionality.

The goals are:
1. Align the implementation with the PRD (missing pages, components, and features)
2. Fix identified bugs (portfolio value calculation, duplicate CSS)
3. Improve architecture (page routing, store separation, component decomposition)
4. Add performance optimizations (throttled updates, memoization, virtualized lists)
5. Integrate GSAP animations and proper WebSocket client infrastructure
6. Establish correctness properties for the core trading and state logic

---

## Glossary

- **Dashboard**: The main trading UI at `/` (currently a single-page tab layout)
- **Asset**: A tradeable instrument (stock or crypto) with a symbol, price, and 24h metrics
- **Portfolio**: The user's collection of holdings and available cash balance
- **Holding**: A single asset position within the Portfolio (symbol, quantity, averagePrice, totalCost)
- **Transaction**: A completed BUY or SELL record persisted to MongoDB
- **Watchlist**: A user-curated list of Asset symbols for quick monitoring
- **RealtimeEngine**: The client-side class in `lib/realtime.ts` that simulates price updates via `setInterval`
- **MarketStore**: The Zustand store slice managing `Asset[]` state (`useMarketStore`)
- **PortfolioStore**: The Zustand store slice managing `Portfolio` state (`usePortfolioStore`)
- **TransactionsStore**: The Zustand store slice managing `Transaction[]` state (`useTransactionsStore`)
- **UIStore**: The Zustand store slice managing modal visibility and selected asset (`useUIStore`)
- **TradeModal**: The buy/sell confirmation modal component
- **AssetCard**: The card component displaying a single asset's price and 24h change
- **AssetChart**: The Recharts line chart component for price history
- **PortfolioCard**: The component displaying portfolio overview, holdings, and P&L
- **PriceTicker**: A missing component (per PRD) that displays a live scrolling price feed
- **TransactionList**: A missing component (per PRD) for rendering transaction history
- **WatchlistPanel**: A missing component (per PRD) for the watchlist with search
- **GSAP**: GreenSock Animation Platform — required for price flash and modal transition animations
- **Throttle**: Rate-limiting a function so it fires at most once per interval
- **Debounce**: Delaying a function call until a quiet period has elapsed
- **P&L**: Profit and Loss — the unrealized gain or loss on a holding
- **OHLC**: Open, High, Low, Close — the four price points required for candlestick charts
- **Timeframe**: A chart time range selector (1H, 24H, 7D, 1M, 1Y)

---

## Requirements

### Requirement 1: Page Routing and Navigation Structure

**User Story:** As a senior engineer, I want the dashboard to use proper Next.js App Router page routing, so that each major view has its own URL, is independently navigable, and follows Next.js conventions.

#### Acceptance Criteria

1. THE Dashboard SHALL render a persistent navigation header linking to `/` (Market), `/portfolio`, and `/history`
2. WHEN a user navigates to `/portfolio`, THE Dashboard SHALL render the portfolio overview page
3. WHEN a user navigates to `/history`, THE Dashboard SHALL render the transaction history page
4. WHEN a user navigates to `/asset/[symbol]`, THE Dashboard SHALL render the asset detail page for that symbol
5. THE Dashboard SHALL replace the current single-page tab implementation in `app/page.tsx` with dedicated `app/portfolio/page.tsx`, `app/history/page.tsx`, and `app/asset/[symbol]/page.tsx` files
6. IF a user navigates to an unknown route, THEN THE Dashboard SHALL render a 404 page with a link back to `/`

---

### Requirement 2: Duplicate CSS Elimination

**User Story:** As a senior engineer, I want a single canonical CSS entry point, so that style changes are not silently overridden by a duplicate file.

#### Acceptance Criteria

1. THE Dashboard SHALL have exactly one `globals.css` file, located at `app/globals.css`
2. THE Dashboard SHALL remove `styles/globals.css` and update any imports that reference it
3. WHEN the application builds, THE Dashboard SHALL produce no CSS import warnings related to duplicate global stylesheets

---

### Requirement 3: Real-Time Price Simulation Correctness

**User Story:** As a senior engineer, I want the RealtimeEngine to produce price movements that are numerically stable and bounded, so that the UI never displays negative or wildly unrealistic prices.

#### Acceptance Criteria

1. WHEN `startPriceUpdate` is called with a valid symbol and positive `currentPrice`, THE RealtimeEngine SHALL emit price updates at the specified interval
2. WHEN a price update is emitted, THE RealtimeEngine SHALL emit a price value greater than zero
3. WHEN a price update is emitted, THE RealtimeEngine SHALL emit a price within ±50% of the initial `currentPrice` over any 60-second window
4. WHEN `stopAll` is called, THE RealtimeEngine SHALL clear all active intervals and emit no further updates
5. WHEN `startPriceUpdate` is called for a symbol that already has an active interval, THE RealtimeEngine SHALL stop the previous interval before starting a new one
6. FOR ALL symbols, calling `stopPriceUpdate(symbol)` followed by `startPriceUpdate(symbol, ...)` SHALL result in exactly one active interval for that symbol

---

### Requirement 4: Trade Execution — BUY Correctness

**User Story:** As a trader, I want BUY orders to correctly deduct cash and update my holdings, so that my portfolio accurately reflects every purchase.

#### Acceptance Criteria

1. WHEN a BUY trade is submitted with `symbol`, `quantity`, and `price`, THE Trade_API SHALL deduct `quantity * price` from the portfolio's cash balance
2. WHEN a BUY trade is submitted for a symbol not yet in the portfolio, THE Trade_API SHALL add a new Holding with `averagePrice = price`, `quantity = quantity`, and `totalCost = quantity * price`
3. WHEN a BUY trade is submitted for a symbol already in the portfolio, THE Trade_API SHALL update the Holding's `averagePrice` to `(oldTotalCost + newTotal) / (oldQuantity + newQuantity)`
4. WHEN a BUY trade is submitted for a symbol already in the portfolio, THE Trade_API SHALL update the Holding's `totalCost` to `oldTotalCost + newTotal`
5. IF the portfolio's cash balance is less than `quantity * price`, THEN THE Trade_API SHALL reject the trade with HTTP 400 and an "Insufficient funds" error
6. FOR ALL valid BUY trades, the portfolio's `totalValue` after the trade SHALL equal `cash_after + sum(holding.quantity * holding.averagePrice)` for all holdings

---

### Requirement 5: Trade Execution — SELL Correctness

**User Story:** As a trader, I want SELL orders to correctly credit cash and reduce my holdings, so that my portfolio accurately reflects every sale.

#### Acceptance Criteria

1. WHEN a SELL trade is submitted with `symbol`, `quantity`, and `price`, THE Trade_API SHALL add `quantity * price` to the portfolio's cash balance
2. WHEN a SELL trade reduces a Holding's quantity to zero, THE Trade_API SHALL remove that Holding from the portfolio's assets array
3. IF the portfolio does not contain a Holding for the given symbol, THEN THE Trade_API SHALL reject the trade with HTTP 400 and an "Asset not found in portfolio" error
4. IF the Holding's quantity is less than the requested sell quantity, THEN THE Trade_API SHALL reject the trade with HTTP 400 and an "Insufficient quantity to sell" error
5. FOR ALL valid SELL trades, the portfolio's cash balance after the trade SHALL equal `cash_before + (quantity * price)`

---

### Requirement 6: Portfolio Value Invariant

**User Story:** As a trader, I want my displayed portfolio total value to always be accurate, so that I can make informed trading decisions.

#### Acceptance Criteria

1. THE Portfolio_API SHALL calculate `totalValue` as `cash + sum(holding.quantity * holding.currentPrice)` for all holdings, using the current market price — not `averagePrice`
2. WHEN asset prices update via the RealtimeEngine, THE PortfolioStore SHALL recalculate `totalValue` using the latest `currentPrice` from the MarketStore
3. THE PortfolioCard SHALL display `totalValue` that matches `cash + holdingsValue` as computed from live prices
4. FOR ALL portfolio states, `totalValue` SHALL equal `cash + sum(quantity * currentPrice)` where `currentPrice` is sourced from the MarketStore

---

### Requirement 7: Watchlist Management

**User Story:** As a trader, I want to add and remove assets from my watchlist, so that I can monitor the assets I care about most.

#### Acceptance Criteria

1. WHEN a user adds a symbol to the watchlist, THE Watchlist_API SHALL persist the symbol and return the updated watchlist
2. WHEN a user removes a symbol from the watchlist, THE Watchlist_API SHALL remove the symbol and return the updated watchlist
3. WHEN a user adds a symbol that is already in the watchlist, THE Watchlist_API SHALL return the watchlist unchanged (no duplicate)
4. FOR ALL watchlists, adding then removing the same symbol SHALL return a watchlist equivalent to the original
5. WHEN a user searches the watchlist with a query string, THE WatchlistPanel SHALL filter displayed assets to those whose symbol or name contains the query, with a 300ms debounce
6. IF the watchlist fetch fails, THEN THE WatchlistPanel SHALL display an error message with a retry button

---

### Requirement 8: Missing UI Components

**User Story:** As a senior engineer, I want all PRD-specified components to exist and be integrated, so that the UI is complete and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL include a `WatchlistPanel` component that renders the user's watchlist with add/remove controls and a debounced search input
2. THE Dashboard SHALL include a `TransactionList` component that renders transaction history in a table with columns: Asset, Type, Quantity, Price, Total, Date
3. THE Dashboard SHALL include a `PriceTicker` component that displays a horizontally scrolling live price feed for all assets
4. WHEN the `TransactionList` receives an empty transactions array, THE TransactionList SHALL display an empty state message
5. WHEN the `PriceTicker` receives asset price updates, THE PriceTicker SHALL reflect the updated price within one render cycle

---

### Requirement 9: Chart Timeframes and Candlestick Support

**User Story:** As a trader, I want to view price history across multiple timeframes and in candlestick format, so that I can perform technical analysis.

#### Acceptance Criteria

1. THE AssetChart SHALL support timeframe selection: 1H, 24H, 7D, 1M, 1Y
2. WHEN a timeframe is selected, THE AssetChart SHALL generate or fetch chart data covering the selected period
3. THE AssetChart SHALL support a chart type toggle between "Line" and "Candlestick"
4. WHEN "Candlestick" is selected, THE AssetChart SHALL render OHLC data points using a candlestick chart component
5. WHEN "Line" is selected, THE AssetChart SHALL render price data as a line chart
6. FOR ALL timeframes, the number of data points SHALL be appropriate to the period: 1H → 60 points (1-min intervals), 24H → 24 points (1-hour intervals), 7D → 7 points (daily), 1M → 30 points (daily), 1Y → 52 points (weekly)

---

### Requirement 10: GSAP Animation Integration

**User Story:** As a senior engineer, I want GSAP animations for price flashes and modal transitions, so that the UI communicates price changes and interactions with appropriate visual feedback.

#### Acceptance Criteria

1. THE Dashboard SHALL install and configure GSAP as a dependency
2. WHEN an asset's price increases, THE AssetCard SHALL flash green using a GSAP animation for 500ms
3. WHEN an asset's price decreases, THE AssetCard SHALL flash red using a GSAP animation for 500ms
4. WHEN the TradeModal opens, THE TradeModal SHALL use a GSAP scale-in animation
5. WHEN the TradeModal closes, THE TradeModal SHALL use a GSAP scale-out animation
6. THE Dashboard SHALL retain Framer Motion for page-level enter/exit transitions and use GSAP exclusively for price flash and modal animations

---

### Requirement 11: Performance — Throttled Price Updates

**User Story:** As a senior engineer, I want price updates to be throttled before reaching the Zustand store, so that excessive re-renders do not degrade UI performance.

#### Acceptance Criteria

1. THE RealtimeEngine SHALL accept a `throttleMs` parameter (default: 500ms) that limits how frequently `updateAsset` is called in the MarketStore
2. WHEN the RealtimeEngine emits updates faster than `throttleMs`, THE MarketStore SHALL receive at most one update per `throttleMs` interval per symbol
3. FOR ALL symbols, given N price ticks in a window of T milliseconds, THE MarketStore SHALL receive no more than `ceil(T / throttleMs) + 1` updates for that symbol
4. WHEN `throttleMs` is set to 0, THE RealtimeEngine SHALL apply no throttling and pass every update to the store

---

### Requirement 12: Performance — Memoized Components

**User Story:** As a senior engineer, I want list-rendering components to be memoized, so that price updates for one asset do not re-render unrelated asset cards.

#### Acceptance Criteria

1. THE AssetCard component SHALL be wrapped with `React.memo` to prevent re-renders when its props have not changed
2. THE TransactionList component SHALL be wrapped with `React.memo`
3. THE PortfolioCard component SHALL be wrapped with `React.memo`
4. WHEN the MarketStore updates a single asset's price, THE Dashboard SHALL re-render only the AssetCard for that specific symbol

---

### Requirement 13: Performance — Virtualized Lists

**User Story:** As a senior engineer, I want long asset and transaction lists to be virtualized, so that the DOM does not grow unbounded as the number of items increases.

#### Acceptance Criteria

1. WHEN the asset list contains more than 20 items, THE Dashboard SHALL render the list using a virtualized scroll container
2. WHEN the transaction history contains more than 50 items, THE TransactionList SHALL render using a virtualized scroll container
3. THE Dashboard SHALL use a virtualization library (e.g., `@tanstack/react-virtual`) for list rendering
4. WHEN a virtualized list is scrolled, THE Dashboard SHALL render only the visible items plus a configurable overscan buffer

---

### Requirement 14: Error and Loading States

**User Story:** As a trader, I want clear feedback when data is loading or when an error occurs, so that I always know the state of the application.

#### Acceptance Criteria

1. WHILE assets are loading, THE Dashboard SHALL display a loading spinner in the asset list area
2. WHILE the portfolio is loading, THE Dashboard SHALL display a loading skeleton in the portfolio area
3. IF the assets fetch fails, THEN THE Dashboard SHALL display an error message with a "Retry" button that re-triggers the fetch
4. IF the portfolio fetch fails, THEN THE Dashboard SHALL display an error message with a "Retry" button
5. IF a trade submission fails, THEN THE TradeModal SHALL display the error message returned by the API without closing the modal
6. WHEN a retry is triggered, THE Dashboard SHALL reset the error state and re-attempt the failed fetch

---

### Requirement 15: Centralized User Context

**User Story:** As a senior engineer, I want the hardcoded `userId` to be centralized in one place, so that adding authentication later requires a single change point.

#### Acceptance Criteria

1. THE Dashboard SHALL define a single `DEFAULT_USER_ID` constant in `lib/constants.ts`
2. ALL API routes SHALL import and use `DEFAULT_USER_ID` from `lib/constants.ts` instead of inline string literals
3. WHEN `DEFAULT_USER_ID` is changed in `lib/constants.ts`, ALL API routes SHALL use the updated value without further code changes

---

### Requirement 16: Transaction Record Integrity

**User Story:** As a trader, I want every completed trade to produce a persisted transaction record, so that my history is always accurate and complete.

#### Acceptance Criteria

1. WHEN a BUY trade is successfully executed, THE Trade_API SHALL create and persist a Transaction record with `type: 'BUY'`, correct `symbol`, `quantity`, `price`, and `total`
2. WHEN a SELL trade is successfully executed, THE Trade_API SHALL create and persist a Transaction record with `type: 'SELL'`, correct `symbol`, `quantity`, `price`, and `total`
3. THE Transaction record's `total` field SHALL equal `quantity * price`
4. WHEN the transaction history is fetched, THE Transactions_API SHALL return records sorted by `timestamp` descending (newest first)
5. FOR ALL transactions, `transaction.total` SHALL equal `transaction.quantity * transaction.price`

---

### Requirement 17: Correctness Properties for Store Logic

**User Story:** As a senior engineer, I want property-based tests for the Zustand store reducers and trade logic, so that edge cases in state transitions are caught automatically.

#### Acceptance Criteria

1. FOR ALL asset updates, calling `updateAsset(symbolA, updates)` SHALL leave all assets with `symbol !== symbolA` unchanged in the MarketStore
2. FOR ALL portfolio states, `portfolio.totalValue` SHALL equal `portfolio.cash + sum(holding.quantity * holding.currentPrice)` after any state update
3. FOR ALL BUY trades where `quantity * price <= cash`, the resulting cash balance SHALL equal `cash - (quantity * price)`
4. FOR ALL SELL trades where `holding.quantity >= sellQuantity`, the resulting cash balance SHALL equal `cash + (sellQuantity * price)`
5. FOR ALL watchlists, adding a symbol that is already present SHALL produce a watchlist with the same length as before the add operation
6. FOR ALL watchlists, adding then removing the same symbol SHALL produce a watchlist with the same symbols as the original (order-independent)
