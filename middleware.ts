import { clerkMiddleware } from '@clerk/nextjs/server';

// All routes are public — the app works without signing in.
// Clerk middleware runs on every request so auth() resolves the
// userId in API routes for signed-in users automatically.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
