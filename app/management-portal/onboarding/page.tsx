"use client";

import React from "react";
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
  ComputerDesktopIcon,
  BellAlertIcon,
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

// NEW: Portal interface
interface Portal {
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
  portals: Portal[]; // NEW: Portals array
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

  // NEW: Alert status state
  const [lastAlertCheck, setLastAlertCheck] = useState<string | null>(null);
  const [sendingAlerts, setSendingAlerts] = useState(false);

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
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    new Set()
  );
  const [showDefaultTasksModal, setShowDefaultTasksModal] = useState(false);
  const [editingTask, setEditingTask] = useState<OnboardingTask | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskStatus, setEditTaskStatus] =
    useState<OnboardingTask["status"]>("not begun");
  // Update the defaultTasks state
  const [defaultTasks, setDefaultTasks] = useState<OnboardingTask[]>([
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

    { id: "18", name: "Waystar", status: "not begun", notes: [] },
  ]);

  const isAdminOrIT =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  // Default portals
  const defaultPortals: Portal[] = [];

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
      // Fetch default tasks from API first
      let defaultTasksFromAPI = defaultTasks;
      try {
        const defaultTasksResponse = await fetch(
          "/api/onboarding/default-tasks"
        );
        if (defaultTasksResponse.ok) {
          defaultTasksFromAPI = await defaultTasksResponse.json();
          setDefaultTasks(defaultTasksFromAPI); // Update state with API tasks
          console.log("✅ Loaded default tasks from API");
        } else {
          console.warn(
            "⚠️ Could not fetch default tasks from API, using local defaults"
          );
        }
      } catch (apiError) {
        console.warn(
          "⚠️ Error fetching default tasks from API, using local defaults:",
          apiError
        );
      }

      const response = await fetch("/api/employees?status=active");
      if (response.ok) {
        const employeesData = await response.json();

        const employeesWithDetails = await Promise.all(
          employeesData.map(async (employee: Employee) => {
            try {
              // Use default tasks from API (or fallback to local defaults)
              let onboardingTasks = [...defaultTasksFromAPI];
              let portals = [...defaultPortals];

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

              // Fetch saved portals with better error handling
              try {
                const portalsResponse = await fetch(
                  `/api/employees/${employee.id}/portals`
                );

                if (portalsResponse.ok) {
                  const savedPortals = await portalsResponse.json();
                  console.log(
                    `✅ Loaded ${savedPortals.length} portals for employee ${employee.id}`
                  );

                  if (savedPortals && savedPortals.length > 0) {
                    // Merge with defaults to ensure all default portals are present
                    const mergedPortals = [...defaultPortals];

                    savedPortals.forEach((savedPortal: Portal) => {
                      const existingIndex = mergedPortals.findIndex(
                        (p) => p.id === savedPortal.id
                      );
                      if (existingIndex >= 0) {
                        // Update existing portal with saved data
                        mergedPortals[existingIndex] = {
                          ...mergedPortals[existingIndex],
                          ...savedPortal,
                        };
                      } else {
                        // Add custom portal
                        mergedPortals.push(savedPortal);
                      }
                    });

                    portals = mergedPortals;
                  }
                } else if (portalsResponse.status === 404) {
                  // Table doesn't exist yet - this is normal for new installations
                  console.log(
                    `ℹ️ Portals table not found for employee ${employee.id}, using defaults`
                  );
                  portals = [...defaultPortals];
                }
              } catch (portalsError) {
                console.warn(
                  `Error fetching portals for employee ${employee.id}, using defaults:`,
                  portalsError
                );
                portals = [...defaultPortals];
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
                portals,
                itStaffAssignment,
                isExpanded: false,
              };
            } catch (error) {
              console.error(`Error processing employee ${employee.id}:`, error);
              return {
                ...employee,
                onboardingTasks: [...defaultTasksFromAPI], // Use API tasks as fallback
                portals: [...defaultPortals],
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

  // Function to manually trigger alerts
  const triggerOnboardingAlerts = async () => {
    setSendingAlerts(true);
    try {
      const response = await fetch("/api/onboarding/check-incomplete-tasks", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Alerts sent: ${result.notificationsSent} notifications`);
        setLastAlertCheck(new Date().toLocaleString());
      } else {
        const error = await response.json();
        alert(`Failed to send alerts: ${error.error}`);
      }
    } catch (error) {
      console.error("Error triggering alerts:", error);
      alert("Failed to trigger alerts");
    } finally {
      setSendingAlerts(false);
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

  // NEW: Helper function to update employee portals
  const updateEmployeePortals = async (
    employeeId: number,
    portals: Portal[]
  ) => {
    try {
      await fetch(`/api/employees/${employeeId}/portals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portals),
      });
    } catch (error) {
      console.error("Error updating employee portals:", error);
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
    const allPortals = classGroup.employees.flatMap((emp) =>
      emp.portals.filter((portal) => portal.status !== "not applicable")
    );

    const totalItems = allTasks.length + allPortals.length;
    if (totalItems === 0) return 0;

    const completedTasks = allTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const completedPortals = allPortals.filter(
      (portal) => portal.status === "completed"
    ).length;

    const totalCompleted = completedTasks + completedPortals;
    return Math.round((totalCompleted / totalItems) * 100);
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

  // NEW: Add custom portal function
  const addCustomPortal = (employeeId: number) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              portals: [
                ...emp.portals,
                {
                  id: `portal-custom-${Date.now()}`,
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

  // Delete task function that preserves expanded state
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

  // NEW: Delete portal function
  const deletePortal = (employeeId: number, portalId: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              portals: emp.portals.filter((portal) => portal.id !== portalId),
              isExpanded: emp.isExpanded, // Preserve expanded state
            }
          : emp
      )
    );
  };

  // Toggle class expansion
  const toggleClassExpanded = useCallback((classId: string) => {
    setExpandedClasses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  }, []);

  // Check if class is expanded
  const isClassExpanded = useCallback(
    (classId: string) => {
      return expandedClasses.has(classId);
    },
    [expandedClasses]
  );

  // NEW: Edit task note function
  const editTaskNote = (
    employeeId: number,
    taskId: string,
    noteIndex: number,
    newContent: string
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            onboardingTasks: emp.onboardingTasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    notes: task.notes.map((note, index) =>
                      index === noteIndex
                        ? { ...note, content: newContent }
                        : note
                    ),
                  }
                : task
            ),
            isExpanded: emp.isExpanded,
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

  // NEW: Remove task note function
  const removeTaskNote = (
    employeeId: number,
    taskId: string,
    noteIndex: number
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            onboardingTasks: emp.onboardingTasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    notes: task.notes.filter((_, index) => index !== noteIndex),
                  }
                : task
            ),
            isExpanded: emp.isExpanded,
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

  // NEW: Edit portal note function
  const editPortalNote = (
    employeeId: number,
    portalId: string,
    noteIndex: number,
    newContent: string
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            portals: emp.portals.map((portal) =>
              portal.id === portalId
                ? {
                    ...portal,
                    notes: portal.notes.map((note, index) =>
                      index === noteIndex
                        ? { ...note, content: newContent }
                        : note
                    ),
                  }
                : portal
            ),
            isExpanded: emp.isExpanded,
          }
        : emp
    );

    setEmployees(updatedEmployees);

    // Save to database
    const employee = updatedEmployees.find((emp) => emp.id === employeeId);
    if (employee) {
      fetch(`/api/employees/${employeeId}/portals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee.portals),
      });
    }
  };

  // NEW: Remove portal note function
  const removePortalNote = (
    employeeId: number,
    portalId: string,
    noteIndex: number
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            portals: emp.portals.map((portal) =>
              portal.id === portalId
                ? {
                    ...portal,
                    notes: portal.notes.filter(
                      (_, index) => index !== noteIndex
                    ),
                  }
                : portal
            ),
            isExpanded: emp.isExpanded,
          }
        : emp
    );

    setEmployees(updatedEmployees);

    // Save to database
    const employee = updatedEmployees.find((emp) => emp.id === employeeId);
    if (employee) {
      fetch(`/api/employees/${employeeId}/portals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee.portals),
      });
    }
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

  // NEW: Update portal status function
  const updatePortalStatus = async (
    employeeId: number,
    portalId: string,
    status: Portal["status"],
    completedBy?: string
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            portals: emp.portals.map((portal) =>
              portal.id === portalId
                ? {
                    ...portal,
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
                : portal
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
        await fetch(`/api/employees/${employeeId}/portals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employee.portals),
        });
      }
    } catch (error) {
      console.error("Error saving portal status:", error);
    }
  };

  // Add this function with your other functions
  const updateDefaultTasksForAllEmployees = async () => {
    if (
      !confirm(
        "This will:\n1. Update default tasks for ALL FUTURE employees\n2. Add missing tasks to ALL EXISTING employees\n\nContinue?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // 1. Save the updated default tasks to the database
      const saveDefaultTasksResponse = await fetch(
        "/api/onboarding/default-tasks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultTasks),
        }
      );

      if (!saveDefaultTasksResponse.ok) {
        throw new Error("Failed to save default tasks to database");
      }

      // 2. Update existing employees with missing tasks
      const updatePromises = employees.map(async (employee) => {
        const existingTaskIds = new Set(
          employee.onboardingTasks.map((task) => task.id)
        );
        const newDefaultTasks = defaultTasks.filter(
          (task) => !existingTaskIds.has(task.id)
        );

        const updatedTasks = [...employee.onboardingTasks, ...newDefaultTasks];

        await updateEmployeeTasks(employee.id, updatedTasks);

        return {
          ...employee,
          onboardingTasks: updatedTasks,
        };
      });

      const updatedEmployees = await Promise.all(updatePromises);
      setEmployees(updatedEmployees);

      alert(
        `✅ Successfully updated!\n\n• Default tasks saved for future employees\n• ${updatedEmployees.length} existing employees updated with new tasks`
      );
    } catch (error) {
      console.error("Error updating default tasks:", error);
      alert("Failed to update default tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add task note function that preserves expanded state
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

  // NEW: Add portal note function
  const addPortalNote = (
    employeeId: number,
    portalId: string,
    noteContent: string
  ) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            portals: emp.portals.map((portal) =>
              portal.id === portalId
                ? {
                    ...portal,
                    notes: [
                      ...portal.notes,
                      {
                        content: noteContent,
                        timestamp: new Date().toISOString(),
                        author: currentUser?.name,
                      },
                    ],
                  }
                : portal
            ),
            isExpanded: emp.isExpanded, // Preserve expanded state
          }
        : emp
    );

    setEmployees(updatedEmployees);

    // Save to database
    const employee = updatedEmployees.find((emp) => emp.id === employeeId);
    if (employee) {
      fetch(`/api/employees/${employeeId}/portals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee.portals),
      });
    }
  };

  const DefaultTasksModal = () => {
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskStatus, setNewTaskStatus] =
      useState<OnboardingTask["status"]>("not begun");

    const addNewDefaultTask = async () => {
      if (!newTaskName.trim()) {
        alert("Please enter a task name");
        return;
      }

      try {
        setLoading(true);

        // Create the new task
        const newTask: OnboardingTask = {
          id: `task-${Date.now()}`,
          name: newTaskName.trim(),
          status: newTaskStatus,
          notes: [],
        };

        // Add to default tasks state
        const updatedDefaultTasks = [...defaultTasks, newTask];
        setDefaultTasks(updatedDefaultTasks);

        // Save to database via API
        const saveDefaultTasksResponse = await fetch(
          "/api/onboarding/default-tasks",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedDefaultTasks),
          }
        );

        if (!saveDefaultTasksResponse.ok) {
          throw new Error("Failed to save default tasks to database");
        }

        // Reset form
        setNewTaskName("");
        setNewTaskStatus("not begun");

        alert(`✅ Task "${newTaskName}" added to default tasks!`);
      } catch (error) {
        console.error("Error adding new task:", error);
        alert("Failed to add new task. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const startEditTask = (task: OnboardingTask) => {
      setEditingTask(task);
      setEditTaskName(task.name);
      setEditTaskStatus(task.status);
    };

    const saveEditedTask = async () => {
      if (!editingTask || !editTaskName.trim()) {
        alert("Please enter a task name");
        return;
      }

      try {
        setLoading(true);

        // Update default tasks state
        const updatedDefaultTasks = defaultTasks.map((task) =>
          task.id === editingTask.id
            ? { ...task, name: editTaskName.trim(), status: editTaskStatus }
            : task
        );
        setDefaultTasks(updatedDefaultTasks);

        // Save to database via API
        const saveDefaultTasksResponse = await fetch(
          "/api/onboarding/default-tasks",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedDefaultTasks),
          }
        );

        if (!saveDefaultTasksResponse.ok) {
          throw new Error("Failed to save default tasks to database");
        }

        // Update all employees who have this task
        const updatePromises = employees.map(async (employee) => {
          const taskIndex = employee.onboardingTasks.findIndex(
            (task) => task.id === editingTask.id
          );

          if (taskIndex !== -1) {
            // Task exists in employee's tasks - update it
            const updatedTasks = [...employee.onboardingTasks];
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              name: editTaskName.trim(),
              status: editTaskStatus,
            };

            await updateEmployeeTasks(employee.id, updatedTasks);

            return {
              ...employee,
              onboardingTasks: updatedTasks,
            };
          }

          return employee;
        });

        const updatedEmployees = await Promise.all(updatePromises);
        setEmployees(updatedEmployees);

        // Reset editing state
        setEditingTask(null);
        setEditTaskName("");
        setEditTaskStatus("not begun");

        const employeesUpdated = updatedEmployees.filter((emp) =>
          emp.onboardingTasks.some((task) => task.id === editingTask.id)
        ).length;

        alert(
          `✅ Task updated successfully! Updated ${employeesUpdated} employees.`
        );
      } catch (error) {
        console.error("Error updating task:", error);
        alert("Failed to update task. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const deleteDefaultTask = async (taskId: string, taskName: string) => {
      if (
        !confirm(
          `Are you sure you want to delete the task "${taskName}"?\n\nThis will:\n• Remove it from default tasks for FUTURE employees\n• Remove it from ALL EXISTING employees (${employees.length} employees)\n\nThis action cannot be undone.`
        )
      ) {
        return;
      }

      try {
        setLoading(true);

        // 1. Remove from default tasks state
        const updatedDefaultTasks = defaultTasks.filter(
          (task) => task.id !== taskId
        );
        setDefaultTasks(updatedDefaultTasks);

        // 2. Save to database via API
        const saveDefaultTasksResponse = await fetch(
          "/api/onboarding/default-tasks",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedDefaultTasks),
          }
        );

        if (!saveDefaultTasksResponse.ok) {
          throw new Error("Failed to save default tasks to database");
        }

        // 3. Remove this task from ALL existing employees
        const updatePromises = employees.map(async (employee) => {
          const updatedTasks = employee.onboardingTasks.filter(
            (task) => task.id !== taskId
          );

          // Only update if the task was actually removed
          if (updatedTasks.length !== employee.onboardingTasks.length) {
            await updateEmployeeTasks(employee.id, updatedTasks);
          }

          return {
            ...employee,
            onboardingTasks: updatedTasks,
          };
        });

        const updatedEmployees = await Promise.all(updatePromises);
        setEmployees(updatedEmployees);

        // Count how many employees actually had this task
        const employeesAffected = employees.filter((emp) =>
          emp.onboardingTasks.some((task) => task.id === taskId)
        ).length;

        alert(
          `✅ Task "${taskName}" deleted successfully!\n\n• Removed from default tasks\n• Removed from ${employeesAffected} employees`
        );
      } catch (error) {
        console.error("Error deleting task:", error);
        alert("Failed to delete task. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const applyAllChangesToEmployees = async () => {
      if (
        !confirm(
          `This will sync ALL ${employees.length} employees with the current default tasks.\n\nThis will:\n• Add missing default tasks\n• Update existing task names/status\n• Remove tasks that are no longer in default tasks\n• Preserve custom tasks\n\nContinue?`
        )
      ) {
        return;
      }

      try {
        setLoading(true);

        // Create a set of current default task IDs for quick lookup
        const defaultTaskIds = new Set(defaultTasks.map((task) => task.id));

        const updatePromises = employees.map(async (employee) => {
          // Create a map of existing tasks by ID for quick lookup
          const existingTasksMap = new Map(
            employee.onboardingTasks.map((task) => [task.id, task])
          );

          // Start with current default tasks
          const mergedTasks = defaultTasks.map((defaultTask) => {
            const existingTask = existingTasksMap.get(defaultTask.id);

            if (existingTask) {
              // Task exists - update name and status but preserve notes and custom data
              return {
                ...existingTask,
                name: defaultTask.name,
                status: defaultTask.status,
              };
            } else {
              // Task doesn't exist - add it
              return { ...defaultTask };
            }
          });

          // Add any custom tasks that aren't in default tasks
          const customTasks = employee.onboardingTasks.filter(
            (task) => task.isCustom || !defaultTaskIds.has(task.id)
          );

          const finalTasks = [...mergedTasks, ...customTasks];

          await updateEmployeeTasks(employee.id, finalTasks);

          return {
            ...employee,
            onboardingTasks: finalTasks,
          };
        });

        const updatedEmployees = await Promise.all(updatePromises);
        setEmployees(updatedEmployees);

        const tasksRemoved = employees.flatMap((emp) =>
          emp.onboardingTasks.filter(
            (task) => !task.isCustom && !defaultTaskIds.has(task.id)
          )
        ).length;

        alert(
          `✅ Successfully synced all ${updatedEmployees.length} employees!\n\n• Removed ${tasksRemoved} tasks no longer in default list\n• Updated task names/status\n• Preserved custom tasks`
        );
      } catch (error) {
        console.error("Error applying changes to employees:", error);
        alert("Failed to apply changes to employees. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const applyToAllEmployees = async (task: OnboardingTask) => {
      if (
        !confirm(`Add "${task.name}" to all ${employees.length} employees?`)
      ) {
        return;
      }

      try {
        setLoading(true);

        const updatePromises = employees.map(async (employee) => {
          // Check if task already exists
          const taskExists = employee.onboardingTasks.some(
            (empTask) =>
              empTask.id === task.id ||
              empTask.name.toLowerCase() === task.name.toLowerCase()
          );

          if (!taskExists) {
            const updatedTasks = [...employee.onboardingTasks, { ...task }];
            await updateEmployeeTasks(employee.id, updatedTasks);

            return {
              ...employee,
              onboardingTasks: updatedTasks,
            };
          }

          return employee;
        });

        const updatedEmployees = await Promise.all(updatePromises);
        setEmployees(updatedEmployees);

        const employeesUpdated = updatedEmployees.filter((emp) =>
          emp.onboardingTasks.some((empTask) => empTask.id === task.id)
        ).length;

        alert(`✅ Task "${task.name}" added to ${employeesUpdated} employees!`);
      } catch (error) {
        console.error("Error applying task to employees:", error);
        alert("Failed to apply task to employees. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Manage Default Tasks</h3>

          <div className="flex gap-6 flex-1 overflow-hidden">
            {/* Left Panel - Add New Task */}
            <div className="w-1/3 border-r pr-6">
              <h4 className="font-medium text-gray-900 mb-3">Add New Task</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name..."
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Status
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) =>
                      setNewTaskStatus(
                        e.target.value as OnboardingTask["status"]
                      )
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="not begun">Not Begun</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="not applicable">Not Applicable</option>
                  </select>
                </div>

                <button
                  onClick={addNewDefaultTask}
                  disabled={loading || !newTaskName.trim()}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Adding..." : "Add to Default Tasks"}
                </button>
              </div>
            </div>

            {/* Right Panel - Existing Tasks */}
            <div className="w-2/3 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-3">
                Default Tasks ({defaultTasks.length})
              </h4>

              {editingTask ? (
                // Edit Mode
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                  <h5 className="font-medium mb-3">Edit Task</h5>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTaskName}
                      onChange={(e) => setEditTaskName(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                    <select
                      value={editTaskStatus}
                      onChange={(e) =>
                        setEditTaskStatus(
                          e.target.value as OnboardingTask["status"]
                        )
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="not begun">Not Begun</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="not applicable">Not Applicable</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditedTask}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTask(null)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                {defaultTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{task.name}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded-full ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                        <span>•</span>
                        <span>ID: {task.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => applyToAllEmployees(task)}
                        className="text-green-600 hover:text-green-800 text-sm"
                        title="Add to all employees"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEditTask(task)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Edit task"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteDefaultTask(task.id, task.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Delete from default tasks"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {defaultTasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No default tasks configured
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <div className="text-sm text-gray-500">
              {employees.length} active employees • {defaultTasks.length}{" "}
              default tasks
            </div>
            <div className="flex gap-3">
              <button
                onClick={applyAllChangesToEmployees}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Applying..." : "Apply All to Employees"}
              </button>
              <button
                onClick={() => setShowDefaultTasksModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  //  Class Card Component

  const ClassCard = React.memo(
    ({ classGroup }: { classGroup: OnboardingClass }) => {
      const handleClassToggle = useCallback(
        (e: React.MouseEvent) => {
          e.stopPropagation();
          toggleClassExpanded(classGroup.id);
        },
        [classGroup.id, toggleClassExpanded]
      );

      // Expand All Employees
      const handleExpandAll = useCallback(
        (e: React.MouseEvent) => {
          e.stopPropagation();
          setEmployees((prev) =>
            prev.map((emp) =>
              classGroup.employees.some((classEmp) => classEmp.id === emp.id)
                ? { ...emp, isExpanded: true }
                : emp
            )
          );
        },
        [classGroup.employees]
      );

      // Collapse All Employees
      const handleCollapseAll = useCallback(
        (e: React.MouseEvent) => {
          e.stopPropagation();
          setEmployees((prev) =>
            prev.map((emp) =>
              classGroup.employees.some((classEmp) => classEmp.id === emp.id)
                ? { ...emp, isExpanded: false }
                : emp
            )
          );
        },
        [classGroup.employees]
      );

      return (
        <div className="class-card bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Class Header with Enhanced Controls */}
          <div className="class-header bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <button
                    onClick={handleClassToggle}
                    className="mt-1 text-gray-400 hover:text-gray-600"
                  >
                    {isClassExpanded(classGroup.id) ? (
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

                    {/* Expand/Collapse All Buttons */}
                    {isClassExpanded(classGroup.id) && (
                      <>
                        <button
                          onClick={handleExpandAll}
                          className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center"
                          title="Expand All Employees"
                        >
                          <ChevronDownIcon className="h-4 w-4 mr-1" />
                          Expand All
                        </button>

                        <button
                          onClick={handleCollapseAll}
                          className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded flex items-center"
                          title="Collapse All Employees"
                        >
                          <ChevronRightIcon className="h-4 w-4 mr-1" />
                          Collapse All
                        </button>
                      </>
                    )}

                    {/* Print Class Notes Button */}
                    <button
                      onClick={() => generateClassNotesReport(classGroup)}
                      className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded flex items-center"
                      title="Print Class Notes"
                      disabled={
                        !classGroup.classNotes &&
                        !classGroup.trainerNotes &&
                        !classGroup.itNotes
                      }
                    >
                      <PrinterIcon className="h-4 w-4 mr-1" />
                      Print Notes
                    </button>

                    {/* Bulk Print Reports Button */}
                    <button
                      onClick={() => generateBulkPrintReport(classGroup)}
                      className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center"
                      title="Print Reports for All Employees"
                    >
                      <PrinterIcon className="h-4 w-4 mr-1" />
                      Print All Reports
                    </button>

                    {/* Archive Entire Class Button */}
                    <button
                      onClick={() => archiveEntireClass(classGroup)}
                      className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded flex items-center"
                      title="Archive Entire Class"
                    >
                      <ArchiveBoxIcon className="h-4 w-4 mr-1" />
                      Archive Class
                    </button>

                    <button
                      onClick={() => {
                        setSelectedClass(classGroup);
                        setClassNotes(classGroup.classNotes || "");
                        setShowClassNotesModal(true);
                      }}
                      className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded flex items-center"
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
                    {new Date(classGroup.startDate).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
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
                      style={{
                        width: `${calculateClassProgress(classGroup)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {calculateClassProgress(classGroup)}%
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {getCompletionStats(classGroup)}
                </div>
                {isClassExpanded(classGroup.id) && (
                  <div className="text-xs text-blue-600 mt-1">
                    {
                      classGroup.employees.filter((emp) => emp.isExpanded)
                        .length
                    }{" "}
                    of {classGroup.employees.length} expanded
                  </div>
                )}
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
          {isClassExpanded(classGroup.id) && (
            <div className="p-6">
              <div className="grid gap-6">
                {classGroup.employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="employee-card bg-white rounded-lg shadow-sm border border-gray-200"
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
                              onClick={(e) => {
                                e.stopPropagation();
                                addCustomTask(employee.id);
                              }}
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

                        {/* Portals Section */}
                        <div className="border-t pt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium text-gray-900 flex items-center">
                              <ComputerDesktopIcon className="h-5 w-5 mr-2 text-blue-500" />
                              Portals
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addCustomPortal(employee.id);
                              }}
                              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Portal
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {employee.portals.map((portal) =>
                              renderPortalItem(employee, portal)
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
                                    employee.itStaffAssignment?.assignedToId ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateITAssignment(employee.id, {
                                      ...employee.itStaffAssignment!,
                                      assignedToId: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    });
                                  }}
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
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateITAssignment(employee.id, {
                                      ...employee.itStaffAssignment!,
                                      status: e.target
                                        .value as ITStaffAssignment["status"],
                                    });
                                  }}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                  <option value="not assigned">
                                    Not Assigned
                                  </option>
                                  <option value="in progress">
                                    In Progress
                                  </option>
                                  <option value="on hold">On Hold</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                              <div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateITAssignment(
                                      employee.id,
                                      employee.itStaffAssignment!
                                    );
                                  }}
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
                                {30 - getDaysSinceAdded(employee.timestamp)}{" "}
                                days
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePrintReport(employee);
                              }}
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
    }
  );

  // Task Item Component with Local State
  const TaskItem = React.memo(
    ({
      employee,
      task,
    }: {
      employee: EmployeeWithDetails;
      task: OnboardingTask;
    }) => {
      const [localTaskName, setLocalTaskName] = useState(task.name);
      const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
      const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(
        null
      );
      const [editingNoteContent, setEditingNoteContent] = useState("");

      // Update local state when task changes
      useEffect(() => {
        setLocalTaskName(task.name);
        setHasUnsavedChanges(false);
      }, [task.name]);

      const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTaskName(e.target.value);
        setHasUnsavedChanges(true);
      };

      // NEW: Start editing a note
      const startEditingNote = (noteIndex: number, currentContent: string) => {
        setEditingNoteIndex(noteIndex);
        setEditingNoteContent(currentContent);
      };

      // NEW: Save edited note
      const saveEditedNote = () => {
        if (editingNoteIndex !== null && editingNoteContent.trim()) {
          editTaskNote(
            employee.id,
            task.id,
            editingNoteIndex,
            editingNoteContent.trim()
          );
          setEditingNoteIndex(null);
          setEditingNoteContent("");
        }
      };

      // NEW: Cancel editing
      const cancelEditingNote = () => {
        setEditingNoteIndex(null);
        setEditingNoteContent("");
      };

      const saveTaskName = () => {
        if (localTaskName.trim() && hasUnsavedChanges) {
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === employee.id
                ? {
                    ...emp,
                    onboardingTasks: emp.onboardingTasks.map((t) =>
                      t.id === task.id
                        ? { ...t, name: localTaskName.trim() }
                        : t
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
                className="text-xs text-gray-600 bg-gray-50 p-2 rounded group relative"
              >
                {editingNoteIndex === noteIndex ? (
                  // EDIT MODE
                  <div className="space-y-2">
                    <textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditedNote}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditingNote}
                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // VIEW MODE
                  <>
                    <div className="font-medium">
                      {note.author || "Unknown"}:
                    </div>
                    <div>{note.content}</div>
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(note.timestamp).toLocaleDateString()}
                    </div>
                    {/* EDIT/DELETE BUTTONS - Only show on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() =>
                          startEditingNote(noteIndex, note.content)
                        }
                        className="text-blue-500 hover:text-blue-700 text-xs"
                        title="Edit note"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this note?"
                            )
                          ) {
                            removeTaskNote(employee.id, task.id, noteIndex);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                        title="Delete note"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* ADD NOTE SECTION */}
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
    }
  );

  // NEW: Portal Item Component
  const PortalItem = React.memo(
    ({
      employee,
      portal,
    }: {
      employee: EmployeeWithDetails;
      portal: Portal;
    }) => {
      const [localPortalName, setLocalPortalName] = useState(portal.name);
      const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
      const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(
        null
      );
      const [editingNoteContent, setEditingNoteContent] = useState("");

      // Update local state when portal changes
      useEffect(() => {
        setLocalPortalName(portal.name);
        setHasUnsavedChanges(false);
      }, [portal.name]);

      const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPortalName(e.target.value);
        setHasUnsavedChanges(true);
      };

      const startEditingNote = (noteIndex: number, currentContent: string) => {
        setEditingNoteIndex(noteIndex);
        setEditingNoteContent(currentContent);
      };

      const saveEditedNote = () => {
        if (editingNoteIndex !== null && editingNoteContent.trim()) {
          editPortalNote(
            employee.id,
            portal.id,
            editingNoteIndex,
            editingNoteContent.trim()
          );
          setEditingNoteIndex(null);
          setEditingNoteContent("");
        }
      };

      const cancelEditingNote = () => {
        setEditingNoteIndex(null);
        setEditingNoteContent("");
      };

      const savePortalName = () => {
        if (localPortalName.trim() && hasUnsavedChanges) {
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === employee.id
                ? {
                    ...emp,
                    portals: emp.portals.map((p) =>
                      p.id === portal.id
                        ? { ...p, name: localPortalName.trim() }
                        : p
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
          savePortalName();
        }
      };

      const handleBlur = () => {
        savePortalName();
      };

      return (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {portal.isCustom ? (
                <div className="relative">
                  <input
                    type="text"
                    value={localPortalName}
                    onChange={handleNameChange}
                    onKeyPress={handleKeyPress}
                    onBlur={handleBlur}
                    placeholder="Enter portal name..."
                    className="w-full border-b border-blue-300 focus:border-blue-500 focus:outline-none py-1 text-sm pr-8 bg-transparent"
                  />
                  {hasUnsavedChanges && (
                    <div className="absolute right-0 top-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  {portal.name}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <select
                value={portal.status}
                onChange={(e) =>
                  updatePortalStatus(
                    employee.id,
                    portal.id,
                    e.target.value as Portal["status"]
                  )
                }
                className="border border-blue-300 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="not begun">Not Begun</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="not applicable">Not Applicable</option>
              </select>
              <span
                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                  portal.status
                )}`}
              >
                {portal.status}
              </span>
              {portal.isCustom && (
                <button
                  onClick={() => deletePortal(employee.id, portal.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {portal.status === "completed" && portal.completedBy && (
            <div className="text-xs text-gray-500 mb-2">
              Completed by {portal.completedBy} on{" "}
              {portal.completedAt
                ? new Date(portal.completedAt).toLocaleDateString()
                : "Unknown date"}
            </div>
          )}

          {/* UPDATED: Notes section with edit/remove functionality */}
          <div className="space-y-2">
            {portal.notes.map((note, noteIndex) => (
              <div
                key={noteIndex}
                className="text-xs text-gray-600 bg-blue-100 p-2 rounded group relative"
              >
                {editingNoteIndex === noteIndex ? (
                  // EDIT MODE
                  <div className="space-y-2">
                    <textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      className="w-full border border-blue-300 rounded px-2 py-1 text-xs resize-none bg-white"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditedNote}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditingNote}
                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // VIEW MODE
                  <>
                    <div className="font-medium">
                      {note.author || "Unknown"}:
                    </div>
                    <div className="break-words">{note.content}</div>
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(note.timestamp).toLocaleDateString()} at{" "}
                      {new Date(note.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {/* EDIT/DELETE BUTTONS - Only show on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() =>
                          startEditingNote(noteIndex, note.content)
                        }
                        className="text-blue-500 hover:text-blue-700 text-xs bg-white rounded p-1 shadow-sm"
                        title="Edit note"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this note?"
                            )
                          ) {
                            removePortalNote(employee.id, portal.id, noteIndex);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs bg-white rounded p-1 shadow-sm"
                        title="Delete note"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* ADD NOTE SECTION */}
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add a note..."
                className="flex-1 border border-blue-300 rounded px-2 py-1 text-xs bg-white"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      addPortalNote(employee.id, portal.id, input.value.trim());
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
                    addPortalNote(employee.id, portal.id, input.value.trim());
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
    }
  );

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

  const toggleEmployeeExpanded = useCallback((employeeId: number) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, isExpanded: !emp.isExpanded } : emp
      )
    );
  }, []);

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
    // Combine both tasks and portals for progress calculation
    const applicableTasks = employee.onboardingTasks.filter(
      (task) => task.status !== "not applicable"
    );
    const applicablePortals = employee.portals.filter(
      (portal) => portal.status !== "not applicable"
    );

    const totalItems = applicableTasks.length + applicablePortals.length;

    const completedTasks = applicableTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const completedPortals = applicablePortals.filter(
      (portal) => portal.status === "completed"
    ).length;

    const totalCompleted = completedTasks + completedPortals;

    return totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
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
      (task) => task.status !== "completed" && task.status !== "not applicable"
    );
    const completedPortals = employee.portals.filter(
      (portal) => portal.status === "completed"
    );
    const pendingPortals = employee.portals.filter(
      (portal) =>
        portal.status !== "completed" && portal.status !== "not applicable"
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
        .section { margin-bottom: 25px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Onboarding Report - ${employee.firstName} ${employee.lastName}</h1>
        <div class="print-date">Generated on ${new Date().toLocaleDateString()}</div>
      </div>
      
      <div>
        <h3>Progress: ${progress}%</h3>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <div class="section">
        <h3>Completed Tasks (${completedTasks.length})</h3>
        ${completedTasks
          .map(
            (task) => `<div class="task-item completed">✓ ${task.name}</div>`
          )
          .join("")}
      </div>
      
      <div class="section">
        <h3>Pending Tasks (${pendingTasks.length})</h3>
        ${pendingTasks
          .map(
            (task) =>
              `<div class="task-item">${task.name} - ${task.status}</div>`
          )
          .join("")}
      </div>

      <div class="section">
        <h3>Completed Portals (${completedPortals.length})</h3>
        ${completedPortals
          .map(
            (portal) =>
              `<div class="task-item completed">✓ ${portal.name}</div>`
          )
          .join("")}
      </div>
      
      <div class="section">
        <h3>Pending Portals (${pendingPortals.length})</h3>
        ${pendingPortals
          .map(
            (portal) =>
              `<div class="task-item">${portal.name} - ${portal.status}</div>`
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

  // Print Class Notes Function
  const generateClassNotesReport = (classGroup: OnboardingClass) => {
    // Check if there are any notes to print
    const hasNotes =
      classGroup.classNotes || classGroup.trainerNotes || classGroup.itNotes;

    if (!hasNotes) {
      alert("No class notes available to print.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to generate the class notes report.");
      return;
    }

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Class Notes Report - ${classGroup.className}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          color: #333; 
          line-height: 1.6;
        }
        .header { 
          border-bottom: 3px solid #6366f1; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .header h1 { 
          color: #6366f1; 
          margin: 0 0 10px 0; 
          font-size: 28px;
        }
        .class-info {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
          border-left: 4px solid #6366f1;
        }
        .notes-section { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
        }
        .notes-section h2 { 
          color: #374151; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        .notes-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          min-height: 120px;
          white-space: pre-wrap;
          line-height: 1.8;
        }
        .no-notes {
          color: #9ca3af;
          font-style: italic;
          text-align: center;
          padding: 40px 20px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #6366f1;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .employee-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .employee-stat-card {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
        }
        .employee-stat-number {
          font-size: 18px;
          font-weight: bold;
          color: #6366f1;
        }
        .employee-stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .print-footer {
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        .progress-container {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 5px 0;
        }
        .progress-bar-small {
          flex: 1;
          background: #e5e7eb;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill-small {
          background: #6366f1;
          height: 100%;
          border-radius: 4px;
        }
        .progress-text {
          font-size: 11px;
          color: #6b7280;
          min-width: 40px;
        }
        @media print {
          body { margin: 20px; }
          .notes-section { page-break-inside: avoid; }
          .print-footer { position: fixed; bottom: 0; width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Class Notes Report</h1>
        <div class="class-info">
          <strong>Class:</strong> ${classGroup.className}<br>
          <strong>Start Date:</strong> ${new Date(
            classGroup.startDate
          ).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}<br>
          <strong>Number of Employees:</strong> ${
            classGroup.employees.length
          }<br>
          <strong>Class Progress:</strong> ${calculateClassProgress(
            classGroup
          )}%
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${classGroup.employees.length}</div>
          <div class="stat-label">Total Employees</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${calculateClassProgress(classGroup)}%</div>
          <div class="stat-label">Class Progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${
            classGroup.employees.filter(
              (emp) => calculateOverallProgress(emp) >= 100
            ).length
          }</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>

      <!-- Class Statistics Section -->
      <div class="notes-section">
        <h2>📊 Class Statistics</h2>
        <div class="notes-content">
          <div class="employee-stats">
            <div class="employee-stat-card">
              <div class="employee-stat-number">
                ${
                  classGroup.employees.flatMap((emp) => emp.onboardingTasks)
                    .length
                }
              </div>
              <div class="employee-stat-label">Total Tasks</div>
            </div>
            <div class="employee-stat-card">
              <div class="employee-stat-number">
                ${
                  classGroup.employees
                    .flatMap((emp) => emp.onboardingTasks)
                    .filter((task) => task.status === "completed").length
                }
              </div>
              <div class="employee-stat-label">Completed Tasks</div>
            </div>
            <div class="employee-stat-card">
              <div class="employee-stat-number">
                ${classGroup.employees.flatMap((emp) => emp.portals).length}
              </div>
              <div class="employee-stat-label">Total Portals</div>
            </div>
            <div class="employee-stat-card">
              <div class="employee-stat-number">
                ${
                  classGroup.employees
                    .flatMap((emp) => emp.portals)
                    .filter((portal) => portal.status === "completed").length
                }
              </div>
              <div class="employee-stat-label">Completed Portals</div>
            </div>
          </div>
        </div>
      </div>

      <div class="notes-section">
        <h2>📋 General Class Notes</h2>
        <div class="notes-content">
          ${
            classGroup.classNotes
              ? classGroup.classNotes
              : '<div class="no-notes">No general notes available</div>'
          }
        </div>
      </div>

      <div class="notes-section">
        <h2>👨‍🏫 Trainer Notes</h2>
        <div class="notes-content">
          ${
            classGroup.trainerNotes
              ? classGroup.trainerNotes
              : '<div class="no-notes">No trainer notes available</div>'
          }
        </div>
      </div>

      <div class="notes-section">
        <h2>💻 IT Notes</h2>
        <div class="notes-content">
          ${
            classGroup.itNotes
              ? classGroup.itNotes
              : '<div class="no-notes">No IT notes available</div>'
          }
        </div>
      </div>

      <div class="notes-section">
        <h2>👥 Employee Summary</h2>
        <div class="notes-content">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb;">Employee Name</th>
                <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb;">Job Title</th>
                <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e5e7eb;">Progress</th>
                <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e5e7eb;">Tasks</th>
                <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e5e7eb;">Portals</th>
              </tr>
            </thead>
            <tbody>
              ${classGroup.employees
                .map((employee) => {
                  const completedTasks = employee.onboardingTasks.filter(
                    (task) => task.status === "completed"
                  ).length;
                  const totalTasks = employee.onboardingTasks.filter(
                    (task) => task.status !== "not applicable"
                  ).length;
                  const completedPortals = employee.portals.filter(
                    (portal) => portal.status === "completed"
                  ).length;
                  const totalPortals = employee.portals.filter(
                    (portal) => portal.status !== "not applicable"
                  ).length;

                  return `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${
                        employee.firstName
                      } ${employee.lastName}</td>
                      <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${
                        employee.jobTitle
                      }</td>
                      <td style="text-align: center; padding: 10px; border-bottom: 1px solid #f3f4f6;">
                        <div class="progress-container">
                          <div class="progress-bar-small">
                            <div class="progress-fill-small" style="width: ${calculateOverallProgress(
                              employee
                            )}%;"></div>
                          </div>
                          <span class="progress-text">${calculateOverallProgress(
                            employee
                          )}%</span>
                        </div>
                      </td>
                      <td style="text-align: center; padding: 10px; border-bottom: 1px solid #f3f4f6;">
                        <small>${completedTasks}/${totalTasks}</small>
                      </td>
                      <td style="text-align: center; padding: 10px; border-bottom: 1px solid #f3f4f6;">
                        <small>${completedPortals}/${totalPortals}</small>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="print-footer">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} • 
        NSN IT Management Portal • Class ID: ${classGroup.id}
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => {
            if (!window.closed) {
              window.close();
            }
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Bulk Print Reports Function
  // Bulk Print Reports Function
  const generateBulkPrintReport = async (classGroup: OnboardingClass) => {
    if (!classGroup.employees.length) {
      alert("No employees in this class to print reports for.");
      return;
    }

    try {
      // Create a single print window for all reports
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow pop-ups to generate bulk reports.");
        return;
      }

      let allReportsContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Onboarding Reports - ${classGroup.className}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .class-header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .class-header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .employee-report { page-break-after: always; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px dashed #ccc; }
          .employee-report:last-child { border-bottom: none; }
          .employee-header { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; margin: 10px 0; overflow: hidden; }
          .progress-fill { background: #2563eb; height: 100%; border-radius: 10px; }
          .task-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .completed { color: #059669; }
          .pending { color: #d97706; }
          .print-date { text-align: right; color: #6b7280; margin-top: 30px; }
          .section-title { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 20px 0 10px 0; }
          .task-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .section { margin-bottom: 25px; }
          @media print {
            .employee-report { page-break-after: always; }
            .class-header { position: running(classHeader); }
          }
        </style>
      </head>
      <body>
        <div class="class-header">
          <h1>Bulk Onboarding Reports - ${classGroup.className}</h1>
          <div class="print-date">Generated on ${new Date().toLocaleDateString()}</div>
        </div>
    `;

      // Generate report for each employee
      classGroup.employees.forEach((employee, index) => {
        const progress = calculateOverallProgress(employee);
        const completedTasks = employee.onboardingTasks.filter(
          (task) => task.status === "completed"
        );
        const pendingTasks = employee.onboardingTasks.filter(
          (task) =>
            task.status !== "completed" && task.status !== "not applicable"
        );
        const notApplicableTasks = employee.onboardingTasks.filter(
          (task) => task.status === "not applicable"
        );
        const completedPortals = employee.portals.filter(
          (portal) => portal.status === "completed"
        );
        const pendingPortals = employee.portals.filter(
          (portal) =>
            portal.status !== "completed" && portal.status !== "not applicable"
        );
        const notApplicablePortals = employee.portals.filter(
          (portal) => portal.status === "not applicable"
        );

        allReportsContent += `
        <div class="employee-report">
          <div class="employee-header">
            <h2>${employee.firstName} ${employee.lastName}</h2>
            <p><strong>Job Title:</strong> ${employee.jobTitle}</p>
            <p><strong>Start Date:</strong> ${new Date(
              employee.startDate
            ).toLocaleDateString()}</p>
          </div>
          
          <div>
            <h3>Progress: ${progress}%</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          
          <div class="task-grid">
            <div>
              <h4 class="section-title">Completed Tasks (${
                completedTasks.length
              })</h4>
              ${completedTasks
                .map(
                  (task) =>
                    `<div class="task-item completed">✓ ${task.name}</div>`
                )
                .join("")}
            </div>
            
            <div>
              <h4 class="section-title">Pending Tasks (${
                pendingTasks.length
              })</h4>
              ${pendingTasks
                .map(
                  (task) =>
                    `<div class="task-item pending">${task.name} - ${task.status}</div>`
                )
                .join("")}
            </div>
          </div>

          <div class="task-grid">
            <div>
              <h4 class="section-title">Completed Portals (${
                completedPortals.length
              })</h4>
              ${completedPortals
                .map(
                  (portal) =>
                    `<div class="task-item completed">✓ ${portal.name}</div>`
                )
                .join("")}
            </div>
            
            <div>
              <h4 class="section-title">Pending Portals (${
                pendingPortals.length
              })</h4>
              ${pendingPortals
                .map(
                  (portal) =>
                    `<div class="task-item pending">${portal.name} - ${portal.status}</div>`
                )
                .join("")}
            </div>
          </div>
          
          ${
            notApplicableTasks.length > 0 || notApplicablePortals.length > 0
              ? `
            <div class="section">
              <h4 class="section-title">Not Applicable</h4>
              ${
                notApplicableTasks.length > 0
                  ? `
                <div style="margin-bottom: 15px;">
                  <strong>Tasks (${notApplicableTasks.length}):</strong>
                  ${notApplicableTasks
                    .map(
                      (task) =>
                        `<div class="task-item" style="color: #6b7280;">⊘ ${task.name}</div>`
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
              ${
                notApplicablePortals.length > 0
                  ? `
                <div>
                  <strong>Portals (${notApplicablePortals.length}):</strong>
                  ${notApplicablePortals
                    .map(
                      (portal) =>
                        `<div class="task-item" style="color: #6b7280;">⊘ ${portal.name}</div>`
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }
          
          <div class="print-date">
            Report ${index + 1} of ${
          classGroup.employees.length
        } • Employee ID: ${employee.id}
          </div>
        </div>
      `;
      });

      allReportsContent += `
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => {
              if (!window.closed) {
                window.close();
              }
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;

      printWindow.document.write(allReportsContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Error generating bulk reports:", error);
      alert("Failed to generate bulk reports. Please try again.");
    }
  };
  //  Archive Entire Class Function
  const archiveEntireClass = async (classGroup: OnboardingClass) => {
    if (!classGroup.employees.length) {
      alert("No employees in this class to archive.");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to archive the entire "${classGroup.className}"?\n\n` +
        `This will archive ${classGroup.employees.length} employees and move them to the archived section.\n\n` +
        `This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      // Archive each employee in the class
      const archivePromises = classGroup.employees.map((employee) =>
        fetch(`/api/employees/${employee.id}/archive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            archivedBy: currentUser?.name || "System",
            classNotes: `Archived as part of class: ${classGroup.className}`,
          }),
        })
      );

      const results = await Promise.all(archivePromises);
      const successfulArchives = results.filter(
        (response) => response.ok
      ).length;

      if (successfulArchives === classGroup.employees.length) {
        alert(
          `Successfully archived entire class: ${classGroup.className}\n\n${successfulArchives} employees moved to archived section.`
        );

        // Refresh the employees list to remove archived ones
        fetchEmployeesWithDetails();
      } else {
        alert(
          `Partially archived class. ${successfulArchives} out of ${classGroup.employees.length} employees were archived successfully.`
        );
      }
    } catch (error) {
      console.error("Error archiving class:", error);
      alert("Failed to archive class. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Link
                  href={`/management-portal/onboarding/${employee.id}`}
                  className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()} // Prevent card toggle when clicking link
                >
                  {employee.firstName} {employee.lastName}
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/management-portal/onboarding/${employee.id}/edit`
                    );
                  }}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit Employee"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEmployee(employee.id);
                  }}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete Employee"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveEmployee(employee.id);
                  }}
                  className="text-gray-400 hover:text-orange-600"
                  title="Archive Employee"
                >
                  <ArchiveBoxIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePrintReport(employee);
                  }}
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

  // NEW: Render portal item function
  const renderPortalItem = (employee: EmployeeWithDetails, portal: Portal) => (
    <PortalItem key={portal.id} employee={employee} portal={portal} />
  );

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
          {/* NEW: Alert Status Button */}
          {/* <button
            onClick={triggerOnboardingAlerts}
            disabled={sendingAlerts}
            className={`flex items-center px-4 py-2 rounded-md font-medium ${
              sendingAlerts
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600"
            } text-white`}
            title="Send onboarding alerts for employees with incomplete tasks"
          >
            <BellAlertIcon className="h-4 w-4 mr-2" />
            {sendingAlerts ? "Sending..." : "Send Alerts"}
          </button> */}
          {/* <Link
            href="/management-portal/onboarding/archived"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
          >
            View Archived
          </Link> */}
          {isAdminOrIT && (
            <button
              onClick={() => setShowDefaultTasksModal(true)}
              className="flex items-center bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md font-medium"
              title="Manage default tasks for all employees"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Manage Default Tasks
            </button>
          )}
          <Link
            href="/management-portal/onboarding/new"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Add New Employee
          </Link>
        </div>
      </div>

      {/*  Alert Status Display */}
      {lastAlertCheck && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-sm text-green-700">
              Last alert check: {lastAlertCheck}
            </span>
          </div>
        </div>
      )}

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
      {showDefaultTasksModal && <DefaultTasksModal />}
    </div>
  );
}
