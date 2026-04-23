'use client';

import { useEffect } from 'react';
import { getOrCreateSessionId } from '@/lib/session';
import { useUIStore } from '@/lib/store';

/**
 * Initializes the browser session ID on first mount.
 * Must be called once at the app root (layout).
 */
export function useSession() {
  const setSessionId = useUIStore((s) => s.setSessionId);

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
  }, [setSessionId]);
}
