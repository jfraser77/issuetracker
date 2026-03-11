"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  PrinterIcon,
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface Termination {
  id: number;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  terminationDate: string;
  terminationReason: string;
  initiatedBy: string;
  status: "archived";
  trackingNumber?: string;
  equipmentDisposition: "return_to_pool" | "retire" | "pending_assessment" | "malicious_damage";
  completedByUser?: { name: string };
  checklist?: any[];
  timestamp: string;
}

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function ArchivedTerminationsPage() {
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchArchivedTerminations();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/current-user");
      if (res.ok) setCurrentUser(await res.json());
    } catch {
      // non-fatal
    }
  };

  const fetchArchivedTerminations = async () => {
    try {
      const response = await fetch("/api/terminations?filter=archived");
      if (response.ok) {
        const data = await response.json();
        setTerminations(data);
      }
    } catch (error) {
      console.error("Error fetching archived terminations:", error);
    } finally {
      setLoading(false);
    }
  };

  const restoreTermination = async (id: number, name: string) => {
    if (!confirm(`Restore "${name}" back to active terminations?\n\nStatus will be set to "Equipment Returned" and the record will reappear on the Terminations page.`)) return;
    try {
      const res = await fetch(`/api/terminations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "equipment_returned" }),
      });
      if (res.ok) {
        setTerminations((prev) => prev.filter((t) => t.id !== id));
      } else {
        const err = await res.json();
        alert(`Failed to restore termination: ${err.error ?? "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error restoring termination:", error);
      alert("Failed to restore termination. Please try again.");
    }
  };

  const deleteTermination = async (id: number, name: string) => {
    if (!confirm(`Permanently delete the termination record for "${name}"?\n\nThis action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/terminations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTerminations((prev) => prev.filter((t) => t.id !== id));
      } else {
        const err = await res.json();
        alert(`Failed to delete termination: ${err.error ?? "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting termination:", error);
      alert("Failed to delete termination. Please try again.");
    }
  };

  const generatePrintReport = (termination: Termination) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const completedChecklistItems = termination.checklist?.filter(item => item.completed) || [];
    const totalChecklistItems = termination.checklist?.length || 0;
    const progress = totalChecklistItems > 0 ? Math.round((completedChecklistItems.length / totalChecklistItems) * 100) : 0;

    const dispositionLabel =
      termination.equipmentDisposition === "return_to_pool" ? "Returned to Pool" :
      termination.equipmentDisposition === "retire" ? "Retired" :
      termination.equipmentDisposition === "malicious_damage" ? "Malicious Damage by Employee" :
      "Pending Assessment";

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Archived Termination Report - ${termination.employeeName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
        .header { border-bottom: 2px solid #6b7280; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #6b7280; margin: 0; font-size: 28px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
        .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 8px; }
        .info-label { font-weight: bold; color: #6b7280; display: inline-block; width: 180px; }
        .archived-badge { background: #6b7280; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .print-date { text-align: right; color: #6b7280; font-size: 14px; margin-top: 30px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Archived Termination Report</h1>
        <div class="print-date">Generated on ${new Date().toLocaleDateString()}</div>
      </div>

      <div class="section">
        <h2>Employee Information</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Employee Name:</span> ${termination.employeeName}</div>
            <div class="info-item"><span class="info-label">Job Title:</span> ${termination.jobTitle}</div>
            <div class="info-item"><span class="info-label">Department:</span> ${termination.department}</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Termination Date:</span> ${new Date(termination.terminationDate).toLocaleDateString()}</div>
            <div class="info-item"><span class="info-label">Initiated By:</span> ${termination.initiatedBy}</div>
            <div class="info-item"><span class="info-label">Status:</span> <span class="archived-badge">ARCHIVED</span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Termination Summary</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Reason:</span> ${termination.terminationReason}</div>
            <div class="info-item"><span class="info-label">Equipment Disposition:</span> ${dispositionLabel}</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Tracking Number:</span> ${termination.trackingNumber || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Completed By:</span> ${termination.completedByUser?.name || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Checklist Completion</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Checklist Progress:</span> ${progress}%</div>
            <div class="info-item"><span class="info-label">Completed Items:</span> ${completedChecklistItems.length}</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Total Items:</span> ${totalChecklistItems}</div>
            <div class="info-item"><span class="info-label">Completion Rate:</span> ${completedChecklistItems.length}/${totalChecklistItems}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="print-date">
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;">
          Report generated by NSN IT Management Portal<br>
          Archived Termination ID: ${termination.id}
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
    </html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const isAdminOrIT =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading archived terminations...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/management-portal/terminations"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Active
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Archived Terminations
            </h1>
            <p className="text-gray-600">
              View completed and archived termination processes
            </p>
          </div>
        </div>
      </div>

      {terminations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Archived Terminations
          </h2>
          <p className="text-gray-500">
            There are no archived termination processes to display.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {terminations.map((termination) => (
            <div
              key={termination.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {termination.employeeName}
                    </h3>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                      Archived
                    </span>
                    <button
                      onClick={() => generatePrintReport(termination)}
                      className="text-gray-400 hover:text-green-600"
                      title="Print Report"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-gray-600">
                    {termination.jobTitle} - {termination.department}
                  </p>
                  <p className="text-sm text-gray-500">
                    Terminated:{" "}
                    {new Date(termination.terminationDate).toLocaleDateString()}{" "}
                    | Initiated by: {termination.initiatedBy}
                  </p>
                  {termination.trackingNumber && (
                    <p className="text-sm text-gray-500 mt-1">
                      Tracking: {termination.trackingNumber}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Archived on{" "}
                      {new Date(termination.timestamp).toLocaleDateString()}
                    </div>
                    {termination.completedByUser && (
                      <div className="text-sm text-gray-500 mt-1">
                        Completed by: {termination.completedByUser.name}
                      </div>
                    )}
                  </div>

                  {isAdminOrIT && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() =>
                          restoreTermination(termination.id, termination.employeeName)
                        }
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        title="Restore to active terminations"
                      >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                        Restore to Active
                      </button>
                      <button
                        onClick={() =>
                          deleteTermination(termination.id, termination.employeeName)
                        }
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                        title="Permanently delete this record"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
