"use client";

import { MagnifyingGlassIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    }

    fetchUser();
  }, []);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <button
          className="lg:hidden text-gray-500 hover:text-gray-600"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="w-full max-w-xs lg:max-w-sm">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-secondary focus:border-secondary"
                placeholder="Search employees..."
              />
            </div>
          </div>
        </div>

        <div className="ml-4 flex items-center md:ml-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.name || "Loading..."}
              </p>
              <p className="text-xs font-medium text-gray-500 capitalize">
                {user?.role || "User"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
