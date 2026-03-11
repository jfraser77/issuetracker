import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("auth-user");
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
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/auth/check",
    "/api/test-cookies",
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

  // Try to parse the auth cookie to verify it's valid
  try {
    if (authCookie.value) {
      const userData = JSON.parse(authCookie.value);
      console.log("✅ User authenticated:", {
        id: userData.id,
        email: userData.email,
        role: userData.role,
      });

      // Add user info to headers for API routes
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
  } catch (error) {
    console.error("❌ Invalid auth cookie:", error);

    // Clear invalid cookie
    const response = NextResponse.redirect(new URL("/signin", request.url));
    response.cookies.delete("auth-user");

    return response;
  }

  return NextResponse.next();
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
