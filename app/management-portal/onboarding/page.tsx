"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  ArchiveBoxIcon,
  PlusIcon,
  XMarkIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

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

interface OnboardingTask {
  id: string;
  name: string;
  status: "not begun" | "in progress" | "completed" | "not applicable";
  notes: TaskNote[];
  completedBy?: string;
  completedAt?: string;
  isCustom?: boolean;
}

interface ITStaffAssignment {
  assignedToId?: number;
  status: "not assigned" | "in progress" | "on hold" | "completed";
  assignedTo?: User;
}

interface EmployeeWithDetails extends Employee {
  onboardingTasks: OnboardingTask[];
  itStaffAssignment?: ITStaffAssignment;
  isExpanded?: boolean;
}

interface OnboardingClass {
  id: string;
  startDate: string;
  className: string;
  employees: EmployeeWithDetails[];
  classNotes?: string;
  trainerNotes?: string;
  itNotes?: string;
}

interface BulkOperation {
  classId: string;
  taskType: string;
  action: "complete" | "incomplete";
  assignedTo?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [itStaff, setItStaff] = useState<User[]>([]);
  const [isClient, setIsClient] = useState(false);

  // New state for class-based features
  const [onboardingClasses, setOnboardingClasses] = useState<OnboardingClass[]>(
    []
  );
  const [showBulkOperationsModal, setShowBulkOperationsModal] = useState(false);
  const [showClassNotesModal, setShowClassNotesModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<OnboardingClass | null>(
    null
  );
  const [classNotes, setClassNotes] = useState("");
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({
    classId: "",
    taskType: "all",
    action: "complete",
    assignedTo: "",
  });

  const isAdminOrIT =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  // Default system tasks
  const defaultTasks: OnboardingTask[] = [
    { id: "1", name: "E-Tenet ID #", status: "not begun", notes: [] },
    {
      id: "2",
      name: "New User Network Access Request - tenetone.com",
      status: "not begun",
      notes: [],
    },
    {
      id: "3",
      name: "Tenet Portal & TENET/USPI email - tenetone.com",
      status: "not begun",
      notes: [],
    },
    {
      id: "4",
      name: "Citrix / Citrix Explorer",
      status: "not begun",
      notes: [],
    },
    { id: "5", name: "USPI Billing drive", status: "not begun", notes: [] },
    { id: "6", name: "CSO Public drive", status: "not begun", notes: [] },
    { id: "7", name: "NSN1 Public drive", status: "not begun", notes: [] },
    {
      id: "8",
      name: "Microsoft 365 license (Outlook and Teams)",
      status: "not begun",
      notes: [],
    },
    {
      id: "9",
      name: "DDL - Digital Deposit Log",
      status: "not begun",
      notes: [],
    },
    {
      id: "10",
      name: "Scan Chart - Req icon to be added to the user Citrix Explorer Account",
      status: "not begun",
      notes: [],
    },
    {
      id: "11",
      name: "Patient Refund Portal - Role Specific",
      status: "not begun",
      notes: [],
    },
    {
      id: "12",
      name: "Learn share - USPI university",
      status: "not begun",
      notes: [],
    },
    {
      id: "13",
      name: "ProVation - Center Specific",
      status: "not begun",
      notes: [],
    },
    {
      id: "14",
      name: "EOM Tool - Role Specific",
      status: "not begun",
      notes: [],
    },
    {
      id: "15",
      name: "Bank Access - Role Specific Managers and above",
      status: "not begun",
      notes: [],
    },
    { id: "16", name: "ENVI - Billing Dept", status: "not begun", notes: [] },
    { id: "17", name: "Nimble - Billing Dept", status: "not begun", notes: [] },
  ];

  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
    fetchEmployeesWithDetails();
    fetchITStaff();
  }, []);

  useEffect(() => {
    // Group employees into classes whenever employees change
    if (employees.length > 0) {
      const classes = groupEmployeesByClass(employees);
      setOnboardingClasses(classes);
    }
  }, [employees]);

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

  const fetchEmployeesWithDetails = async () => {
    try {
      const response = await fetch("/api/employees?status=active");
      if (response.ok) {
        const employeesData = await response.json();

        const employeesWithDetails = await Promise.all(
          employeesData.map(async (employee: Employee) => {
            try {
              let onboardingTasks = [...defaultTasks];

              // Fetch saved tasks
              try {
                const tasksResponse = await fetch(
                  `/api/employees/${employee.id}/onboarding-tasks`
                );
                if (tasksResponse.ok) {
                  const savedTasks = await tasksResponse.json();
                  if (savedTasks && savedTasks.length > 0) {
                    onboardingTasks = savedTasks;
                  }
                }
              } catch (tasksError) {
                console.warn(
                  `No saved tasks for employee ${employee.id}, using defaults`
                );
              }

              // Fetch IT assignment
              let itStaffAssignment = { status: "not assigned" };
              try {
                const itStaffResponse = await fetch(
                  `/api/employees/${employee.id}/it-assignment`
                );
                if (itStaffResponse.ok) {
                  itStaffAssignment = await itStaffResponse.json();
                }
              } catch (itError) {
                console.warn(`No IT assignment for employee ${employee.id}`);
              }

              return {
                ...employee,
                onboardingTasks,
                itStaffAssignment,
                isExpanded: false,
              };
            } catch (error) {
              console.error(`Error processing employee ${employee.id}:`, error);
              return {
                ...employee,
                onboardingTasks: [...defaultTasks],
                itStaffAssignment: { status: "not assigned" },
                isExpanded: false,
              };
            }
          })
        );

        setEmployees(employeesWithDetails);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced grouping with weekly options
  const groupEmployeesByClass = (employees: EmployeeWithDetails[]) => {
    const classes: OnboardingClass[] = [];

    const groupedByWeek = employees.reduce((acc, employee) => {
      const startDate = new Date(employee.startDate);
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday

      const classKey = weekStart.toISOString().split("T")[0];

      if (!acc[classKey]) {
        acc[classKey] = {
          id: classKey,
          startDate: classKey,
          className: `Week of ${weekStart.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}`,
          employees: [],
          classNotes: "",
          trainerNotes: "",
          itNotes: "",
        };
      }

      acc[classKey].employees.push(employee);
      return acc;
    }, {} as Record<string, OnboardingClass>);

    return Object.values(groupedByWeek).sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  };

  // Bulk Operations
  const performBulkOperation = async (operation: BulkOperation) => {
    try {
      const classToUpdate = onboardingClasses.find(
        (c) => c.id === operation.classId
      );
      if (!classToUpdate) return;

      const updatedEmployees = await Promise.all(
        classToUpdate.employees.map(async (employee) => {
          const updatedTasks = employee.onboardingTasks.map((task) => {
            // Apply bulk operation based on task type
            const shouldUpdate =
              operation.taskType === "all" ||
              task.name
                .toLowerCase()
                .includes(operation.taskType.toLowerCase());

            if (shouldUpdate) {
              return {
                ...task,
                status:
                  operation.action === "complete" ? "completed" : "not begun",
                completedBy:
                  operation.action === "complete"
                    ? currentUser?.name
                    : undefined,
                completedAt:
                  operation.action === "complete"
                    ? new Date().toISOString()
                    : undefined,
              };
            }
            return task;
          });

          // Update employee in database
          await updateEmployeeTasks(employee.id, updatedTasks);

          return {
            ...employee,
            onboardingTasks: updatedTasks,
          };
        })
      );

      // Update local state
      setOnboardingClasses((prev) =>
        prev.map((c) =>
          c.id === operation.classId ? { ...c, employees: updatedEmployees } : c
        )
      );

      // Also update main employees state
      setEmployees((prev) =>
        prev.map((emp) => {
          const updatedEmp = updatedEmployees.find((u) => u.id === emp.id);
          return updatedEmp || emp;
        })
      );

      setShowBulkOperationsModal(false);
      alert(
        `Bulk operation completed for ${updatedEmployees.length} employees`
      );
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      alert("Failed to perform bulk operation");
    }
  };

  // Helper function to update employee tasks
  const updateEmployeeTasks = async (
    employeeId: number,
    tasks: OnboardingTask[]
  ) => {
    try {
      await fetch(`/api/employees/${employeeId}/onboarding-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tasks),
      });
    } catch (error) {
      console.error("Error updating employee tasks:", error);
      throw error;
    }
  };

  // Class Notes Management
  const updateClassNotes = async (
    classId: string,
    notes: string,
    noteType: "classNotes" | "trainerNotes" | "itNotes"
  ) => {
    try {
      setOnboardingClasses((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, [noteType]: notes } : c))
      );

      // Save to database
      await fetch(`/api/onboarding/classes/${classId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [noteType]: notes }),
      });

      setShowClassNotesModal(false);
    } catch (error) {
      console.error("Error updating class notes:", error);
    }
  };

  // Calculate class progress
  const calculateClassProgress = (classGroup: OnboardingClass) => {
    const allTasks = classGroup.employees.flatMap((emp) =>
      emp.onboardingTasks.filter((task) => task.status !== "not applicable")
    );

    if (allTasks.length === 0) return 0;

    const completedTasks = allTasks.filter(
      (task) => task.status === "completed"
    ).length;
    return Math.round((completedTasks / allTasks.length) * 100);
  };

  // Get completion stats
  const getCompletionStats = (classGroup: OnboardingClass) => {
    const totalEmployees = classGroup.employees.length;
    const employeesWithProgress = classGroup.employees.filter(
      (emp) => calculateOverallProgress(emp) > 0
    ).length;

    return `${employeesWithProgress}/${totalEmployees} employees started`;
  };

  // Add custom task function that preserves expanded state
  const addCustomTask = (employeeId: number) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              onboardingTasks: [
                ...emp.onboardingTasks,
                {
                  id: `custom-${Date.now()}`,
                  name: "",
                  status: "not begun",
                  notes: [],
                  isCustom: true,
                },
              ],
              isExpanded: emp.isExpanded, // Preserve expanded state
            }
          : emp
      )
    );
  };

  //  Delete task function that preserves expanded state
  const deleteTask = (employeeId: number, taskId: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              onboardingTasks: emp.onboardingTasks.filter(
                (task) => task.id !== taskId
              ),
              isExpanded: emp.isExpanded, // Preserve expanded state
            }
          : emp
      )
    );
  };

  // Update task status function that preserves expanded state
  const updateTaskStatus = async (
    employeeId: number,
    taskId: string,
    status: OnboardingTask["status"],
    completedBy?: string
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            onboardingTasks: emp.onboardingTasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    status,
                    completedBy:
                      status === "completed"
                        ? completedBy || currentUser?.name
                        : undefined,
                    completedAt:
                      status === "completed"
                        ? new Date().toISOString()
                        : undefined,
                  }
                : task
            ),
            isExpanded: emp.isExpanded, // Preserve expanded state
          }
        : emp
    );

    setEmployees(updatedEmployees);

    // Save to database
    try {
      const employee = updatedEmployees.find((emp) => emp.id === employeeId);
      if (employee) {
        await fetch(`/api/employees/${employeeId}/onboarding-tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employee.onboardingTasks),
        });
      }
    } catch (error) {
      console.error("Error saving task status:", error);
    }
  };

  //  Add task note function that preserves expanded state
  const addTaskNote = (
    employeeId: number,
    taskId: string,
    noteContent: string
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            onboardingTasks: emp.onboardingTasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    notes: [
                      ...task.notes,
                      {
                        content: noteContent,
                        timestamp: new Date().toISOString(),
                        author: currentUser?.name,
                      },
                    ],
                  }
                : task
            ),
            isExpanded: emp.isExpanded, // Preserve expanded state
          }
        : emp
    );

    setEmployees(updatedEmployees);

    // Save to database
    const employee = updatedEmployees.find((emp) => emp.id === employeeId);
    if (employee) {
      fetch(`/api/employees/${employeeId}/onboarding-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee.onboardingTasks),
      });
    }
  };

  // Enhanced Class Card Component
  const ClassCard = ({ classGroup }: { classGroup: OnboardingClass }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Class Header with Enhanced Controls */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5" />
                  )}
                </button>
                <h2 className="text-xl font-bold text-gray-800">
                  {classGroup.className}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedClass(classGroup);
                      setBulkOperation((prev) => ({
                        ...prev,
                        classId: classGroup.id,
                      }));
                      setShowBulkOperationsModal(true);
                    }}
                    className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center"
                    title="Bulk Operations"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Bulk Actions
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClass(classGroup);
                      setClassNotes(classGroup.classNotes || "");
                      setShowClassNotesModal(true);
                    }}
                    className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center"
                    title="Class Notes"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Class Notes
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span>{classGroup.employees.length} employees</span>
                <span>•</span>
                <span>
                  Starts{" "}
                  {new Date(classGroup.startDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {classGroup.classNotes && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 flex items-center">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      Has Notes
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress and Stats */}
            <div className="text-right">
              <div className="flex items-center gap-4 mb-2">
                <div className="text-sm text-gray-500">Class Progress</div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateClassProgress(classGroup)}%` }}
                  ></div>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {calculateClassProgress(classGroup)}%
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {getCompletionStats(classGroup)}
              </div>
            </div>
          </div>
        </div>

        {/* Class Notes Preview */}
        {classGroup.classNotes && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
            <div className="flex items-start">
              <ExclamationCircleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-yellow-800 line-clamp-2">
                {classGroup.classNotes}
              </p>
            </div>
          </div>
        )}

        {/* Employees List */}
        {isExpanded && (
          <div className="p-6">
            <div className="grid gap-6">
              {classGroup.employees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  {renderEmployeeHeader(employee)}

                  {employee.isExpanded && (
                    <div className="border-t border-gray-200 px-6 py-4 space-y-6">
                      {/* Onboarding Tasks Section */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-medium text-gray-900">
                            Onboarding Tasks
                          </h3>
                          <button
                            onClick={() => addCustomTask(employee.id)}
                            className="flex items-center bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Task
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {employee.onboardingTasks.map((task) =>
                            renderTaskItem(employee, task)
                          )}
                        </div>
                      </div>

                      {/* IT Staff Assignment Section */}
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
                                value={
                                  employee.itStaffAssignment?.assignedToId || ""
                                }
                                onChange={(e) =>
                                  updateITAssignment(employee.id, {
                                    ...employee.itStaffAssignment!,
                                    assignedToId: e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  })
                                }
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              >
                                <option value="">Not Assigned</option>
                                {itStaff.map((staff) => (
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
                                value={
                                  employee.itStaffAssignment?.status ||
                                  "not assigned"
                                }
                                onChange={(e) =>
                                  updateITAssignment(employee.id, {
                                    ...employee.itStaffAssignment!,
                                    status: e.target
                                      .value as ITStaffAssignment["status"],
                                  })
                                }
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              >
                                <option value="not assigned">
                                  Not Assigned
                                </option>
                                <option value="in progress">In Progress</option>
                                <option value="on hold">On Hold</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                            <div>
                              <button
                                onClick={() =>
                                  updateITAssignment(
                                    employee.id,
                                    employee.itStaffAssignment!
                                  )
                                }
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm h-[42px]"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-4 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {getDaysSinceAdded(employee.timestamp) >= 25 && (
                            <span className="text-amber-600 font-medium">
                              Will be archived in{" "}
                              {30 - getDaysSinceAdded(employee.timestamp)} days
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
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
              ))}
            </div>

            {/* Add Employee */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link
                href="/management-portal/onboarding/new"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Employee to this Class
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  //  Task Item Component with Local State
  const TaskItem = ({
    employee,
    task,
  }: {
    employee: EmployeeWithDetails;
    task: OnboardingTask;
  }) => {
    const [localTaskName, setLocalTaskName] = useState(task.name);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Update local state when task changes
    useEffect(() => {
      setLocalTaskName(task.name);
      setHasUnsavedChanges(false);
    }, [task.name]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalTaskName(e.target.value);
      setHasUnsavedChanges(true);
    };

    const saveTaskName = () => {
      if (localTaskName.trim() && hasUnsavedChanges) {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === employee.id
              ? {
                  ...emp,
                  onboardingTasks: emp.onboardingTasks.map((t) =>
                    t.id === task.id ? { ...t, name: localTaskName.trim() } : t
                  ),
                  isExpanded: emp.isExpanded, // Preserve expanded state
                }
              : emp
          )
        );
        setHasUnsavedChanges(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        saveTaskName();
      }
    };

    const handleBlur = () => {
      saveTaskName();
    };

    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {task.isCustom ? (
              <div className="relative">
                <input
                  type="text"
                  value={localTaskName}
                  onChange={handleNameChange}
                  onKeyPress={handleKeyPress}
                  onBlur={handleBlur}
                  placeholder="Enter task name..."
                  className="w-full border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1 text-sm pr-8"
                />
                {hasUnsavedChanges && (
                  <div className="absolute right-0 top-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {task.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <select
              value={task.status}
              onChange={(e) =>
                updateTaskStatus(
                  employee.id,
                  task.id,
                  e.target.value as OnboardingTask["status"]
                )
              }
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="not begun">Not Begun</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not applicable">Not Applicable</option>
            </select>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                task.status
              )}`}
            >
              {task.status}
            </span>
            {task.isCustom && (
              <button
                onClick={() => deleteTask(employee.id, task.id)}
                className="text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {task.status === "completed" && task.completedBy && (
          <div className="text-xs text-gray-500 mb-2">
            Completed by {task.completedBy} on{" "}
            {task.completedAt
              ? new Date(task.completedAt).toLocaleDateString()
              : "Unknown date"}
          </div>
        )}

        <div className="space-y-2">
          {task.notes.map((note, noteIndex) => (
            <div
              key={noteIndex}
              className="text-xs text-gray-600 bg-gray-50 p-2 rounded"
            >
              <div className="font-medium">{note.author || "Unknown"}:</div>
              <div>{note.content}</div>
              <div className="text-gray-400 text-xs mt-1">
                {new Date(note.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add a note..."
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    addTaskNote(employee.id, task.id, input.value.trim());
                    input.value = "";
                  }
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget
                  .previousSibling as HTMLInputElement;
                if (input.value.trim()) {
                  addTaskNote(employee.id, task.id, input.value.trim());
                  input.value = "";
                }
              }}
              className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
            >
              Add Note
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Bulk Operations Modal
  const BulkOperationsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Bulk Operations</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Type
            </label>
            <select
              value={bulkOperation.taskType}
              onChange={(e) =>
                setBulkOperation((prev) => ({
                  ...prev,
                  taskType: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Tasks</option>
              <option value="hr">HR Tasks</option>
              <option value="it">IT Tasks</option>
              <option value="training">Training Tasks</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={bulkOperation.action}
              onChange={(e) =>
                setBulkOperation((prev) => ({
                  ...prev,
                  action: e.target.value as "complete" | "incomplete",
                }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="complete">Mark Complete</option>
              <option value="incomplete">Mark Incomplete</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              This will affect {selectedClass?.employees.length} employees in{" "}
              {selectedClass?.className}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowBulkOperationsModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => performBulkOperation(bulkOperation)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Apply to All
          </button>
        </div>
      </div>
    </div>
  );

  // Class Notes Modal
  const ClassNotesModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">
          Class Notes - {selectedClass?.className}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Notes
            </label>
            <textarea
              value={classNotes}
              onChange={(e) => setClassNotes(e.target.value)}
              placeholder="General notes for the entire class..."
              className="w-full border border-gray-300 rounded px-3 py-2 h-32"
            />
            <button
              onClick={() =>
                updateClassNotes(selectedClass!.id, classNotes, "classNotes")
              }
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Save Notes
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trainer Notes
            </label>
            <textarea
              placeholder="Training-specific notes..."
              className="w-full border border-gray-300 rounded px-3 py-2 h-32"
              value={selectedClass?.trainerNotes || ""}
              onChange={(e) =>
                updateClassNotes(
                  selectedClass!.id,
                  e.target.value,
                  "trainerNotes"
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IT Notes
            </label>
            <textarea
              placeholder="IT equipment and setup notes..."
              className="w-full border border-gray-300 rounded px-3 py-2 h-32"
              value={selectedClass?.itNotes || ""}
              onChange={(e) =>
                updateClassNotes(selectedClass!.id, e.target.value, "itNotes")
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setShowClassNotesModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Archive employee function
  const archiveEmployee = async (employeeId: number) => {
    if (!confirm("Are you sure you want to archive this employee?")) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedBy: currentUser?.name || "user" }),
      });

      if (response.ok) {
        setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
        alert("Employee archived successfully!");
      } else {
        alert("Failed to archive employee.");
      }
    } catch (error) {
      console.error("Error archiving employee:", error);
      alert("Failed to archive employee.");
    }
  };

  const deleteEmployee = async (employeeId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this employee? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
        alert("Employee deleted successfully!");
      } else {
        alert("Failed to delete employee.");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee.");
    }
  };

  const toggleEmployeeExpanded = (employeeId: number) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, isExpanded: !emp.isExpanded } : emp
      )
    );
  };

  const updateITAssignment = async (
    employeeId: number,
    assignment: ITStaffAssignment
  ) => {
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/it-assignment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assignment),
        }
      );

      if (response.ok) {
        fetchEmployeesWithDetails();
      }
    } catch (error) {
      console.error("Error updating IT assignment:", error);
    }
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
      case "not applicable":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateOverallProgress = (employee: EmployeeWithDetails) => {
    const applicableTasks = employee.onboardingTasks.filter(
      (task) => task.status !== "not applicable"
    );

    const totalTasks = applicableTasks.length;
    const completedTasks = applicableTasks.filter(
      (task) => task.status === "completed"
    ).length;

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const getDaysSinceAdded = (timestamp: string) => {
    const addedDate = new Date(timestamp);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - addedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const generatePrintReport = (employee: EmployeeWithDetails) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const progress = calculateOverallProgress(employee);
    const completedTasks = employee.onboardingTasks.filter(
      (task) => task.status === "completed"
    );
    const pendingTasks = employee.onboardingTasks.filter(
      (task) => task.status !== "completed"
    );

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Onboarding Report - ${employee.firstName} ${
      employee.lastName
    }</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; }
          .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; margin: 10px 0; overflow: hidden; }
          .progress-fill { background: #2563eb; height: 100%; border-radius: 10px; }
          .task-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .completed { color: #059669; }
          .print-date { text-align: right; color: #6b7280; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Onboarding Report - ${employee.firstName} ${
      employee.lastName
    }</h1>
          <div class="print-date">Generated on ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div>
          <h3>Progress: ${progress}%</h3>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div>
          <h3>Completed Tasks (${completedTasks.length})</h3>
          ${completedTasks
            .map(
              (task) => `<div class="task-item completed">✓ ${task.name}</div>`
            )
            .join("")}
        </div>
        
        <div>
          <h3>Pending Tasks (${pendingTasks.length})</h3>
          ${pendingTasks
            .map(
              (task) =>
                `<div class="task-item">${task.name} - ${task.status}</div>`
            )
            .join("")}
        </div>
        
        <script>window.print(); setTimeout(() => window.close(), 1000);</script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const renderEmployeeHeader = (employee: EmployeeWithDetails) => {
    const daysSinceAdded = getDaysSinceAdded(employee.timestamp);
    const progress = calculateOverallProgress(employee);

    return (
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
                  onClick={() =>
                    router.push(
                      `/management-portal/onboarding/${employee.id}/edit`
                    )
                  }
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
                  onClick={() => archiveEmployee(employee.id)}
                  className="text-gray-400 hover:text-orange-600"
                  title="Archive Employee"
                >
                  <ArchiveBoxIcon className="h-4 w-4" />
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
                Start Date: {new Date(employee.startDate).toLocaleDateString()}{" "}
                | Added: {daysSinceAdded} day{daysSinceAdded !== 1 ? "s" : ""}{" "}
                ago
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Overall Progress</div>
            <div className="w-32 bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-700 mt-1">{progress}%</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskItem = (
    employee: EmployeeWithDetails,
    task: OnboardingTask
  ) => <TaskItem key={task.id} employee={employee} task={task} />;

  if (!isClient || loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
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
            href="/management-portal/onboarding/archived"
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
          >
            View Archived
          </Link>
          <Link
            href="/management-portal/onboarding/new"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Add New Employee
          </Link>
        </div>
      </div>

      {onboardingClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Active Onboarding Processes
          </h2>
          <p className="text-gray-500 mb-4">
            Get started by adding a new employee to begin the onboarding
            process.
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
          {onboardingClasses.map((classGroup) => (
            <ClassCard key={classGroup.id} classGroup={classGroup} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showBulkOperationsModal && <BulkOperationsModal />}
      {showClassNotesModal && <ClassNotesModal />}
    </div>
  );
}
