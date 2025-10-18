"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PencilIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";
import SearchEmployees from "@/app/components/SearchEmployees";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Termination {
  id: number;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  terminationDate: string;
  terminationReason: string;
  initiatedBy: string;
  status: "pending" | "equipment_returned" | "archived" | "overdue";
  trackingNumber?: string;
  equipmentDisposition: "return_to_pool" | "retire";
  daysRemaining: number;
  isOverdue: boolean;
  licensesRemoved: {
    automateLicense: boolean;
    screenConnect: boolean;
    office365: boolean;
    adobeAcrobat: boolean;
    phone: boolean;
    fax: boolean;
    additionalRemovals?: string;
  };
  timestamp: string;
  isExpanded?: boolean;
}

export default function TerminationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [terminationForm, setTerminationForm] = useState({
    employeeName: "",
    employeeEmail: "",
    jobTitle: "",
    department: "",
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: "",
    equipmentDisposition: "return_to_pool" as "return_to_pool" | "retire"
  });

  const isAuthorized = currentUser?.role === "Admin" || currentUser?.role === "I.T." || currentUser?.role === "HR";
  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";
  const filter = searchParams.get('filter');

  useEffect(() => {
    fetchCurrentUser();
    fetchTerminations();
    
    // Check for overdue terminations daily
    const interval = setInterval(checkOverdueTerminations, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchTerminations = async () => {
    try {
      const url = filter ? `/api/terminations?filter=${filter}` : '/api/terminations';
      const response = await fetch(url);
      if (response.ok) {
        const terminationsData = await response.json();
        setTerminations(terminationsData.map((t: Termination) => ({ 
          ...t, 
          isExpanded: false 
        })));
      }
    } catch (error) {
      console.error("Error fetching terminations:", error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your existing terminations page code remains the same
  // (toggleTerminationExpanded, createTermination, updateTermination, etc.)
  
  // Copy all the existing functions from your current terminations page here

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Employee Terminations
        </h1>
        <div className="w-80">
          <SearchEmployees
            onEmployeeSelect={handleEmployeeSelect}
            placeholder="Search employees to initiate termination..."
          />
        </div>
        {isAuthorized && (
          <button
            onClick={() => setShowTerminationForm(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Initiate Termination
          </button>
        )}
      </div>

      {/* Rest of your terminations page JSX remains the same */}
      {/* ... */}
    </div>
  );
}