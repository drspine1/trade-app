'use client';

import { useEffect, useCallback } from 'react';
import { useTransactionsStore } from '@/lib/store';

export function useTransactions() {
  const { transactions, loading, error, setTransactions, setLoading, setError } =
    useTransactionsStore();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }

      // Guard: API must return an array
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [setTransactions, setLoading, setError]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error };
}
