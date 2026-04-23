'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Asset, Portfolio } from '@/lib/store';

interface TradeModalProps {
  isOpen: boolean;
  asset: Asset | null;
  type: 'BUY' | 'SELL';
  portfolio: Portfolio | null;
  onClose: () => void;
  onSubmit: (quantity: number) => Promise<void>;
}

export function TradeModal({ isOpen, asset, type, portfolio, onClose, onSubmit }: TradeModalProps) {
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.4)' }
      );
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.85, opacity: 0, duration: 0.15, ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  }, [onClose]);

  if (!asset) return null;

  const numQuantity = parseFloat(quantity) || 0;
  const total = numQuantity * asset.currentPrice;
  const portfolioAsset = portfolio?.assets.find((a) => a.symbol === asset.symbol);
  const maxSell = portfolioAsset?.quantity ?? 0;
  const maxBuy = portfolio ? Math.floor(portfolio.cash / asset.currentPrice) : 0;
  const isBuy = type === 'BUY';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!quantity || numQuantity <= 0) { setError('Please enter a valid quantity'); return; }
    if (isBuy && numQuantity > maxBuy) { setError('Insufficient funds'); return; }
    if (!isBuy && numQuantity > maxSell) { setError('Insufficient quantity'); return; }
    setLoading(true);
    try {
      await onSubmit(numQuantity);
      setQuantity('');
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,14,23,0.75)' }}
          onClick={handleClose}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl p-6"
            style={{
              background: 'var(--color-bg-3)',
              border: `1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)`,
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-white)' }}>
                <span style={{ color: isBuy ? '#4ade80' : '#f87171' }}>{type}</span>{' '}
                {asset.symbol}
              </h2>
              <button
                onClick={handleClose}
                className="text-2xl leading-none transition-colors"
                style={{ color: 'var(--color-light)' }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-light)' }}>
                  Quantity
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-2 rounded-lg focus:outline-none"
                  style={{
                    background: 'var(--color-bg-4)',
                    border: '1px solid var(--color-bg-4)',
                    color: 'var(--color-white)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-bg-4)')}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-light)' }}>
                  {isBuy
                    ? `Max: ${maxBuy} units ($${portfolio?.cash.toFixed(2)} available)`
                    : `Max: ${maxSell} units`}
                </p>
              </div>

              {/* Order preview */}
              <div
                className="rounded-lg p-4"
                style={{ background: 'var(--color-bg-4)', border: '1px solid var(--color-bg-4)' }}
              >
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--color-light)' }}>Price per unit:</span>
                  <span className="font-semibold" style={{ color: 'var(--color-white)' }}>
                    ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-light)' }}>Total:</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {error && (
                <div
                  className="text-sm rounded-lg px-3 py-2"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button" onClick={handleClose}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{ background: 'var(--color-bg-4)', color: 'var(--color-white)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: isBuy ? '#16a34a' : '#dc2626',
                    color: 'var(--color-white)',
                  }}
                >
                  {loading ? 'Processing…' : type}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
