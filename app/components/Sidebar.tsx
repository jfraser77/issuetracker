"use client";

import {
  HomeIcon,
  UserIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/actions/auth";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const currentPath = usePathname();

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: HomeIcon },
    {
      name: "Onboarding",
      href: "/management-portal/onboarding",
      icon: UserIcon,
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

  const isActive = (href: string) => {
    if (href === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(href);
  };

  const handleSignout = async () => {
    await signout();
  };

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

        <nav className="mt-9 px-2">
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
