import { NextRequest } from 'next/server';
import { DEFAULT_USER_ID } from '@/lib/constants';

/**
 * Extracts the user/session ID from the request.
 * Reads x-session-id header sent by the browser.
 * Falls back to DEFAULT_USER_ID for backwards compatibility.
 */
export function getUserId(request: NextRequest): string {
  const sessionId = request.headers.get('x-session-id');
  if (sessionId && sessionId !== 'anonymous' && sessionId.length > 0) {
    return sessionId;
  }
  return DEFAULT_USER_ID;
}
