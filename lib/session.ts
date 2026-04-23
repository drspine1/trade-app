/**
 * Browser session management.
 * Generates a random UUID on first visit and persists it in localStorage.
 * Falls back to sessionStorage if localStorage quota is exceeded.
 * Each browser gets its own isolated portfolio, watchlist, and transactions.
 */

const SESSION_KEY = 'pt_session_id';

function trySetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage quota exceeded — fall back to sessionStorage
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Both storages full — session will be in-memory only (non-persistent)
    }
  }
}

function tryGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';

  let id = tryGetItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    trySetItem(SESSION_KEY, id);
  }
  return id;
}

export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return tryGetItem(SESSION_KEY);
}
