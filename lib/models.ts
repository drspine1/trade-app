import mongoose from 'mongoose';

// Asset Schema - Market tradeable assets
const AssetSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  currentPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  marketCap: String,
  change24h: Number,
  changePercent24h: Number,
  volume24h: Number,
  highPrice: Number,
  lowPrice: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Portfolio Schema - User asset holdings
const PortfolioSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'user_default',
  },
  assets: [
    {
      symbol: String,
      quantity: Number,
      averagePrice: Number,
      totalCost: Number,
    },
  ],
  cash: {
    type: Number,
    default: 100000,
  },
  totalValue: {
    type: Number,
    default: 100000,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Transaction Schema - Buy/Sell history
const TransactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'user_default',
  },
  symbol: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Watchlist Schema
const WatchlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'user_default',
  },
  symbols: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Price History Schema - For charts
const PriceHistorySchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Create or get models
export const Asset = mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
export const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', PortfolioSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', WatchlistSchema);
export const PriceHistory = mongoose.models.PriceHistory || mongoose.model('PriceHistory', PriceHistorySchema);
