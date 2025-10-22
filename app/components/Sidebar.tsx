"use client";

import {
  HomeIcon,
  UserIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/actions/auth";
import { useState, useEffect } from "react";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const currentPath = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Base navigation items (always visible)
  const baseNavItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: HomeIcon },
    {
      name: "Onboarding",
      href: "/management-portal/onboarding",
      icon: UserIcon,
    },
    {
      name: "Archived Onboarding",
      href: "/management-portal/onboarding/archived",
      icon: ArchiveBoxIcon,
    },
    {
      name: "Terminations",
      href: "/management-portal/terminations",
      icon: UserMinusIcon,
    },
    {
      name: "IT Assets",
      href: "/management-portal/it-assets",
      icon: ComputerDesktopIcon,
    },
    { name: "Reports", href: "/management-portal/reports", icon: ChartBarIcon },
    {
      name: "Settings",
      href: "/management-portal/settings",
      icon: Cog6ToothIcon,
    },
  ];

  // Admin-only navigation items
  const adminNavItems: NavItem[] = [
    {
      name: "Role Approvals",
      href: "/management-portal/admin/approvals",
      icon: UserGroupIcon,
      adminOnly: true,
    },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Fetch current user role
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/current-user");
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
        } else {
          console.error("Failed to fetch user role:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, [isClient]);

  const isAdminUser = (role: string | null): boolean => {
    if (!role) return false;
    return role === "Admin" || role === "I.T.";
  };

  // Combine navigation items based on user role
  const getNavItems = () => {
    if (!isClient || loading) {
      return baseNavItems; // Return base items during SSR and initial loading
    }

    if (isAdminUser(userRole)) {
      // Insert admin items before Settings
      const settingsIndex = baseNavItems.findIndex(
        (item) => item.name === "Settings"
      );
      return [
        ...baseNavItems.slice(0, settingsIndex),
        ...adminNavItems,
        ...baseNavItems.slice(settingsIndex),
      ];
    }

    return baseNavItems;
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(href);
  };

  const handleSignout = async () => {
    await signout();
  };

  // Show loading state
  if (!isClient) {
    return (
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div
          className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-blue-800 transform transition duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <div className="flex items-center mt-5 justify-center h-16 bg-blue-800 px-4">
            <div className="animate-pulse bg-blue-600 rounded-full w-12 h-12"></div>
            <div className="ml-2">
              <div className="h-4 bg-blue-600 rounded w-32 mb-2"></div>
              <div className="h-3 bg-blue-600 rounded w-24"></div>
            </div>
          </div>

          <nav className="mt-9 px-2">
            {/* Loading skeleton */}
            {baseNavItems.map((item, index) => (
              <div
                key={item.href}
                className="flex items-center px-4 py-3 rounded-md w-full mb-1"
              >
                <div className="h-6 w-6 bg-blue-600 rounded"></div>
                <div className="ml-3 h-4 bg-blue-600 rounded w-24"></div>
              </div>
            ))}
          </nav>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-blue-800 transform transition duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex items-center mt-5 justify-center h-16 bg-blue-800 px-4">
          <Link href="/" onClick={() => setSidebarOpen(false)}>
            <Image
              src="/nsn_revenue_resources_logo.jpg"
              alt="NSN image"
              width={500}
              height={300}
              className="rounded-full"
            />
          </Link>

          <h2 className="text-white text-xl font-semibold ml-2 bg-blue-800">
            IT Management Portal
          </h2>
        </div>

        {/* User role badge */}
        {userRole && !loading && (
          <div className="px-4 py-2">
            <div className="bg-blue-700 rounded-md px-3 py-1 text-center">
              <span className="text-xs text-blue-200 font-medium">
                {isAdminUser(userRole) ? "Administrator" : "User"} Access
              </span>
            </div>
          </div>
        )}

        <nav className="mt-4 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-white hover:bg-blue-700 rounded-md w-full mb-1 transition-colors
                  ${
                    isActive(item.href)
                      ? "bg-blue-700 border-l-4 border-blue-400"
                      : ""
                  }`}
                onClick={() => setSidebarOpen(false)}
              >
                <IconComponent className="h-6 w-6" />
                <span className="ml-3">{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-auto bg-blue-600 text-blue-100 text-xs px-2 py-1 rounded-full">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}

          {/* Logout button */}
          <button
            onClick={handleSignout}
            className="flex items-center px-4 py-3 text-white hover:bg-blue-700 rounded-md w-full mb-1 transition-colors mt-4"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
            <span className="ml-3">Logout</span>
          </button>
        </nav>
      </div>
    </>
  );
}