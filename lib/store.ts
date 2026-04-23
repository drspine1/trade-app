import { create } from 'zustand';

// ─── Data Interfaces ──────────────────────────────────────────────────────────

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

/** A single asset position within a Portfolio. */
export interface Holding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  /** Enriched from MarketStore at runtime — not persisted to MongoDB. */
  currentPrice?: number;
}

/** Completed BUY or SELL record persisted to MongoDB. */
export interface Transaction {
  _id: string;
  userId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  /** Always equals quantity * price. */
  total: number;
  timestamp: string;
}

export interface Portfolio {
  _id?: string;
  userId: string;
  /** Renamed from PortfolioAsset[] for clarity. */
  assets: Holding[];
  cash: number;
  /** Always equals cash + sum(holding.quantity * holding.currentPrice). */
  totalValue: number;
  updatedAt?: string;
}

// ─── Market Store ─────────────────────────────────────────────────────────────

interface MarketState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  setAssets: (assets: Asset[]) => void;
  /** Updates only the matching symbol; all other assets are left unchanged. */
  updateAsset: (symbol: string, updates: Partial<Asset>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  assets: [],
  loading: false,
  error: null,
  setAssets: (assets) => set({ assets }),
  updateAsset: (symbol, updates) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.symbol === symbol ? { ...asset, ...updates } : asset
      ),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// ─── Portfolio Store ──────────────────────────────────────────────────────────

interface PortfolioState {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  setPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (updates: Partial<Portfolio>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolio: null,
  loading: false,
  error: null,
  setPortfolio: (portfolio) => set({ portfolio }),
  updatePortfolio: (updates) =>
    set((state) => ({
      portfolio: state.portfolio ? { ...state.portfolio, ...updates } : null,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// ─── Transactions Store ───────────────────────────────────────────────────────

interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  setTransactions: (transactions: Transaction[]) => void;
  /** Prepends the new transaction so the list stays newest-first. */
  addTransaction: (transaction: Transaction) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  loading: false,
  error: null,
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// ─── UI Store ─────────────────────────────────────────────────────────────────

interface UIState {
  selectedSymbol: string | null;
  showBuyModal: boolean;
  showSellModal: boolean;
  selectedAssetForTrade: Asset | null;
  sessionId: string | null;
  setSelectedSymbol: (symbol: string | null) => void;
  setShowBuyModal: (show: boolean) => void;
  setShowSellModal: (show: boolean) => void;
  setSelectedAssetForTrade: (asset: Asset | null) => void;
  setSessionId: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedSymbol: null,
  showBuyModal: false,
  showSellModal: false,
  selectedAssetForTrade: null,
  sessionId: null,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setShowBuyModal: (show) => set({ showBuyModal: show }),
  setShowSellModal: (show) => set({ showSellModal: show }),
  setSelectedAssetForTrade: (asset) => set({ selectedAssetForTrade: asset }),
  setSessionId: (id) => set({ sessionId: id }),
}));
