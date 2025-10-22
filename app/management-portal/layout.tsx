"use client";

import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function ManagementPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      console.log("Fetching current user...");
      const response = await fetch("/api/auth/current-user"); // Fixed endpoint
      console.log("User response status:", response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData);
        setCurrentUser(userData);
      } else {
        console.error("Failed to fetch user:", response.status);
        // If unauthorized, redirect to signin
        if (response.status === 401) {
          window.location.href = "/signin";
          return; // Prevent further execution
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      // On network errors, redirect to signin
      window.location.href = "/signin";
    } finally {
      setLoading(false);
    }
  };

  // Prevent rendering until client-side
  if (!isClient) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If no user after loading, show error (should have redirected already)
  if (!currentUser) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Authentication Required</div>
          <button 
            onClick={() => window.location.href = "/signin"}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-gray-600 opacity-75"></div>
          </div>
        )}

        {/* Mobile sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition duration-300 ease-in-out`}>
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Single Header */}
          <Header 
            user={currentUser}
            onMenuClick={() => setSidebarOpen(true)}
          />
          
          {/* Main content area */}
          <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}