"use client";

import { useState } from "react";
import SearchEmployees from "./SearchEmployees";
import { BellIcon, CogIcon, UserCircleIcon } from "@heroicons/react/24/outline";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  status: string;
}

interface HeaderProps {
  user: User | null;
  onMenuClick: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    console.log("Selected employee:", employee);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Menu button for mobile and Search */}
          <div className="flex items-center flex-1 max-w-2xl">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 mr-4 text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <SearchEmployees
              onEmployeeSelect={handleEmployeeSelect}
              placeholder="Search employees, departments, job titles..."
              className="max-w-2xl"
              showStatus={true}
            />
          </div>

          {/* Right side - User actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 relative">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <CogIcon className="h-6 w-6" />
            </button>

            {/* User profile */}
            <div className="flex items-center space-x-3">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="hidden md:block">
                <div className="text-sm font-medium text-gray-700">
                  {user ? user.name : "Loading..."}
                </div>
                <div className="text-xs text-gray-500">
                  {user ? user.role : "Loading..."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}