"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/app/components/Header";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/user");
      const userData = await response.json();

      if (response.ok && userData) {
        setIsAuthenticated(true);
        
        // If on signin/signup page but authenticated, redirect to dashboard
        if (pathname === "/signin" || pathname === "/signup" || pathname === "/") {
          router.push("/management-portal/dashboard");
        }
      } else {
        setIsAuthenticated(false);
        
        // If trying to access protected routes but not authenticated, redirect to signin
        if (pathname.startsWith("/management-portal") && pathname !== "/signin") {
          router.push("/signin");
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      
      // Redirect to signin if trying to access protected routes
      if (pathname.startsWith("/management-portal")) {
        router.push("/signin");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && <Header />}
      <main className={isAuthenticated ? "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8" : ""}>
        {children}
      </main>
    </>
  );
}