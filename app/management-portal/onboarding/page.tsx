"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon, PrinterIcon } from "@heroicons/react/24/outline";
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

interface TaskNote {
  content: string;
  timestamp: string;
  author?: string;
}

interface TaskWithNotes {
  status: "not begun" | "in progress" | "completed";
  notes: TaskNote[];
}

interface ApplicationStatus {
  [key: string]: TaskWithNotes;
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
  const [isClient, setIsClient] = useState(false);

  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  // System applications with initial status
const systemApplications: ApplicationStatus = {
  "E-Tenet ID #": { status: "not begun", notes: [] },
  "New User Network Access Request - tenetone.com": { status: "not begun", notes: [] },
  "Tenet Portal & TENET/USPI email - tenetone.com": { status: "not begun", notes: [] },
  "Citrix / Citrix Explorer": { status: "not begun", notes: [] },
  "USPI Billing drive": { status: "not begun", notes: [] },
  "CSO Public drive": { status: "not begun", notes: [] },
  "NSN1 Public drive": { status: "not begun", notes: [] },
  "Microsoft 365 license (Outlook and Teams)": { status: "not begun", notes: [] },
  "DDL - Digital Deposit Log": { status: "not begun", notes: [] },
  "Scan Chart - Req icon to be added to the user Citrix Explorer Account": { status: "not begun", notes: [] },
  "Patient Refund Portal - Role Specific": { status: "not begun", notes: [] },
  "Learn share - USPI university": { status: "not begun", notes: [] },
  "ProVation - Center Specific": { status: "not begun", notes: [] },
  "EOM Tool - Role Specific": { status: "not begun", notes: [] },
  "Bank Access - Role Specific Managers and above": { status: "not begun", notes: [] },
  "ENVI - Billing Dept": { status: "not begun", notes: [] },
  "Nimble - Billing Dept": { status: "not begun", notes: [] },
};

  useEffect(() => {
    setIsClient(true);
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

  const updateApplicationStatus = async (employeeId: number, appName: string, status: "not begun" | "in progress" | "completed") => {
  try {
    // Get current employee
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    // Update local state
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? {
            ...emp,
            applicationStatus: {
              ...emp.applicationStatus,
              [appName]: {
                ...emp.applicationStatus?.[appName],
                status
              }
            }
          }
        : emp
    ));

    // Update in database
    const updatedStatus = {
      ...employee.applicationStatus,
      [appName]: {
        ...employee.applicationStatus?.[appName],
        status
      }
    };

    await fetch(`/api/employees/${employeeId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedStatus),
    });

  } catch (error) {
    console.error("Error updating application status:", error);
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
      // Remove from local state immediately
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      
      // Force refresh the data
      await fetchEmployeesWithStatus();
      
      alert("Employee deleted successfully!");
    } else {
      const errorData = await response.json();
      alert(`Failed to delete employee: ${errorData.error}`);
    }
  } catch (error) {
    console.error("Error deleting employee:", error);
    alert("Failed to delete employee. Please try again.");
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
  if (!employee.applicationStatus) return 0;
  
  const totalApps = Object.keys(employee.applicationStatus).length;
  const completedApps = Object.values(employee.applicationStatus).filter(
    (task) => task.status === "completed"
  ).length;
  
  return totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0;
};

  const getDaysSinceAdded = (timestamp: string) => {
    const addedDate = new Date(timestamp);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - addedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleEmployeeSelect = (employee: any) => {
    router.push(`/management-portal/onboarding/${employee.id}`);
  };

  const generatePrintReport = (employee: EmployeeWithStatus) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const progress = calculateOverallProgress(employee);
    const completedTasks = Object.entries(employee.applicationStatus || {})
      .filter(([_, status]) => status === "completed")
      .map(([task]) => task);
    
    const pendingTasks = Object.entries(employee.applicationStatus || {})
      .filter(([_, status]) => status !== "completed")
      .map(([task, status]) => ({ task, status }));

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Onboarding Report - ${employee.firstName} ${employee.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin-bottom: 8px; }
          .info-label { font-weight: bold; color: #6b7280; }
          .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; margin: 10px 0; }
          .progress-fill { background: #2563eb; height: 100%; border-radius: 10px; text-align: center; color: white; font-size: 12px; line-height: 20px; }
          .task-list { margin: 15px 0; }
          .task-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .completed { color: #059669; }
          .pending { color: #d97706; }
          .not-started { color: #6b7280; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px; }
          .completed-badge { background: #d1fae5; color: #065f46; }
          .in-progress-badge { background: #fef3c7; color: #92400e; }
          .not-started-badge { background: #f3f4f6; color: #374151; }
          .print-date { text-align: right; color: #6b7280; font-size: 14px; margin-top: 30px; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Employee Onboarding Report</h1>
          <div class="print-date">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <h2>Employee Information</h2>
          <div class="employee-info">
            <div>
              <div class="info-item"><span class="info-label">Name:</span> ${employee.firstName} ${employee.lastName}</div>
              <div class="info-item"><span class="info-label">Job Title:</span> ${employee.jobTitle}</div>
              <div class="info-item"><span class="info-label">Start Date:</span> ${new Date(employee.startDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="info-item"><span class="info-label">Manager:</span> ${employee.currentManager || 'Not specified'}</div>
              <div class="info-item"><span class="info-label">Director:</span> ${employee.directorRegionalDirector || 'Not specified'}</div>
              <div class="info-item"><span class="info-label">Onboarding Status:</span> ${employee.status}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Onboarding Progress</h2>
          <div>Overall Completion: ${progress}%</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%">${progress}%</div>
          </div>
          <div>Completed Tasks: ${completedTasks.length} of ${Object.keys(employee.applicationStatus || {}).length}</div>
        </div>

        <div class="section">
          <h2>Completed Tasks</h2>
          <div class="task-list">
            ${completedTasks.length > 0 ? 
              completedTasks.map(task => `<div class="task-item completed">✓ ${task}</div>`).join('') :
              '<div class="task-item not-started">No tasks completed yet</div>'
            }
          </div>
        </div>

        <div class="section">
          <h2>Pending Tasks</h2>
          <div class="task-list">
            ${pendingTasks.length > 0 ? 
              pendingTasks.map(({task, status}) => `
                <div class="task-item pending">
                  ${task}
                  <span class="status-badge ${status === 'in progress' ? 'in-progress-badge' : 'not-started-badge'}">
                    ${status}
                  </span>
                </div>
              `).join('') :
              '<div class="task-item completed">All tasks completed!</div>'
            }
          </div>
        </div>

        ${employee.itStaffAssignment && employee.itStaffAssignment.assignedTo ? `
        <div class="section">
          <h2>IT Assignment</h2>
          <div class="info-item"><span class="info-label">Assigned To:</span> ${employee.itStaffAssignment.assignedTo.name}</div>
          <div class="info-item"><span class="info-label">Status:</span> ${employee.itStaffAssignment.status}</div>
        </div>
        ` : ''}

        <div class="print-date">
          Report generated by NSN IT Management Portal
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (!isClient || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Employee Onboarding
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and track new employee onboarding processes
          </p>
        </div>
        <div className="flex items-center space-x-4">
  
          <Link
            href="/management-portal/onboarding/new"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Add New Employee
          </Link>
        </div>
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
                          <button
                            onClick={() => generatePrintReport(employee)}
                            className="text-gray-400 hover:text-green-600"
                            title="Print Report"
                          >
                            <PrinterIcon className="h-4 w-4" />
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
      ([app, taskData]) => {
        const currentStatus = employee.applicationStatus?.[app]?.status || taskData.status;
        const noteCount = employee.applicationStatus?.[app]?.notes?.length || 0;
        
        return (
          <div
            key={app}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex-1">
              <span className="text-sm text-gray-700 block">{app}</span>
              {noteCount > 0 && (
                <span className="text-xs text-gray-500">
                  {noteCount} note{noteCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currentStatus}
                onChange={(e) => updateApplicationStatus(employee.id, app, e.target.value as any)}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
              >
                <option value="not begun">Not Begun</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <span
                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                  currentStatus
                )}`}
              >
                {currentStatus}
              </span>
            </div>
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
                        <div className="flex items-end space-x-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Assign to IT Staff
                            </label>
                            <select
                              value={employee.itStaffAssignment?.assignedToId || ""}
                              onChange={(e) => updateITAssignment(employee.id, {
                                ...employee.itStaffAssignment!,
                                assignedToId: e.target.value ? parseInt(e.target.value) : undefined
                              })}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="">Not Assigned</option>
                              {itStaff.map(staff => (
                                <option key={staff.id} value={staff.id}>
                                  {staff.name} ({staff.role})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              value={employee.itStaffAssignment?.status || "not assigned"}
                              onChange={(e) => updateITAssignment(employee.id, {
                                ...employee.itStaffAssignment!,
                                status: e.target.value as ITStaffAssignment["status"]
                              })}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="not assigned">Not Assigned</option>
                              <option value="in progress">In Progress</option>
                              <option value="on hold">On Hold</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <div>
                            <button
                              onClick={() => applyITAssignment(employee.id, employee.itStaffAssignment!)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm h-[42px]"
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
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                        >
                          Update Status
                        </Link>
                        <button 
                          onClick={() => generatePrintReport(employee)}
                          className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                        >
                          <PrinterIcon className="h-4 w-4 mr-1" />
                          Print Report
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