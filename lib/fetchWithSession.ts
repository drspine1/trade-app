import { getSessionId } from '@/lib/session';

/**
 * Wrapper around fetch that automatically injects the x-session-id header.
 * Falls back to 'anonymous' if session hasn't been initialized yet.
 */
export function fetchWithSession(url: string, options: RequestInit = {}): Promise<Response> {
  const sessionId = getSessionId() ?? 'anonymous';
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-session-id': sessionId,
    },
  });
}
