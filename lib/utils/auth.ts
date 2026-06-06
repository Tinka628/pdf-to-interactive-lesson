import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

/**
 * Get the user identifier for an API request.
 *
 * Priority:
 *   1. Clerk userId (signed-in users, read from session cookie)
 *   2. X-Session-ID header (anonymous browser sessions)
 *
 * Returns null if neither is present.
 */
export async function getRequestUserId(
  request: NextRequest
): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  return request.headers.get('X-User-ID') || request.headers.get('X-Session-ID') || null;
}

/**
 * Get the Clerk userId only (null for anonymous users).
 * Use this when you need to distinguish authenticated from anonymous.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
