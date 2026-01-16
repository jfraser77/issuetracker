import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 AUTH CHECK CALLED");

    // Get the cookie from the request - looking for "auth-user"
    const authCookie = request.cookies.get("auth-user");
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

    console.log("✅ Auth cookie found, length:", authCookie.value.length);
    console.log(
      "Cookie value (first 100 chars):",
      authCookie.value.substring(0, 100)
    );

    // Parse the cookie value
    let userData;
    try {
      userData = JSON.parse(authCookie.value);
      console.log("✅ Successfully parsed cookie data:", {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      });
    } catch (parseError) {
      console.error("❌ Failed to parse auth cookie:", parseError);
      console.log("Raw cookie value:", authCookie.value);
      return NextResponse.json(
        {
          authenticated: false,
          error: "Invalid session data",
          details: "Cookie could not be parsed as JSON",
        },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!userData.id || !userData.email) {
      console.error("❌ Invalid user data in cookie:", userData);
      return NextResponse.json(
        {
          authenticated: false,
          error: "Invalid user data",
          details: "Missing required fields in cookie",
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
      cookieAge: userData.timestamp
        ? Date.now() - userData.timestamp
        : "unknown",
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
