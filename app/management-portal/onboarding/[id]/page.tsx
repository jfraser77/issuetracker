"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface ApplicationStatus {
  [key: string]: "not begun" | "in progress" | "completed";
}

export default function EmployeeOnboardingDetail() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(
    {}
  );
  const [loading, setLoading] = useState(true);

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
    // Fetch employee data and application status
    fetchEmployeeData();
  }, [params.id]);

  const fetchEmployeeData = async () => {
    // In a real app, fetch from your API
    setLoading(false);
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
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{employee?.name}</h1>
          <p className="text-gray-600">{employee?.jobTitle}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
        >
          Back to List
        </button>
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
                  <span className="flex-1">{app}</span>
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

        <div className="border-t pt-6 mt-6">
          <button
            onClick={() => {
              // Save all status updates
              console.log("Saving status:", applicationStatus);
              alert("Status updated successfully!");
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
}
