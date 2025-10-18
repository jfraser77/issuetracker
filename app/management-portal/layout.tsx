"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      console.log("Fetching current user...");
      const response = await fetch("/api/auth/user");
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
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
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

  return (
    <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar user={currentUser} />
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
        <Sidebar user={currentUser} onClose={() => setSidebarOpen(false)} />
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
  );
}