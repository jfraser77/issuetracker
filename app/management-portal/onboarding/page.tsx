"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import SearchEmployees from "@/app/components/SearchEmployees";

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
  jobTitle: string;
  startDate: string;
  currentManager: string;
  directorRegionalDirector: string;
  timestamp: string;
  status: "active" | "completed" | "archived";
}

interface ApplicationStatus {
  [key: string]: "not begun" | "in progress" | "completed";
}

interface ITStaffAssignment {
  assignedToId?: number;
  status: "not assigned" | "in progress" | "on hold" | "completed";
  assignedTo?: User;
}

interface EmployeeWithStatus extends Employee {
  applicationStatus?: ApplicationStatus;
  itStaffAssignment?: ITStaffAssignment;
  isExpanded?: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [itStaff, setItStaff] = useState<User[]>([]);

  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  // System applications with initial status
  const systemApplications = {
    "E-Tenet ID #": "not begun",
    "New User Network Access Request - tenetone.com": "not begun",
    "Tenet Portal & TENET/USPI email - tenetone.com": "not begun",
    "Citrix / Citrix Explorer": "not begun",
    "USPI Billing drive": "not begun",
    "CSO Public drive": "not begun",
    "NSN1 Public drive": "not begun",
    "Microsoft 365 license (Outlook and Teams)": "not begun",
    "DDL - Digital Deposit Log": "not begun",
    "Scan Chart - Req icon to be added to the user Citrix Explorer Account": "not begun",
    "Patient Refund Portal - Role Specific": "not begun",
    "Learn share - USPI university": "not begun",
    "ProVation - Center Specific": "not begun",
    "EOM Tool - Role Specific": "not begun",
    "Bank Access - Role Specific Managers and above": "not begun",
    "ENVI - Billing Dept": "not begun",
    "Nimble - Billing Dept": "not begun",
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchEmployeesWithStatus();
    fetchITStaff();
    // Check for completed employees every day
    const interval = setInterval(checkCompletedEmployees, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  const fetchITStaff = async () => {
    try {
      const response = await fetch("/api/users?role=IT,Admin");
      if (response.ok) {
        const staff = await response.json();
        setItStaff(staff);
      }
    } catch (error) {
      console.error("Error fetching IT staff:", error);
    }
  };

  const fetchEmployeesWithStatus = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const employeesData = await response.json();

        // Fetch status for each employee
        const employeesWithStatus = await Promise.all(
          employeesData.map(async (employee: Employee) => {
            try {
              const statusResponse = await fetch(
                `/api/employees/${employee.id}/status`
              );
              const itStaffResponse = await fetch(
                `/api/employees/${employee.id}/it-assignment`
              );

              const applicationStatus = statusResponse.ok ? await statusResponse.json() : systemApplications;
              const itStaffAssignment = itStaffResponse.ok ? await itStaffResponse.json() : { status: "not assigned" };

              return { 
                ...employee, 
                applicationStatus,
                itStaffAssignment,
                isExpanded: false
              };
            } catch (error) {
              console.error(`Error fetching data for employee ${employee.id}:`, error);
            }
            return { 
              ...employee, 
              applicationStatus: systemApplications,
              itStaffAssignment: { status: "not assigned" },
              isExpanded: false
            };
          })
        );

        setEmployees(employeesWithStatus);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeeExpanded = (employeeId: number) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { ...emp, isExpanded: !emp.isExpanded } : emp
    ));
  };

  const updateITAssignment = async (employeeId: number, assignment: ITStaffAssignment) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/it-assignment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment),
      });

      if (response.ok) {
        fetchEmployeesWithStatus(); // Refresh data
      }
    } catch (error) {
      console.error("Error updating IT assignment:", error);
    }
  };

  const applyITAssignment = async (employeeId: number, assignment: ITStaffAssignment) => {
    if (assignment.status === "completed" && assignment.assignedToId) {
      // Reduce available laptops for the IT staff member
      try {
        await fetch("/api/it-assets/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: assignment.assignedToId, 
            change: -1 
          }),
        });
      } catch (error) {
        console.error("Error updating inventory:", error);
      }
    }
    
    await updateITAssignment(employeeId, assignment);
  };

  const deleteEmployee = async (employeeId: number) => {
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const checkCompletedEmployees = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setEmployees((prev) =>
      prev.filter((emp) => {
        const empDate = new Date(emp.timestamp);
        return empDate > thirtyDaysAgo || emp.status !== "completed";
      })
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not begun":
      case "not assigned":
        return "bg-gray-100 text-gray-800";
      case "in progress":
        return "bg-yellow-100 text-yellow-800";
      case "on hold":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateOverallProgress = (employee: EmployeeWithStatus) => {
    const totalApps = Object.keys(systemApplications).length;
    if (!employee.applicationStatus) return 0;

    const completedApps = Object.values(employee.applicationStatus).filter(
      (status) => status === "completed"
    ).length;
    return Math.round((completedApps / totalApps) * 100);
  };

  const getDaysSinceAdded = (timestamp: string) => {
    const addedDate = new Date(timestamp);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - addedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
 const handleEmployeeSelect = (employee: any) => {
    // Navigate to employee onboarding details
    router.push(`/management-portal/onboarding/${employee.id}`);
  };


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
          Employee Onboarding
        </h1>
        <div className="w-80">
          <p className="text-gray-600 mt-1">Manage new employee onboarding processes</p>
        </div>
        <Link
          href="/management-portal/onboarding/new"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
        >
          Add New Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Active Onboarding Processes
          </h2>
          <p className="text-gray-500 mb-4">
            Get started by adding a new employee to begin the onboarding process.
          </p>
          <Link
            href="/management-portal/onboarding/new"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Add New Employee
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {employees.map((employee) => {
            const daysSinceAdded = getDaysSinceAdded(employee.timestamp);
            const progress = calculateOverallProgress(employee);

            return (
              <div
                key={employee.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                {/* Employee Header - Always Visible */}
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-4">
                      <button
                        onClick={() => toggleEmployeeExpanded(employee.id)}
                        className="mt-1 text-gray-400 hover:text-gray-600"
                      >
                        {employee.isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/management-portal/onboarding/${employee.id}`}
                            className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                          >
                            {employee.firstName} {employee.lastName}
                          </Link>
                          <button
                            onClick={() => router.push(`/management-portal/onboarding/${employee.id}/edit`)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit Employee"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteEmployee(employee.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete Employee"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-gray-600">{employee.jobTitle}</p>
                        <p className="text-sm text-gray-500">
                          Start Date:{" "}
                          {new Date(employee.startDate).toLocaleDateString()} |
                          Added: {daysSinceAdded} day
                          {daysSinceAdded !== 1 ? "s" : ""} ago
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        Overall Progress
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {progress}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {employee.isExpanded && (
                  <div className="border-t border-gray-200 px-6 py-4 space-y-4">
                    {/* System Applications Section */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        System Applications
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(systemApplications).map(
                          ([app, defaultStatus]) => {
                            const currentStatus =
                              employee.applicationStatus?.[app] || defaultStatus;
                            return (
                              <div
                                key={app}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm text-gray-700 flex-1">
                                  {app}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                    currentStatus
                                  )}`}
                                >
                                  {currentStatus}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* IT Staff Section - Only for Admin/IT */}
                    {isAdminOrIT && (
                      <div className="border-t pt-4">
                        <h3 className="font-medium text-gray-900 mb-3">
                          IT Staff Assignment
                        </h3>
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Assign to IT Staff
                            </label>
                            <select
                              value={employee.itStaffAssignment?.assignedToId || ""}
                              onChange={(e) => updateITAssignment(employee.id, {
                                ...employee.itStaffAssignment!,
                                assignedToId: e.target.value ? parseInt(e.target.value) : undefined
                              })}
                              className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="">Not Assigned</option>
                              {itStaff.map(staff => (
                                <option key={staff.id} value={staff.id}>
                                  {staff.name} ({staff.role})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              value={employee.itStaffAssignment?.status || "not assigned"}
                              onChange={(e) => updateITAssignment(employee.id, {
                                ...employee.itStaffAssignment!,
                                status: e.target.value as ITStaffAssignment["status"]
                              })}
                              className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="not assigned">Not Assigned</option>
                              <option value="in progress">In Progress</option>
                              <option value="on hold">On Hold</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => applyITAssignment(employee.id, employee.itStaffAssignment!)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                        {employee.itStaffAssignment?.assignedTo && (
                          <div className="mt-2 text-sm text-gray-600">
                            Currently assigned to: {employee.itStaffAssignment.assignedTo.name}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="border-t pt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        {daysSinceAdded >= 25 && (
                          <span className="text-amber-600 font-medium">
                            Will be archived in {30 - daysSinceAdded} days
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/management-portal/onboarding/${employee.id}`}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Update Status
                        </Link>
                        <button className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
                          Mark Complete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}