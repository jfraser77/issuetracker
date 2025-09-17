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

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activePage: string;
  setActivePage: (page: string) => void;
}

interface MenuItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage,
  setActivePage,
}: SidebarProps) {
  const menuItems: MenuItem[] = [
    { id: "dashboard", name: "Dashboard", icon: HomeIcon },
    { id: "onboarding", name: "Onboarding", icon: UserIcon },
    { id: "terminations", name: "Terminations", icon: UserMinusIcon },
    { id: "it-assets", name: "IT Assets", icon: ComputerDesktopIcon },
    { id: "reports", name: "Reports", icon: ChartBarIcon },
    { id: "settings", name: "Settings", icon: Cog6ToothIcon },
    { id: "logout", name: "Logout", icon: ArrowRightOnRectangleIcon },
  ];

  const handleItemClick = (id: string) => {
    if (id !== "settings" && id !== "logout") {
      setActivePage(id);
    }
    setSidebarOpen(false);
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
        <div className="flex items-center justify-center h-16 bg-blue-900 px-4">
          <ComputerDesktopIcon className="h-8 w-8 text-white" />
          <h2 className="text-white text-xl font-semibold ml-2">
            IT Management Portal
          </h2>
        </div>

        <nav className="mt-5 px-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={`flex items-center px-4 py-3 text-white hover:bg-blue-700 rounded-md w-full mb-1 transition-colors
                  ${
                    activePage === item.id
                      ? "bg-blue-700 border-l-4 border-blue-400"
                      : ""
                  }`}
                onClick={() => handleItemClick(item.id)}
              >
                <IconComponent className="h-6 w-6" />
                <span className="ml-3">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
