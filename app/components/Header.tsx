"use client";

import { useState } from "react";
import SearchEmployees from "./SearchEmployees";
import { BellIcon, CogIcon, UserCircleIcon } from "@heroicons/react/24/outline";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  status: string;
}

export default function HeaderWithSearch() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    // You can navigate to employee details or perform other actions
    console.log("Selected employee:", employee);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Search */}
          <div className="flex-1 max-w-2xl">
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
                <div className="text-sm font-medium text-gray-700">Current User</div>
                <div className="text-xs text-gray-500">Admin</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}