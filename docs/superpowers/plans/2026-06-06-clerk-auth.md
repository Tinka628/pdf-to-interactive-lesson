# Clerk Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk authentication so users have real accounts, their courses persist across devices, and rate limits are tied to their identity instead of IP address.

**Architecture:** The app already has all auth plumbing (`X-User-ID`/`X-Session-ID` headers, `createdBy` column, `getRequestUserId()` helpers) but uses anonymous session IDs. We layer Clerk on top: server API routes call `auth()` (reads Clerk session cookie) to get the real userId; anonymous users keep the existing `X-Session-ID` fallback. No routes are forced-auth — the app stays usable without signing in.

**Tech Stack:** `@clerk/nextjs` v6 · Next.js 15 App Router · Clerk Dashboard (hosted auth UI) · Upstash Redis (rate limiting keyed by Clerk userId for signed-in users)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| CREATE | `middleware.ts` | Run Clerk session parsing on every request |
| MODIFY | `app/layout.tsx` | Wrap children with `ClerkProvider` |
| CREATE | `app/sign-in/[[...sign-in]]/page.tsx` | Hosted Clerk sign-in page |
| CREATE | `app/sign-up/[[...sign-up]]/page.tsx` | Hosted Clerk sign-up page |
| CREATE | `lib/utils/auth.ts` | Server-side `getRequestUserId()` using `auth()` + X-Session-ID fallback |
| MODIFY | `lib/utils/rate-limiter.ts` | Accept optional `clerkUserId`; prefer it over IP for signed-in users |
| MODIFY | `app/api/courses/route.ts` | Use `lib/utils/auth.ts` helper |
| MODIFY | `app/api/courses/[slug]/route.ts` | Use `lib/utils/auth.ts` helper |
| MODIFY | `app/api/generate-course/route.ts` | Use `lib/utils/auth.ts` helper; pass Clerk userId to rate limiter |
| MODIFY | `app/api/demo-course/route.ts` | Use `lib/utils/auth.ts` helper |
| MODIFY | `app/api/rate-limit-status/route.ts` | Use Clerk userId for rate limit key |
| MODIFY | `app/api/grade-short-answer/route.ts` | Use Clerk userId for rate limit key |
| MODIFY | `app/components/header-actions.tsx` | Add `<SignInButton>` / `<UserButton>` |

---

## Task 1: Install Clerk and add env vars

**Files:**
- Modify: `package.json` (via pnpm install)
- Modify: `.env.local` (create if absent)
- Modify: `.env.example`

- [ ] **Step 1: Install the Clerk Next.js package**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm add @clerk/nextjs
```

Expected output: `@clerk/nextjs` added to `dependencies`.

- [ ] **Step 2: Create a Clerk application**

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and sign in
2. Click **Create application**
3. Name it `pdf-to-interactive-lesson`, enable **Email** and **Google** sign-in
4. Copy **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`)

- [ ] **Step 3: Add Clerk keys to .env.local**

Open `.env.local` (create it if it doesn't exist) and append:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

- [ ] **Step 4: Document the new env vars in .env.example**

Open `.env.example` and append:

```bash
# Clerk Authentication (Required for user accounts)
# Get keys from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

- [ ] **Step 5: Verify TypeScript sees the package**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors about `@clerk/nextjs` not found. (Other pre-existing errors are fine.)

- [ ] **Step 6: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add package.json pnpm-lock.yaml .env.example && git commit -m "feat: install @clerk/nextjs and document env vars"
```

---

## Task 2: Create middleware.ts

All Clerk functionality depends on the middleware running first — it decodes the session token and makes `auth()` work in route handlers.

**Files:**
- Create: `middleware.ts` (project root, next to `package.json`)

- [ ] **Step 1: Create middleware.ts**

```typescript
// middleware.ts
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
```

- [ ] **Step 2: Verify the file is in the right location**

```bash
ls /Users/tinka/pdf-to-interactive-lesson/middleware.ts
```

Expected: file exists at the project root (same level as `next.config.ts`).

- [ ] **Step 3: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add middleware.ts && git commit -m "feat: add Clerk middleware for session parsing"
```

---

## Task 3: Wrap layout with ClerkProvider

`ClerkProvider` makes Clerk's client-side hooks (`useUser`, `SignedIn`, `SignedOut`) work in any Client Component.

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update app/layout.tsx**

Replace the entire file with:

```typescript
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fustat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { metadataBase, ogImage, twitterImage } from "./seo";
import "./globals.css";
import PlausibleProvider from "next-plausible";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "PDF to Interactive Lesson Generator",
    template: "%s | PDF to Interactive Lesson Generator",
  },
  description: "Convert PDFs into interactive course lessons with AI-powered content generation",
  keywords: ["PDF", "interactive lessons", "course generator", "AI", "education", "learning"],
  authors: [{ name: "PDF to Interactive Lesson Generator" }],
  openGraph: {
    title: "PDF to Interactive Lesson Generator",
    description: "Convert PDFs into interactive course lessons with AI-powered content generation",
    type: "website",
    siteName: "PDF to Interactive Lesson Generator",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Interactive Lesson Generator",
    description: "Convert PDFs into interactive course lessons with AI-powered content generation",
    images: [twitterImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="light">
        <head>
          <PlausibleProvider domain="pdftolesson.com" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${fustat.variable} antialiased bg-white`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep -i "clerk\|layout" | head -20
```

Expected: no errors related to `ClerkProvider` or `layout.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add app/layout.tsx && git commit -m "feat: wrap layout with ClerkProvider"
```

---

## Task 4: Create server-side auth helper

All API routes currently have an inline `getRequestUserId()` that reads headers. We replace it with a single helper that uses Clerk's `auth()` first (reads the session cookie) and falls back to the `X-Session-ID` header for anonymous users.

**Files:**
- Create: `lib/utils/auth.ts`

- [ ] **Step 1: Create lib/utils/auth.ts**

```typescript
// lib/utils/auth.ts
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
  return request.headers.get('X-Session-ID') || null;
}

/**
 * Get the Clerk userId only (null for anonymous users).
 * Use this when you need to distinguish authenticated from anonymous.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep "auth.ts" | head -10
```

Expected: no errors for `lib/utils/auth.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add lib/utils/auth.ts && git commit -m "feat: add server-side auth helper using Clerk auth()"
```

---

## Task 5: Update rate limiter to accept Clerk userId

Signed-in users should have their rate limit tied to their Clerk account, not their IP address (which is shared on networks and rotates on mobile).

**Files:**
- Modify: `lib/utils/rate-limiter.ts`

- [ ] **Step 1: Update getClientIdentifier to accept an optional clerkUserId**

Replace the existing `getClientIdentifier` function (lines 17–31) with:

```typescript
/**
 * Get client identifier from request.
 * Signed-in users: keyed by Clerk userId (portable, cross-device).
 * Anonymous users: keyed by IP address (existing behavior).
 */
export function getClientIdentifier(
  request: Request,
  clerkUserId?: string | null
): string {
  if (clerkUserId) return `clerk_${clerkUserId}`;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
```

The `clerk_` prefix prevents collisions between Clerk userIds and any existing IP-based keys in Redis.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep "rate-limiter" | head -10
```

Expected: no errors. (The signature change is backward-compatible — `clerkUserId` is optional.)

- [ ] **Step 3: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add lib/utils/rate-limiter.ts && git commit -m "feat: rate-limit signed-in users by Clerk userId instead of IP"
```

---

## Task 6: Update courses API routes

Both `app/api/courses/route.ts` and `app/api/courses/[slug]/route.ts` have an inline `getRequestUserId` function. Replace it with the shared helper from Task 4.

**Files:**
- Modify: `app/api/courses/route.ts`
- Modify: `app/api/courses/[slug]/route.ts`

- [ ] **Step 1: Update app/api/courses/route.ts**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import {
  isExplicitlyPublicCourse,
  withCourseSharingMetadata,
} from "@/lib/course-visibility";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { getRequestUserId } from "@/lib/utils/auth";
import { eq, desc } from "drizzle-orm";
import { handleApiError } from "@/lib/utils/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/courses - List courses owned by this user/session
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json(
        { courses: [], total: 0 },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const ownedCourses = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        courseData: courses.courseData,
        isPublic: courses.isPublic,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
      })
      .from(courses)
      .where(eq(courses.createdBy, userId))
      .orderBy(desc(courses.createdAt));

    const allCourses = ownedCourses.map((course) => ({
      ...course,
      isPublic: isExplicitlyPublicCourse(course.courseData, course.isPublic),
    }));

    return NextResponse.json({
      courses: allCourses,
      total: allCourses.length,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return handleApiError(error, "Failed to fetch courses");
  }
}

// POST /api/courses - Create a new course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course, slug: providedSlug } = body;
    const userId = await getRequestUserId(request);

    if (!course || !course.title) {
      return NextResponse.json(
        { error: "Course data with title is required" },
        { status: 400 }
      );
    }

    let slug = providedSlug;
    if (!slug) {
      const baseSlug = generateSlug(course.title, Date.now().toString());
      const allCourses = await db.select({ slug: courses.slug }).from(courses);
      slug = ensureUniqueSlug(baseSlug, allCourses.map((c) => c.slug));
    } else {
      const existing = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "A course with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const isPublic = body.isPublic === true;

    const [newCourse] = await db
      .insert(courses)
      .values({
        slug,
        title: course.title,
        courseData: isPublic ? withCourseSharingMetadata(course, true) : course,
        createdBy: userId || null,
        isPublic,
      })
      .returning();

    return NextResponse.json({
      id: newCourse.id,
      slug: newCourse.slug,
      title: newCourse.title,
      createdAt: newCourse.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return handleApiError(error, "Failed to create course");
  }
}
```

- [ ] **Step 2: Update app/api/courses/[slug]/route.ts**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import {
  isExplicitlyPublicCourse,
  withCourseSharingMetadata,
} from "@/lib/course-visibility";
import { and, eq } from "drizzle-orm";
import { getRequestUserId } from "@/lib/utils/auth";
import { handleApiError } from "@/lib/utils/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/courses/[slug] - Fetch a course by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const userId = await getRequestUserId(request);

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isOwner = !!userId && course.createdBy === userId;
    const isPublic = isExplicitlyPublicCourse(course.courseData, course.isPublic);

    if (!isPublic && !isOwner) {
      return NextResponse.json({ error: "Course is private" }, { status: 403 });
    }

    return NextResponse.json({
      id: course.id,
      slug: course.slug,
      title: course.title,
      course: course.courseData,
      isPublic,
      isOwner,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return handleApiError(error, "Failed to fetch course");
  }
}

// PATCH /api/courses/[slug] - Update course visibility
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const userId = await getRequestUserId(request);

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json(
        { error: "isPublic must be a boolean" },
        { status: 400 }
      );
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.slug, slug), eq(courses.createdBy, userId)))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or you do not have permission to update it" },
        { status: 404 }
      );
    }

    const courseData =
      typeof course.courseData === "object" &&
      course.courseData !== null &&
      !Array.isArray(course.courseData)
        ? withCourseSharingMetadata(
            course.courseData as Record<string, unknown>,
            body.isPublic
          )
        : course.courseData;

    const [updatedCourse] = await db
      .update(courses)
      .set({ isPublic: body.isPublic, courseData, updatedAt: new Date() })
      .where(and(eq(courses.slug, slug), eq(courses.createdBy, userId)))
      .returning({
        slug: courses.slug,
        isPublic: courses.isPublic,
        courseData: courses.courseData,
        updatedAt: courses.updatedAt,
      });

    return NextResponse.json({
      slug: updatedCourse.slug,
      isPublic: isExplicitlyPublicCourse(updatedCourse.courseData, updatedCourse.isPublic),
      updatedAt: updatedCourse.updatedAt,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return handleApiError(error, "Failed to update course");
  }
}

// DELETE /api/courses/[slug] - Delete a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const userId = await getRequestUserId(request);

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await db
      .delete(courses)
      .where(and(eq(courses.slug, slug), eq(courses.createdBy, userId)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Course not found or you do not have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    return handleApiError(error, "Failed to delete course");
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep "courses" | head -20
```

Expected: no errors for the courses routes.

- [ ] **Step 4: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add app/api/courses/route.ts "app/api/courses/[slug]/route.ts" && git commit -m "feat: use Clerk auth helper in courses API routes"
```

---

## Task 7: Update remaining API routes

Four more routes need updating: `generate-course`, `demo-course`, `rate-limit-status`, and `grade-short-answer`.

**Files:**
- Modify: `app/api/generate-course/route.ts`
- Modify: `app/api/demo-course/route.ts`
- Modify: `app/api/rate-limit-status/route.ts`
- Modify: `app/api/grade-short-answer/route.ts`

- [ ] **Step 1: Update app/api/generate-course/route.ts**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { send } from "@vercel/queue";
import {
  checkRateLimit,
  getClientIdentifier,
} from "@/lib/utils/rate-limiter";
import { createJob } from "@/lib/utils/job-store";
import { getRequestUserId, getClerkUserId } from "@/lib/utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-Together-API-Key");
    const clerkUserId = await getClerkUserId();
    const userId = await getRequestUserId(request);
    const clientId = getClientIdentifier(request, clerkUserId);

    const rateLimitCheck = await checkRateLimit(clientId, !!apiKey);
    if (!rateLimitCheck.allowed && !apiKey) {
      return NextResponse.json(
        {
          error:
            "You've used all 3 free courses. Please add your Together AI API key to generate unlimited courses.",
        },
        { status: 402 }
      );
    }

    const formData = await request.formData();
    const url = formData.get("url") as string | null;
    if (!url) {
      return NextResponse.json({ error: "Missing PDF url" }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    await createJob(jobId, {
      url,
      apiKey: apiKey || undefined,
      clientId,
      userId: userId || undefined,
    });

    await send("generate-course", { jobId });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Error enqueuing course generation:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to enqueue job",
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Update app/api/demo-course/route.ts**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import demoCourse from "@/lib/demo/composer2-course.json";
import { saveCourse } from "@/lib/save-course";
import { handleApiError } from "@/lib/utils/api-errors";
import { getRequestUserId } from "@/lib/utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Session id is required" },
        { status: 401 }
      );
    }

    const savedCourse = await saveCourse({
      course: demoCourse,
      userId,
    });

    return NextResponse.json(savedCourse, { status: 201 });
  } catch (error) {
    console.error("Error creating demo course:", error);
    return handleApiError(error, "Failed to create demo course");
  }
}
```

- [ ] **Step 3: Update app/api/rate-limit-status/route.ts**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getRateLimitStatus,
  getClientIdentifier,
} from "@/lib/utils/rate-limiter";
import { getClerkUserId } from "@/lib/utils/auth";

export const dynamic = "force-dynamic";

// GET /api/rate-limit-status
export async function GET(request: NextRequest) {
  try {
    const clerkUserId = await getClerkUserId();
    const clientId = getClientIdentifier(request, clerkUserId);
    const status = await getRateLimitStatus(clientId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching rate limit status:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate limit status" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Update app/api/grade-short-answer/route.ts**

Replace only the top section of the file — the part that checks the grading limit. Specifically, replace the block that calls `getClientIdentifier` (two places: the check before grading and the increment after). The full replacement for the POST handler:

```typescript
import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createTogetherClient, GRADER_MODEL } from "@/lib/utils/together";
import { parseJSON } from "@/lib/utils/json";
import { debugLog } from "@/lib/utils/debug";
import {
  getClientIdentifier,
  checkGradingLimit,
  incrementGradingLimit,
} from "@/lib/utils/rate-limiter";
import { getClerkUserId } from "@/lib/utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_API_KEY_MESSAGE =
  "Invalid Together AI API key. Update the key in settings and try again.";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function isInvalidApiKeyError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("invalid api key") ||
    message.includes("invalid_api_key") ||
    message.includes("incorrect api key")
  );
}

export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get("X-Together-API-Key");
    const apiKey = userApiKey || process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      debugLog.error("[API] No API key available (neither user nor server)");
      return Response.json(
        { error: "No API key available for grading" },
        { status: 500 }
      );
    }

    if (!userApiKey) {
      const clerkUserId = await getClerkUserId();
      const clientId = getClientIdentifier(request, clerkUserId);
      const gradingCheck = await checkGradingLimit(clientId, false);
      if (!gradingCheck.allowed) {
        return Response.json(
          { error: "You've used all your free grading credits. Please add your Together AI API key for unlimited grading." },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const { userAnswer, correctAnswer, content, info, question } = body;

    if (
      typeof userAnswer !== "string" ||
      typeof correctAnswer !== "string" ||
      typeof content !== "string" ||
      typeof info !== "string" ||
      typeof question !== "string"
    ) {
      debugLog.error("[API] Validation failed - missing or invalid fields", {
        userAnswer: typeof userAnswer,
        correctAnswer: typeof correctAnswer,
        content: typeof content,
        info: typeof info,
        question: typeof question,
      });
      return Response.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const together = createTogetherClient(apiKey);

    const result = await generateText({
      model: together(GRADER_MODEL),
      prompt: `You are an educational assessment evaluator. Evaluate whether a student's answer to a short-answer question demonstrates understanding of the material.

Lesson Content:
${content}

Key Information:
${info}

Question:
${question}

Correct Answer:
${correctAnswer}

Student's Answer:
${userAnswer}

Evaluate whether the student's answer demonstrates understanding of the material. The answer does not need to match the correct answer word-for-word, but should demonstrate comprehension of the key concepts.

Respond ONLY with valid JSON in this exact format:
{
  "isCorrect": true or false,
  "explanation": "Brief explanation of why the answer is correct or incorrect"
}`,
    });

    try {
      const evaluation = parseJSON(result.text);

      if (typeof evaluation.isCorrect !== "boolean") {
        debugLog.error("[API] Invalid response format", evaluation);
        throw new Error("Invalid response format: isCorrect must be boolean");
      }

      if (!userApiKey) {
        const clerkUserId = await getClerkUserId();
        const clientId = getClientIdentifier(request, clerkUserId);
        await incrementGradingLimit(clientId);
      }

      return Response.json({
        isCorrect: evaluation.isCorrect,
        explanation: evaluation.explanation || undefined,
      });
    } catch (error) {
      debugLog.error("[API] Failed to parse evaluation response", {
        error: error instanceof Error ? error.message : "Unknown error",
        responseText: result.text.substring(0, 500),
      });
      return Response.json(
        {
          error: "Failed to evaluate answer - invalid response format",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (isInvalidApiKeyError(error)) {
      debugLog.log("[API] User-facing grading error", { code: "invalid_api_key" });
      return Response.json(
        { error: INVALID_API_KEY_MESSAGE, code: "invalid_api_key" },
        { status: 401 }
      );
    }

    debugLog.error("[API] Error grading short answer", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return Response.json(
      { error: "Failed to grade answer", details: errorMessage },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep -E "generate-course|demo-course|rate-limit|grade-short" | head -20
```

Expected: no errors for any of these four route files.

- [ ] **Step 6: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add app/api/generate-course/route.ts app/api/demo-course/route.ts app/api/rate-limit-status/route.ts app/api/grade-short-answer/route.ts && git commit -m "feat: use Clerk auth in all remaining API routes"
```

---

## Task 8: Add sign-in and sign-up pages

Clerk needs dedicated pages at the URLs defined in `.env.local` so users can authenticate.

**Files:**
- Create: `app/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create the sign-in directories**

```bash
mkdir -p /Users/tinka/pdf-to-interactive-lesson/app/sign-in/"[[...sign-in]]"
mkdir -p /Users/tinka/pdf-to-interactive-lesson/app/sign-up/"[[...sign-up]]"
```

- [ ] **Step 2: Create app/sign-in/[[...sign-in]]/page.tsx**

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <SignIn />
    </div>
  );
}
```

- [ ] **Step 3: Create app/sign-up/[[...sign-up]]/page.tsx**

```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep "sign-in\|sign-up" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add "app/sign-in" "app/sign-up" && git commit -m "feat: add Clerk sign-in and sign-up pages"
```

---

## Task 9: Add auth UI to the header

The header (`header-actions.tsx`) currently shows an "API Key" button. Add a sign-in button for unauthenticated users and a `UserButton` (avatar + sign-out dropdown) for authenticated users.

**Files:**
- Modify: `app/components/header-actions.tsx`

- [ ] **Step 1: Update app/components/header-actions.tsx**

Replace the entire file:

```typescript
"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BookOpen, KeyRound, Star } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useCredits } from "../hooks/use-credits";
import { ApiKeyDialog } from "./api-key-dialog";
import { Button, buttonVariants } from "./ui/button";
import { getApiKey } from "@/lib/api-key-storage";

const API_KEY_CHANGE_EVENT = "api-key-storage-change";

interface HeaderActionsProps {
  showCoursesLink?: boolean;
}

function subscribeToApiKeyChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(API_KEY_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(API_KEY_CHANGE_EVENT, onStoreChange);
  };
}

function getApiKeyPresence() {
  return !!getApiKey();
}

function getServerApiKeyPresence() {
  return null;
}

function HeaderActions({ showCoursesLink }: HeaderActionsProps) {
  const { credits, loaded } = useCredits();
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const hasApiKey = useSyncExternalStore(
    subscribeToApiKeyChanges,
    getApiKeyPresence,
    getServerApiKeyPresence
  );

  const handleApiKeyDialogChange = (open: boolean) => {
    setShowApiKeyDialog(open);
    if (!open) {
      window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
    }
  };

  const showCreditsChip = hasApiKey !== true;

  return (
    <>
      <ApiKeyDialog open={showApiKeyDialog} onOpenChange={handleApiKeyDialogChange} />
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href="https://github.com/Nutlope/pdf-to-interactive-lesson"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <Star className="w-3.5 h-3.5 fill-brand-2 text-brand-2" />
          <span className="hidden sm:inline">Star on GitHub</span>
        </a>

        {showCreditsChip && (!loaded ? (
          <div className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface-muted text-sm text-neutral-400 cursor-default select-none">
            <span className="inline-block w-3 h-3.5 rounded bg-neutral-200 animate-pulse motion-reduce:animate-none" />
            <span className="hidden sm:inline">courses left</span>
            <span className="sm:hidden">left</span>
          </div>
        ) : credits ? (
          <div
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface-muted text-sm text-neutral-500 cursor-default select-none"
            title={`${credits.coursesRemaining} free courses remaining`}
          >
            <span className="font-semibold text-neutral-900 tabular-nums">
              {credits.coursesRemaining}
            </span>
            <span className="hidden sm:inline">courses left</span>
            <span className="sm:hidden">left</span>
          </div>
        ) : null)}

        {showCoursesLink && (
          <Link
            href="/courses"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Courses
          </Link>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowApiKeyDialog(true)}
          aria-label="API Key"
        >
          <KeyRound className="w-3.5 h-3.5" />
          API Key
        </Button>

        {/* Auth: show sign-in button for guests, avatar for signed-in users */}
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </>
  );
}

export { HeaderActions };
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep "header-actions" | head -10
```

Expected: no errors.

- [ ] **Step 3: Full type-check across the whole project**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && pnpm tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```

Expected: zero errors (or only pre-existing errors not introduced by this feature).

- [ ] **Step 4: Commit**

```bash
cd /Users/tinka/pdf-to-interactive-lesson && git add app/components/header-actions.tsx && git commit -m "feat: add sign-in button and user avatar to header"
```

---

## Self-Review

### Spec coverage check

| Requirement | Covered by |
|---|---|
| Users can sign in / sign up | Task 8 (pages) + Task 9 (header UI) |
| Auth is optional (app works anonymously) | All routes fall back to X-Session-ID; middleware doesn't protect any route |
| Signed-in users have stable identity across devices | Task 4: `auth()` reads session cookie, returns Clerk userId |
| Rate limits tied to account (not IP) for signed-in users | Task 5: `getClientIdentifier` accepts `clerkUserId`; Tasks 6–7: all routes pass it |
| Existing anonymous courses still work | `getRequestUserId` falls back to `X-Session-ID` unchanged |
| All API routes use consistent identity resolution | Tasks 6–7: all 6 mutating/reading routes updated to use `lib/utils/auth.ts` |
| ClerkProvider wraps the app | Task 3 |
| Middleware initialises session on every request | Task 2 |

### No placeholders detected

All tasks contain complete code. No "TBD", "TODO", or "implement later" patterns.

### Type consistency

- `getRequestUserId(request: NextRequest): Promise<string | null>` — defined Task 4, consumed Tasks 6–7
- `getClerkUserId(): Promise<string | null>` — defined Task 4, consumed Tasks 5–7
- `getClientIdentifier(request: Request, clerkUserId?: string | null): string` — updated Task 5, callers in Tasks 6–7 pass `clerkUserId`
- `SignedIn`, `SignedOut`, `SignInButton`, `UserButton` — all from `@clerk/nextjs`, used Task 9

All consistent.
