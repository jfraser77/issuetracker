"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ApplicationStatus {
  [key: string]: "not begun" | "in progress" | "completed";
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
    "Scan Chart - Req icon to be added to the user Citrix Explorer Account":
      "not begun",
    "Patient Refund Portal - Role Specific": "not begun",
    "Learn share - USPI university": "not begun",
    "ProVation - Center Specific": "not begun",
    "EOM Tool - Role Specific": "not begun",
    "Bank Access - Role Specific Managers and above": "not begun",
    "ENVI - Billing Dept": "not begun",
    "Nimble - Billing Dept": "not begun",
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

      // Fetch application status
      const statusResponse = await fetch(`/api/employees/${params.id}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setApplicationStatus(statusData);
      } else {
        // Initialize with default statuses if no status exists
        setApplicationStatus(systemApplications);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = (
    appName: string,
    status: "not begun" | "in progress" | "completed"
  ) => {
    setApplicationStatus((prev) => ({
      ...prev,
      [appName]: status,
    }));
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${params.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(applicationStatus),
      });

      if (response.ok) {
        alert("Status updated successfully!");
        // Refresh the parent page data
        router.refresh();
      } else {
        throw new Error("Failed to save status");
      }
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateProgress = () => {
    const totalApps = Object.keys(systemApplications).length;
    const completedApps = Object.values(applicationStatus).filter(
      (status) => status === "completed"
    ).length;
    return Math.round((completedApps / totalApps) * 100);
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
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Employee Not Found
        </h1>
        <Link
          href="/management-portal/onboarding"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Back to Onboarding
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-gray-600">{employee.jobTitle}</p>
          <p className="text-sm text-gray-500">
            Start Date: {new Date(employee.startDate).toLocaleDateString()}
          </p>
        </div>
        <Link
          href="/management-portal/onboarding"
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
        >
          Back to List
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Onboarding Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {calculateProgress()}% Complete
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">
            System Applications Status
          </h2>
          <div className="space-y-3">
            {Object.entries(systemApplications).map(([app, defaultStatus]) => {
              const currentStatus = applicationStatus[app] || defaultStatus;
              return (
                <div
                  key={app}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="flex-1 text-sm">{app}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        updateApplicationStatus(app, e.target.value as any)
                      }
                      className="border rounded px-2 py-1 text-sm"
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
            })}
          </div>
        </div>

        <div className="border-t pt-6 mt-6 flex gap-3">
          <button
            onClick={saveAllChanges}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save All Changes"
            )}
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            <Link href="/management-portal/onboarding">Go Back</Link>
          </button>
        </div>
      </div>
    </div>
  );
}
