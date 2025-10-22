"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface TaskNote {
  content: string;
  timestamp: string;
  author?: string;
}

interface TaskWithNotes {
  status: "not begun" | "in progress" | "completed" | "not applicable";
  notes: TaskNote[];
}

interface ApplicationStatus {
  [key: string]: TaskWithNotes;
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

export default function EmployeeOnboardingDetail() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newNotes, setNewNotes] = useState<{ [key: string]: string }>({});

  const getDaysSinceAdded = (timestamp: string) => {
  const addedDate = new Date(timestamp);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - addedDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

  // System applications with proper TaskWithNotes structure
  const systemApplications: ApplicationStatus = {
    "E-Tenet ID #": { status: "not begun", notes: [] },
    "New User Network Access Request - tenetone.com": {
      status: "not begun",
      notes: [],
    },
    "Tenet Portal & TENET/USPI email - tenetone.com": {
      status: "not begun",
      notes: [],
    },
    "Citrix / Citrix Explorer": { status: "not begun", notes: [] },
    "USPI Billing drive": { status: "not begun", notes: [] },
    "CSO Public drive": { status: "not begun", notes: [] },
    "NSN1 Public drive": { status: "not begun", notes: [] },
    "Microsoft 365 license (Outlook and Teams)": {
      status: "not begun",
      notes: [],
    },
    "DDL - Digital Deposit Log": { status: "not begun", notes: [] },
    "Scan Chart - Req icon to be added to the user Citrix Explorer Account": {
      status: "not begun",
      notes: [],
    },
    "Patient Refund Portal - Role Specific": { status: "not begun", notes: [] },
    "Learn share - USPI university": { status: "not begun", notes: [] },
    "ProVation - Center Specific": { status: "not begun", notes: [] },
    "EOM Tool - Role Specific": { status: "not begun", notes: [] },
    "Bank Access - Role Specific Managers and above": {
      status: "not begun",
      notes: [],
    },
    "ENVI - Billing Dept": { status: "not begun", notes: [] },
    "Nimble - Billing Dept": { status: "not begun", notes: [] },
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [params.id]);

  const fetchEmployeeData = async () => {
    try {
      // Fetch employee data
      const employeeResponse = await fetch(`/api/employees/${params.id}`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployee(employeeData);
      }

      // Fetch application status with notes
      const statusResponse = await fetch(`/api/employees/${params.id}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();

        // Merge system applications with saved status data
        // This ensures custom tasks are preserved
        const mergedStatus: ApplicationStatus = { ...systemApplications };

        // Override with saved data (including custom tasks)
        if (statusData && typeof statusData === "object") {
          Object.keys(statusData).forEach((key) => {
            mergedStatus[key] = statusData[key];
          });
        }

        setApplicationStatus(mergedStatus);
      } else {
        // Use system applications as default
        setApplicationStatus(systemApplications);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      // Fallback to system applications
      setApplicationStatus(systemApplications);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = (
    appName: string,
    status: "not begun" | "in progress" | "completed" | "not applicable"
  ) => {
    setApplicationStatus((prev) => ({
      ...prev,
      [appName]: {
        ...prev[appName],
        status,
      },
    }));
  };

  const addCustomTask = async () => {
    if (newTaskName.trim()) {
      const taskName = newTaskName.trim();

      // Update local state immediately
      setApplicationStatus((prev) => ({
        ...prev,
        [taskName]: {
          status: "not begun",
          notes: [],
        },
      }));

      // Save to database
      await saveStatusToDatabase({
        ...applicationStatus,
        [taskName]: {
          status: "not begun",
          notes: [],
        },
      });

      setNewTaskName("");
      setShowAddTask(false);
    }
  };

  const removeCustomTask = async (taskName: string) => {
    // Update local state
    setApplicationStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[taskName];
      return newStatus;
    });

    // Save to database
    const updatedStatus = { ...applicationStatus };
    delete updatedStatus[taskName];
    await saveStatusToDatabase(updatedStatus);
  };

  // Helper function to save status to database
  const saveStatusToDatabase = async (statusData: ApplicationStatus) => {
    try {
      const response = await fetch(`/api/employees/${params.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(statusData),
      });

      if (!response.ok) {
        throw new Error("Failed to save status");
      }
    } catch (error) {
      console.error("Error saving status:", error);
      throw error;
    }
  };

  const toggleTaskExpanded = (taskName: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskName)) {
        newSet.delete(taskName);
      } else {
        newSet.add(taskName);
      }
      return newSet;
    });
  };

  const addNoteToTask = async (taskName: string) => {
    const noteContent = newNotes[taskName]?.trim();
    if (!noteContent) return;

    const newNote: TaskNote = {
      content: noteContent,
      timestamp: new Date().toISOString(),
      author: "Current User",
    };

    // Update local state
    const updatedStatus = {
      ...applicationStatus,
      [taskName]: {
        ...applicationStatus[taskName],
        notes: [...(applicationStatus[taskName]?.notes || []), newNote],
      },
    };

    setApplicationStatus(updatedStatus);

    // Save to database
    await saveStatusToDatabase(updatedStatus);

    // Clear the input
    setNewNotes((prev) => ({
      ...prev,
      [taskName]: "",
    }));
  };

  const removeNoteFromTask = async (taskName: string, noteIndex: number) => {
    // Update local state
    const updatedStatus = {
      ...applicationStatus,
      [taskName]: {
        ...applicationStatus[taskName],
        notes: applicationStatus[taskName].notes.filter(
          (_, index) => index !== noteIndex
        ),
      },
    };

    setApplicationStatus(updatedStatus);

    // Save to database
    await saveStatusToDatabase(updatedStatus);
  };

  const markOnboardingComplete = async () => {
    if (
      !confirm(
        "Mark this employee's onboarding as complete? This will archive their onboarding process."
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      // First save the current status
      await saveStatusToDatabase(applicationStatus);

      // Then update employee status to completed
      await fetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      alert("Onboarding marked as complete!");
      router.push("/management-portal/onboarding");
      router.refresh();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Failed to mark as complete. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      await saveStatusToDatabase(applicationStatus);
      alert("Status and notes updated successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error saving status:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not begun":
        return "bg-gray-100 text-gray-800";
      case "in progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "not applicable":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateProgress = () => {
    // Filter out "not applicable" tasks
    const applicableTasks = Object.values(applicationStatus).filter(
      (task) => task.status !== "not applicable"
    );

    const totalApps = applicableTasks.length;
    const completedApps = applicableTasks.filter(
      (task) => task.status === "completed"
    ).length;

    return totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0;
  };

  const isCustomTask = (taskName: string) => {
    return !systemApplications.hasOwnProperty(taskName);
  };



  const formatNoteTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Employee Not Found
        </h2>
        <p className="text-gray-500 mb-4">
          The employee you're looking for doesn't exist.
        </p>
        <Link
          href="/management-portal/onboarding"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
        >
          Back to Onboarding
        </Link>
      </div>
    );
  }

  
 const daysSinceAdded = getDaysSinceAdded(employee.timestamp);
  const progress = calculateProgress();

  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-600">{employee.jobTitle}</p>
            <p className="text-sm text-gray-500">
              Start Date: {new Date(employee.startDate).toLocaleDateString()} |
              Added: {daysSinceAdded} day{daysSinceAdded !== 1 ? "s" : ""} ago
            </p>
          </div>
        </div>

        {employee.status === "active" && (
          <button
            onClick={markOnboardingComplete}
            disabled={saving}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
          >
            Mark Complete
          </button>
        )}
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Onboarding Progress
          </h2>
          <span className="text-sm font-medium text-gray-700">
            {progress}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>
            {
              Object.values(applicationStatus).filter(
                (task) => task.status === "completed"
              ).length
            }{" "}
            of {Object.keys(applicationStatus).length} tasks completed
          </span>
          <span
            className={daysSinceAdded >= 25 ? "text-amber-600 font-medium" : ""}
          >
            {daysSinceAdded >= 25
              ? `Will auto-archive in ${30 - daysSinceAdded} days`
              : ""}
          </span>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Onboarding Tasks
          </h2>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Task
          </button>
        </div>

        {/* Add Task Form */}
        {showAddTask && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Add Custom Task
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Enter task name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                onKeyPress={(e) => e.key === "Enter" && addCustomTask()}
              />
              <button
                onClick={addCustomTask}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {Object.entries(applicationStatus).map(([app, task]) => (
            <div
              key={app}
              className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Task Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={() => toggleTaskExpanded(app)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedTasks.has(app) ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </button>
                  <span className="text-sm text-gray-700 flex-1">{app}</span>
                  {isCustomTask(app) && (
                    <TrashIcon
                      className="h-4 w-4 text-red-400 hover:text-red-600 cursor-pointer"
                      onClick={() => removeCustomTask(app)}
                      title="Remove custom task"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateApplicationStatus(app, e.target.value as any)
                    }
                    className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="not begun">Not Begun</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="not applicable">Not Applicable</option>
                  </select>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Notes Section - Collapsible */}
              {expandedTasks.has(app) && (
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex items-center mb-3">
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {task.notes?.length || 0}
                    </span>
                  </div>

                  {/* Existing Notes */}
                  {task.notes && task.notes.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {task.notes.map((note, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-700">
                              {note.content}
                            </span>
                            <button
                              onClick={() => removeNoteFromTask(app, index)}
                              className="text-red-400 hover:text-red-600 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            {note.author} •{" "}
                            {formatNoteTimestamp(note.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">
                      No notes yet. Add the first note below.
                    </p>
                  )}

                  {/* Add Note Form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNotes[app] || ""}
                      onChange={(e) =>
                        setNewNotes((prev) => ({
                          ...prev,
                          [app]: e.target.value,
                        }))
                      }
                      placeholder="Add a note..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) =>
                        e.key === "Enter" && addNoteToTask(app)
                      }
                    />
                    <button
                      onClick={() => addNoteToTask(app)}
                      disabled={!newNotes[app]?.trim()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {employee.status === "completed" && (
              <span className="text-green-600 font-medium">
                ✓ Onboarding Completed
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/management-portal/onboarding")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Back to List
            </button>
            <button
              onClick={saveAllChanges}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                "Save All Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
