"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and redirect accordingly
    const checkAuthAndRedirect = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          router.push("/management-portal/dashboard");
        } else {
          router.push("/signin");
        }
      } catch (error) {
        router.push("/signin");
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}