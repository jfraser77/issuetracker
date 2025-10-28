"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PrinterIcon,
  TrashIcon,
  ArchiveBoxArrowDownIcon,
} from "@heroicons/react/24/outline";

interface ArchivedEmployee {
  id: number;
  originalId: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  startDate: string;
  currentManager: string;
  directorRegionalDirector: string;
  applicationStatus: string;
  itStaffAssignment: string;
  timestamp: string;
  archivedAt: string;
  archivedBy: string;
}

export default function ArchivedOnboardingPage() {
  const router = useRouter();
  const [archivedEmployees, setArchivedEmployees] = useState<
    ArchivedEmployee[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<number | null>(null);

  useEffect(() => {
    fetchArchivedEmployees();
  }, []);

  const fetchArchivedEmployees = async () => {
    try {
      const response = await fetch("/api/archived-employees");
      if (response.ok) {
        const data = await response.json();
        setArchivedEmployees(data);
      } else {
        console.error("Failed to fetch archived employees");
      }
    } catch (error) {
      console.error("Error fetching archived employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const unarchiveEmployee = async (archivedEmployee: ArchivedEmployee) => {
    setUnarchivingId(archivedEmployee.id);

    try {
      const response = await fetch(
        `/api/employees/${archivedEmployee.originalId}/unarchive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unarchivedBy: "user" }),
        }
      );

      if (response.ok) {
        setArchivedEmployees((prev) =>
          prev.filter((emp) => emp.id !== archivedEmployee.id)
        );
        alert(
          "Employee unarchived successfully! They will appear in the active onboarding list."
        );
      } else {
        const errorData = await response.json();
        alert(`Failed to unarchive employee: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error unarchiving employee:", error);
      alert("Failed to unarchive employee. Please try again.");
    } finally {
      setUnarchivingId(null);
    }
  };

  const deleteArchivedEmployee = async (archivedEmployeeId: number) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this archived employee? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingId(archivedEmployeeId);

    try {
      const response = await fetch(
        `/api/archived-employees?id=${archivedEmployeeId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setArchivedEmployees((prev) =>
          prev.filter((emp) => emp.id !== archivedEmployeeId)
        );
        alert("Archived employee permanently deleted.");
      } else {
        const errorData = await response.json();
        alert(`Failed to delete archived employee: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting archived employee:", error);
      alert("Failed to delete archived employee. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const generatePrintReport = (employee: ArchivedEmployee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Archived Onboarding Report - ${employee.firstName} ${
      employee.lastName
    }</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
          .header { border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #f59e0b; margin: 0; font-size: 28px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin-bottom: 8px; }
          .info-label { font-weight: bold; color: #6b7280; display: inline-block; width: 180px; }
          .archived-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
          .print-date { text-align: right; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Archived Employee Onboarding Report</h1>
          <div class="print-date">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <h2>Employee Information</h2>
          <div class="employee-info">
            <div>
              <div class="info-item"><span class="info-label">Full Name:</span> ${
                employee.firstName
              } ${employee.lastName}</div>
              <div class="info-item"><span class="info-label">Job Title:</span> ${
                employee.jobTitle
              }</div>
              <div class="info-item"><span class="info-label">Start Date:</span> ${new Date(
                employee.startDate
              ).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="info-item"><span class="info-label">Manager:</span> ${
                employee.currentManager || "Not specified"
              }</div>
              <div class="info-item"><span class="info-label">Director:</span> ${
                employee.directorRegionalDirector || "Not specified"
              }</div>
              <div class="info-item"><span class="info-label">Archived On:</span> ${new Date(
                employee.archivedAt
              ).toLocaleDateString()}</div>
              <div class="info-item"><span class="info-label">Archived By:</span> ${
                employee.archivedBy
              }</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Onboarding Summary</h2>
          <div class="info-item"><span class="info-label">Original Added:</span> ${new Date(
            employee.timestamp
          ).toLocaleDateString()}</div>
          <div class="info-item"><span class="info-label">Days in System:</span> ${Math.floor(
            (new Date(employee.archivedAt).getTime() -
              new Date(employee.timestamp).getTime()) /
              (1000 * 60 * 60 * 24)
          )} days</div>
        </div>

        <div class="section">
          <div class="print-date">
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;">
            Archived Employee Report - NSN IT Management Portal<br>
            Archived Employee ID: ${employee.id} | Original ID: ${
      employee.originalId
    }
          </div>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Link
                href="/management-portal/onboarding"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Archived Onboarding Processes
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              View and manage archived employee onboarding records
            </p>
          </div>
          <Link
            href="/management-portal/onboarding"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Back to Active
          </Link>
        </div>

        {archivedEmployees.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Archived Employees
            </h3>
            <p className="text-gray-500 dark:text-gray-300 mb-4">
              Archived employees will appear here once they are moved from the
              active list.
            </p>
            <Link
              href="/management-portal/onboarding"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              View Active Onboarding
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Archived Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Archived By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {archivedEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Original ID: {employee.originalId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {employee.jobTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(employee.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(employee.archivedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {employee.archivedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => unarchiveEmployee(employee)}
                            disabled={unarchivingId === employee.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-offset-gray-800"
                          >
                            {unarchivingId === employee.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Unarchiving...
                              </>
                            ) : (
                              <>
                                <ArchiveBoxArrowDownIcon className="h-3 w-3 mr-1" />
                                Unarchive
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => generatePrintReport(employee)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
                          >
                            <PrinterIcon className="h-3 w-3 mr-1" />
                            Print
                          </button>
                          <button
                            onClick={() => deleteArchivedEmployee(employee.id)}
                            disabled={deletingId === employee.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-offset-gray-800"
                          >
                            {deletingId === employee.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <TrashIcon className="h-3 w-3 mr-1" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
