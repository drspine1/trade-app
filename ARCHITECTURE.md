# Pure Technique - Trading Platform Architecture

## System Overview

Pure Technique is a production-ready trading platform MVP built with Next.js, React, Zustand, and MongoDB. The system simulates real-time trading with a clean architecture that scales from MVP to full production.

### Technology Stack
- **Frontend**: Next.js 14+ with App Router, React 19, TypeScript
- **State Management**: Zustand (lightweight, performant)
- **Styling**: Tailwind CSS with custom color system
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Real-time**: In-memory simulation (upgradable to WebSocket)

---

## Architecture Layers

### 1. **Data Layer** (`/lib/models.ts`)
MongoDB schemas with Mongoose:
- **Asset**: Market tradeable assets (BTC, ETH, AAPL, etc.)
- **Portfolio**: User holdings and cash balance
- **Transaction**: Buy/sell history
- **Watchlist**: User followed assets
- **PriceHistory**: Historical prices for charting

### 2. **State Management** (`/lib/store.ts`)
Four Zustand stores for normalized data flow:

#### Market Store
```typescript
{
  assets: Asset[]
  updateAsset(symbol, updates)
  setLoading/setError
}
```

#### Portfolio Store
```typescript
{
  portfolio: Portfolio
  updatePortfolio(updates)
  setLoading/setError
}
```

#### Transactions Store
```typescript
{
  transactions: Transaction[]
  addTransaction(tx)
}
```

#### UI Store
```typescript
{
  selectedSymbol: string
  showBuyModal: boolean
  showSellModal: boolean
  selectedAssetForTrade: Asset
}
```

### 3. **Real-time Engine** (`/lib/realtime.ts`)
`RealtimeEngine` class simulates realistic price movements:
- Volatility factors per asset
- Trend generation and drift
- 2-second update intervals
- Automatic cleanup on unmount

### 4. **API Routes** (`/app/api/`)

#### `/api/assets`
- **GET**: Fetch all market assets with current prices
- **POST**: Create new asset (admin only in production)
- Initializes with 8 mock assets on first call

#### `/api/portfolio`
- **GET**: Fetch user portfolio with enriched price data
- Returns holdings, cash balance, total value
- Auto-calculates portfolio metrics

#### `/api/trade`
- **POST**: Execute buy/sell trade
- Validates funds (BUY) or quantity (SELL)
- Updates portfolio and creates transaction record
- Atomic operations (next iteration: add transactions)

#### `/api/transactions`
- **GET**: Fetch user transaction history
- Sorted by timestamp (newest first)

#### `/api/watchlist`
- **GET**: Fetch user watchlist with asset data
- **POST**: Add symbol to watchlist
- **DELETE**: Remove symbol from watchlist

### 5. **Hooks Layer** (`/hooks/`)

#### `useAssets()`
- Fetches all market assets
- Starts real-time price updates
- Cleanup on unmount

#### `usePortfolio()`
- Fetches user portfolio
- Syncs portfolio values with price updates
- `executeTrade()` function for buy/sell

#### `useTransactions()`
- Fetches transaction history
- Stays in sync with trades

### 6. **UI Components** (`/components/`)

#### `AssetCard`
- Displays single asset with price, 24h change
- Shows gain/loss color coding (green/red)
- Click to select for trading

#### `AssetChart`
- LineChart with 24-hour mock history
- Real-time price visualization
- Gradient fill based on gain/loss

#### `PortfolioCard`
- Overview of holdings and metrics
- Individual position P&L
- Holdings breakdown with percentages

#### `TradeModal`
- Buy/Sell execution modal
- Validates quantity and funds
- Shows order summary before execution

---

## Folder Structure

```
/vercel/share/v0-project/
├── app/
│   ├── api/
│   │   ├── assets/route.ts
│   │   ├── portfolio/route.ts
│   │   ├── trade/route.ts
│   │   ├── transactions/route.ts
│   │   └── watchlist/route.ts
│   ├── globals.css (Orange, Purple, Dark theme)
│   ├── layout.tsx (Root layout with metadata)
│   └── page.tsx (Main dashboard)
├── components/
│   ├── AssetCard.tsx
│   ├── AssetChart.tsx
│   ├── PortfolioCard.tsx
│   └── TradeModal.tsx
├── hooks/
│   ├── useAssets.ts
│   ├── usePortfolio.ts
│   └── useTransactions.ts
├── lib/
│   ├── mongodb.ts (Mongoose connection)
│   ├── models.ts (Schema definitions)
│   ├── realtime.ts (Price update engine)
│   └── store.ts (Zustand stores)
└── ARCHITECTURE.md (This file)
```

---

## Data Flow

### 1. Asset Price Updates
```
useAssets() hook
  ├── Fetch /api/assets
  ├── setAssets(data)
  ├── startPriceUpdate() for each asset
  │   └── realtimeEngine.startPriceUpdate()
  │       └── Every 2s: updateAsset(symbol, {newPrice})
  └── Cleanup on unmount
```

### 2. Trading Flow
```
User clicks Buy/Sell
  ├── setSelectedAssetForTrade(asset)
  ├── setShowBuyModal(true) or setShowSellModal(true)
  ├── User enters quantity
  ├── handleTrade(quantity)
  │   └── executeTrade(symbol, type, quantity)
  │       └── POST /api/trade
  │           ├── Validate funds/quantity
  │           ├── Update Portfolio document
  │           ├── Create Transaction document
  │           └── Return updated portfolio
  ├── setPortfolio(newPortfolio)
  └── Close modal & reset state
```

### 3. Portfolio Updates
```
Asset prices update (from real-time engine)
  ├── updateAsset triggers
  ├── usePortfolio useEffect detects assets change
  ├── Recalculate holdings value
  ├── updatePortfolio({totalValue, assets})
  └── UI re-renders with new values
```

---

## Database Schema

### Asset
```javascript
{
  symbol: String (unique),
  name: String,
  currentPrice: Number,
  change24h: Number,
  changePercent24h: Number,
  highPrice: Number,
  lowPrice: Number,
  volume24h: Number,
  createdAt: Date
}
```

### Portfolio
```javascript
{
  userId: String,
  assets: [{
    symbol: String,
    quantity: Number,
    averagePrice: Number,
    totalCost: Number,
    currentPrice: Number (runtime)
  }],
  cash: Number,
  totalValue: Number,
  updatedAt: Date
}
```

### Transaction
```javascript
{
  userId: String,
  symbol: String,
  type: 'BUY' | 'SELL',
  quantity: Number,
  price: Number,
  total: Number,
  timestamp: Date
}
```

### Watchlist
```javascript
{
  userId: String,
  symbols: [String],
  createdAt: Date
}
```

### PriceHistory
```javascript
{
  symbol: String,
  price: Number,
  timestamp: Date (indexed)
}
```

---

## Color System

**3-Color Theme (Startup style)**
- **Primary**: Orange (#FF6B35) - Trading actions, highlights
- **Secondary**: Purple (#6D28D9) - Accents, secondary elements
- **Neutral**: Dark Slate (#0F172A, #1E293B) - Background

**Semantic Colors**
- **Gain**: Green (#10B981) - Positive P&L
- **Loss**: Red (#EF4444) - Negative P&L
- **Chart**: Multi-color (green, orange, purple, amber, red)

---

## Scalability Roadmap

### Phase 1: MVP (Current)
- ✅ In-memory price simulation
- ✅ Single user (hardcoded userId)
- ✅ MongoDB for persistence
- ✅ Basic charting with mock history

### Phase 2: Multi-User
- [ ] Authentication (Auth.js / Supabase)
- [ ] User-based data isolation
- [ ] Session management
- [ ] RLS policies in MongoDB

### Phase 3: Real-time
- [ ] WebSocket server (Socket.io / ws)
- [ ] Real-time price feeds (external API)
- [ ] Live order book updates
- [ ] Push notifications

### Phase 4: Advanced Trading
- [ ] Limit orders
- [ ] Stop-loss / Take-profit
- [ ] Advanced charting (TradingView)
- [ ] Technical indicators

### Phase 5: Production
- [ ] Rate limiting
- [ ] API caching (Redis)
- [ ] Transaction queuing
- [ ] Audit logging
- [ ] Compliance (KYC/AML)

---

## Performance Optimizations

1. **State Management**: Zustand (minimal re-renders vs Redux)
2. **Component Isolation**: Hooks handle their own data fetching
3. **Memoization**: Recharts handles its own optimization
4. **Image/Asset Optimization**: Tailwind CSS classes only
5. **Database Indexing**: Timestamps indexed for history queries
6. **Cleanup**: Real-time engine stops on unmount

---

## Security Considerations

### Current (MVP)
- Single user mode (userId hardcoded)
- No authentication
- API validation for trades

### Production Roadmap
- [ ] Auth with JWT/sessions
- [ ] Request validation middleware
- [ ] Rate limiting per user
- [ ] Input sanitization
- [ ] HTTPS only
- [ ] CORS configuration
- [ ] Audit logging

---

## Environment Variables

**Required for MongoDB**
```
MONGODB_URI=mongodb://localhost:27017/trading-platform
```

**Optional**
```
NODE_ENV=production
```

---

## API Response Examples

### GET /api/assets
```json
[{
  "_id": "...",
  "symbol": "BTC",
  "name": "Bitcoin",
  "currentPrice": 45230.50,
  "change24h": 1250.50,
  "changePercent24h": 2.84,
  "highPrice": 46000,
  "lowPrice": 44500,
  "volume24h": 28500000000
}]
```

### GET /api/portfolio
```json
{
  "_id": "...",
  "userId": "user_default",
  "assets": [{
    "symbol": "BTC",
    "quantity": 0.5,
    "averagePrice": 43000,
    "totalCost": 21500,
    "currentPrice": 45230.50
  }],
  "cash": 78500,
  "totalValue": 100230.50,
  "updatedAt": "2024-04-23T..."
}
```

### POST /api/trade
```json
{
  "success": true,
  "portfolio": { ... },
  "transaction": {
    "_id": "...",
    "symbol": "BTC",
    "type": "BUY",
    "quantity": 0.5,
    "price": 45230.50,
    "total": 22615.25,
    "timestamp": "2024-04-23T..."
  }
}
```

---

## Development Notes

1. **MongoDB Local Setup**:
   ```bash
   mongod --dbpath /path/to/data
   ```

2. **Environment Variable**:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/trading-platform
   ```

3. **Real-time Updates**: 2-second intervals can be adjusted in `realtimeEngine.startPriceUpdate()`

4. **Mock Data**: Assets initialized on first /api/assets call

5. **User Context**: Currently hardcoded as 'user_default' - prepare for auth integration

---

## Testing Strategy

### Unit Tests
- Zustand store logic
- Realtime engine calculations
- Trade validation (funds, quantity)

### Integration Tests
- API routes with mock database
- Trade execution flow
- Portfolio calculations

### E2E Tests
- Buy/sell workflow
- Portfolio updates
- Transaction history

---

## Deployment

### Vercel
```bash
vercel deploy
```

### Environment Setup
1. Set `MONGODB_URI` in Vercel dashboard
2. Ensure MongoDB cloud instance or proxy
3. Deploy and test

### Alternative: Self-hosted
1. Containerize with Docker
2. Deploy to AWS/GCP/DigitalOcean
3. Use managed MongoDB Atlas

---

## Support & Future Enhancements

### Immediate Priorities
1. Authentication & multi-user
2. Real WebSocket integration
3. Advanced charting features

### Long-term Vision
- Mobile app (React Native)
- Trading bot API
- Social trading features
- AI-powered recommendations

---

*Last Updated: April 23, 2024*
*Architecture Version: 1.0 (MVP)*
