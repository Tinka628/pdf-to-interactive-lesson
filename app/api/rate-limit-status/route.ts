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
