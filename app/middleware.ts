import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("auth-user");
  const { pathname } = request.nextUrl;

  console.log("Middleware triggered:", {
    pathname,
    hasAuthCookie: !!authCookie,
  });

  // If trying to access protected routes without auth, redirect to signin
  if (pathname.startsWith("/management-portal") && !authCookie) {
    console.log("Redirecting to signin - no auth cookie");
    const signinUrl = new URL("/signin", request.url);
    // Add redirect parameter so we know where they came from
    signinUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signinUrl);
  }

  // If already authenticated and trying to access signin/signup, redirect to dashboard
  if ((pathname === "/signin" || pathname === "/signup") && authCookie) {
    console.log("Redirecting to onboarding - already authenticated");
    return NextResponse.redirect(
      new URL("/management-portal/onboarding", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/management-portal/:path*",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
