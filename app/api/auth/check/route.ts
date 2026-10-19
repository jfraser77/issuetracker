import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 AUTH CHECK CALLED");

    // Get the cookie from the request - looking for "auth-user"
    const authCookie = request.cookies.get(SESSION_COOKIE);
    console.log("Auth cookie found:", !!authCookie);

    if (!authCookie) {
      console.log("❌ No auth-user cookie found");
      return NextResponse.json(
        {
          authenticated: false,
          error: "Not authenticated",
          message: "No authentication cookie found",
        },
        { status: 401 }
      );
    }

    // Verify the signed session cookie
    const userData = await verifySessionToken(authCookie.value);

    if (!userData) {
      console.error("❌ Invalid or expired auth cookie");
      return NextResponse.json(
        {
          authenticated: false,
          error: "Invalid session",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || "user",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ AUTH CHECK ERROR:", error.message);
    console.error("Stack:", error.stack);

    return NextResponse.json(
      {
        authenticated: false,
        error: "Authentication check failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Also accept POST for compatibility
export async function POST(request: NextRequest) {
  return GET(request);
}

// Optional: Add a simple status endpoint
export async function OPTIONS() {
  return NextResponse.json({
    endpoint: "/api/auth/check",
    methods: ["GET", "POST"],
    purpose: "Check authentication status",
    cookieName: "auth-user",
  });
}
