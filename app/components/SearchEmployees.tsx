"use client";

import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from "@heroicons/react/24/outline";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  status: string;
}

interface SearchEmployeesProps {
  onEmployeeSelect?: (employee: Employee) => void;
  placeholder?: string;
  className?: string;
  showStatus?: boolean;
}

export default function SearchEmployees({
  onEmployeeSelect,
  placeholder = "Search employees by name, email, or job title...",
  className = "",
  showStatus = false
}: SearchEmployeesProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search employees when query changes
  useEffect(() => {
    const searchEmployees = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/employees/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error searching employees:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setQuery(`${employee.firstName} ${employee.lastName}`);
    setIsOpen(false);
    onEmployeeSelect?.(employee);
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedEmployee(null);
    setResults([]);
    setIsOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "terminated":
        return "bg-red-100 text-red-800";
      case "onboarding":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                Searching...
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => handleEmployeeSelect(employee)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.jobTitle}
                        </div>
                        <div className="text-xs text-gray-400">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                    {showStatus && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No employees found matching "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}