'use client';

import { useSession } from '@/hooks/useSession';

/**
 * Mounts the session ID initializer.
 * Rendered once in the root layout — no UI output.
 */
export function SessionProvider() {
  useSession();
  return null;
}
