# Pure Technique - Setup & Deployment Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- pnpm (or npm/yarn)

### Installation

1. **Clone/Setup the project**
```bash
cd /vercel/share/v0-project
pnpm install
```

2. **MongoDB Connection**

**Option A: Local MongoDB**
```bash
# Install MongoDB locally (macOS with Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify it's running
mongosh
```

**Option B: MongoDB Atlas (Cloud)**
```bash
# Go to mongodb.com/cloud/atlas
# Create a free cluster
# Get your connection string: mongodb+srv://username:password@cluster.mongodb.net/trading-platform?retryWrites=true
```

3. **Environment Setup**
```bash
# Create .env.local
echo "MONGODB_URI=mongodb://localhost:27017/trading-platform" > .env.local

# Or for MongoDB Atlas:
echo "MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trading-platform?retryWrites=true" > .env.local
```

4. **Run Development Server**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure Quick Reference

```
project/
├── app/
│   ├── api/              # 5 API routes for data
│   ├── page.tsx          # Main dashboard (331 lines)
│   ├── layout.tsx        # Root layout with styling
│   └── globals.css       # Tailwind + color system
├── components/           # 4 reusable UI components
│   ├── AssetCard.tsx
│   ├── AssetChart.tsx
│   ├── PortfolioCard.tsx
│   └── TradeModal.tsx
├── hooks/                # 3 data-fetching hooks
│   ├── useAssets.ts
│   ├── usePortfolio.ts
│   └── useTransactions.ts
├── lib/
│   ├── mongodb.ts        # Mongoose connection
│   ├── models.ts         # 5 MongoDB schemas
│   ├── realtime.ts       # Price update engine
│   └── store.ts          # 4 Zustand stores
├── ARCHITECTURE.md       # Complete technical docs
└── SETUP.md              # This file
```

---

## Feature Walkthrough

### 1. Market Tab
- Browse all 8 tradeable assets (BTC, ETH, AAPL, etc.)
- Real-time price updates every 2 seconds
- 24-hour price chart with gain/loss visualization
- Buy/Sell buttons for selected asset
- Asset statistics (24h high/low, volume)

### 2. Portfolio Tab
- Total portfolio value with P&L
- Individual holdings with unrealized gains
- Cash balance available for trading
- Diversification indicator
- Holdings list with position details

### 3. History Tab
- Complete transaction log
- Buy/Sell trade records
- Price, quantity, total for each trade
- Timestamps with precise execution time

### 4. Real-time Engine
- Simulates realistic price movements
- Different volatility per asset (BTC: 3%, AAPL: 1%)
- Trend generation and drift
- Auto-stops on component unmount

---

## API Endpoints

### Market Data
```
GET  /api/assets          → All tradeable assets
POST /api/assets          → Create new asset (admin)
```

### Portfolio Management
```
GET  /api/portfolio       → User holdings & cash
```

### Trading
```
POST /api/trade           → Execute buy/sell
```

### History
```
GET  /api/transactions    → Transaction history
```

### Watchlist
```
GET    /api/watchlist     → Get watchlist
POST   /api/watchlist     → Add to watchlist
DELETE /api/watchlist     → Remove from watchlist
```

---

## Testing the App

### 1. Initial Load
- Assets load from MongoDB (or initialize with 8 mock assets)
- Portfolio loads with $100,000 cash
- Real-time updates start automatically

### 2. Buy Trade
1. Select an asset (BTC, ETH, etc.)
2. Click "Buy [Symbol]"
3. Enter quantity (e.g., 0.5)
4. Click "BUY"
5. Verify portfolio updates with new holding

### 3. Sell Trade
1. Select an asset you own
2. Click "Sell [Symbol]"
3. Enter quantity (less than or equal to holding)
4. Click "SELL"
5. Verify position reduced or removed

### 4. Monitor P&L
- As prices update in real-time, P&L changes
- Green = gain, Red = loss
- Percentages calculate dynamically

---

## Customization

### Change Asset List
Edit `/app/api/assets/route.ts` - `MOCK_ASSETS` array:
```typescript
const MOCK_ASSETS = [
  {
    symbol: 'YOUR_ASSET',
    name: 'Your Asset Name',
    currentPrice: 100.00,
    // ... other fields
  }
]
```

### Adjust Price Update Speed
Edit `/hooks/useAssets.ts`:
```typescript
realtimeEngine.startPriceUpdate(
  asset.symbol,
  asset.currentPrice,
  callback,
  5000  // Change from 2000ms to 5000ms
)
```

### Change Initial Cash
Edit `/app/api/portfolio/route.ts`:
```typescript
const newPortfolio = new Portfolio({
  userId,
  assets: [],
  cash: 500000,  // Change from 100,000 to 500,000
  totalValue: 500000,
});
```

### Modify Colors
Edit `/app/globals.css`:
```css
:root {
  --primary: #ff6b35;      /* Orange */
  --secondary: #6d28d9;    /* Purple */
  --background: #0f172a;   /* Dark Blue */
}
```

---

## Deployment to Vercel

### 1. Connect Repository
```bash
# Push to GitHub
git add .
git commit -m "Initial Pure Technique commit"
git push origin main
```

### 2. Deploy on Vercel
```bash
# Option A: Using Vercel CLI
vercel deploy

# Option B: via vercel.com
# 1. Go to vercel.com/new
# 2. Import your GitHub repo
# 3. Set environment variables
# 4. Deploy
```

### 3. Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
```
MONGODB_URI = mongodb+srv://...
```

### 4. Redeploy
```bash
vercel deploy --prod
```

---

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Start MongoDB locally or check your MONGODB_URI

### Assets Not Loading
```
Error: Failed to fetch assets
```
**Solution**: Check MongoDB is running and MONGODB_URI is correct

### Portfolio Shows $0
```
Problem: Portfolio not initializing
```
**Solution**: Try refreshing page or check MongoDB documents

### Real-time Prices Not Updating
```
Problem: Prices stuck at initial value
```
**Solution**: Check browser console for errors, verify component mounted

### Modal Won't Close
```
Problem: Buy/Sell modal stuck open
```
**Solution**: Check showBuyModal/showSellModal state in UI store

---

## Performance Tips

1. **Database Indexes**: MongoDB already indexes `_id` and `timestamp`
2. **Caching**: Consider adding Redis for price caching (Phase 2)
3. **Image Optimization**: Use next/image for any future images
4. **Code Splitting**: Already using Next.js dynamic imports
5. **Monitor Bundle Size**: `npm run build && npm run analyze`

---

## Security Checklist (MVP → Production)

- [ ] Add authentication (Auth.js or Supabase)
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Enable HTTPS
- [ ] Configure CORS
- [ ] Add audit logging
- [ ] Validate all inputs
- [ ] Sanitize database queries
- [ ] Use environment variables for secrets
- [ ] Set up monitoring (Sentry, LogRocket)

---

## Monitoring & Analytics

### Suggested Tools
- **Error Tracking**: Sentry
- **Analytics**: PostHog or Vercel Analytics
- **Performance**: Web Vitals
- **Database Monitoring**: MongoDB Atlas Dashboard

### Add Monitoring
```bash
pnpm add @sentry/nextjs
# Configure in next.config.mjs
```

---

## Database Backups

### MongoDB Atlas (Cloud)
- Automatic daily backups (free tier)
- Manual snapshots available
- 30-day retention

### Local MongoDB
```bash
# Backup
mongodump --out ./backup

# Restore
mongorestore ./backup
```

---

## Scaling Considerations

### MVP → 100 Users
- Current setup handles fine
- Single MongoDB instance sufficient
- Add rate limiting (~100 req/min per user)

### 100 → 10,000 Users
- Add Redis for caching
- Implement connection pooling
- Consider MongoDB sharding
- Add API throttling & queuing

### 10,000+ Users
- Microservices architecture
- Distributed WebSocket servers
- Real-time feed from data providers
- Advanced caching (CDN for assets)

---

## Next Steps

1. **Verify Setup**: Open app in browser, test buy/sell
2. **Customize**: Change assets, colors, initial cash
3. **Deploy**: Push to Vercel with MongoDB Atlas
4. **Iterate**: Add features from roadmap
5. **Monitor**: Set up error tracking & analytics

---

## Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **MongoDB**: https://docs.mongodb.com
- **Mongoose**: https://mongoosejs.com
- **Tailwind**: https://tailwindcss.com

---

*Last Updated: April 23, 2024*
*Setup Version: 1.0*
