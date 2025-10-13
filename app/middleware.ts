import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("auth-user");

  // If trying to access protected routes without auth, redirect to signin
  if (
    request.nextUrl.pathname.startsWith("/management-portal") &&
    !authCookie
  ) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // If already authenticated and trying to access signin/signup, redirect to dashboard
  if (
    (request.nextUrl.pathname === "/signin" ||
      request.nextUrl.pathname === "/signup") &&
    authCookie
  ) {
    return NextResponse.redirect(
      new URL("/management-portal/onboarding", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/management-portal/:path*", "/signin", "/signup"],
};
