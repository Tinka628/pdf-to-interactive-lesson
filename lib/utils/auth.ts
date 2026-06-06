import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

/**
 * Get the user identifier for an API request.
 *
 * Priority:
 *   1. Clerk userId (signed-in users, read from signed session cookie via auth())
 *   2. X-User-ID or X-Session-ID header (anonymous browser sessions)
 *
 * Security: client-supplied header values that start with "user_" are rejected.
 * Only Clerk's auth() can produce user_* ids (from a signed session cookie).
 * Accepting user_* from a header would allow any caller who knows a victim's
 * Clerk userId to impersonate them and bypass rate limits.
 *
 * Returns null if neither is present.
 */
export async function getRequestUserId(
  request: NextRequest
): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  const headerId = request.headers.get('X-User-ID') || request.headers.get('X-Session-ID') || null;
  // Reject Clerk-format ids from client headers — only auth() can produce user_* values
  return headerId?.startsWith('user_') ? null : headerId;
}

/**
 * Get the Clerk userId only (null for anonymous users).
 * Use this when you need to distinguish authenticated from anonymous.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
