import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const authCookie = request.cookies.get(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  console.log("Middleware triggered:", {
    pathname,
    hasAuthCookie: !!authCookie,
    cookieValue: authCookie ? "***" : "none",
  });

  // Public paths that don't require authentication
  const publicPaths = [
    "/",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/api/auth/signup",
    "/api/auth/check",
    "/api/auth/verify-credentials",
    "/api/auth/send-2fa",
    "/api/auth/verify-2fa",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/test-cookies",
    "/api/terminations/check-o365-reminders", 
    "/_next", // Next.js static files
    "/favicon.ico",
  ];

  // Check if current path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If trying to access protected routes without auth
  if (!authCookie) {
    console.log("🔒 Access denied - No auth cookie");

    // For API routes, return 401 JSON response
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // For page routes, redirect to signin
    console.log("Redirecting to signin");
    const signinUrl = new URL("/signin", request.url);
    signinUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signinUrl);
  }

  // Verify the cookie signature — an unsigned, tampered or expired cookie is rejected
  const userData = await verifySessionToken(authCookie.value);

  if (!userData) {
    console.error("❌ Invalid or expired auth cookie");

    const response = pathname.startsWith("/api/")
      ? NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/signin", request.url));
    response.cookies.delete(SESSION_COOKIE);

    return response;
  }

  // Add verified user info to headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userData.id.toString());
  requestHeaders.set("x-user-email", userData.email);
  requestHeaders.set("x-user-role", userData.role || "user");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
