"use client";

import Link from "next/link";
import { useState, useCallback, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import type { Termination } from "@/types/termination";
import { canArchive, getChecklistCompletion } from "@/types/termination";
import { useTerminationData } from "@/hooks/useTerminationData";
import { ChecklistSection } from "@/components/terminations/ChecklistSection";

export default function TerminationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  const {
    terminations,
    loading,
    currentUser,
    itUsers,
    fetchTerminations,
    createTermination: hookCreateTermination,
    updateTermination,
    markEquipmentReturned,
    archiveTermination,
    toggleExpanded,
  } = useTerminationData({ filter });

  const [showTerminationForm, setShowTerminationForm] = useState(false);

  function deadlineFrom(terminationDate: string): string {
    const d = new Date(terminationDate + "T12:00:00");
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  }

  const today = new Date().toISOString().split("T")[0];
  const [terminationForm, setTerminationForm] = useState({
    employeeName: "",
    employeeEmail: "",
    terminationDate: today,
    equipmentReturnDeadline: deadlineFrom(today),
  });

  const isAuthorized =
    currentUser?.role === "Admin" ||
    currentUser?.role === "I.T." ||
    currentUser?.role === "HR";
  const isAdminOrIT =
    currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  // ---- Form submit wrapper ----

  const handleCreateTermination = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert("You are not authorized to initiate terminations.");
      return;
    }
    const ok = await hookCreateTermination(terminationForm, currentUser?.name);
    if (ok) {
      setShowTerminationForm(false);
      const resetDate = new Date().toISOString().split("T")[0];
      setTerminationForm({
        employeeName: "",
        employeeEmail: "",
        terminationDate: resetDate,
        equipmentReturnDeadline: deadlineFrom(resetDate),
      });
      alert("Termination process initiated successfully.");
    }
  };

  // ---- Delete (not in hook — directly removes from local list) ----

  const deleteTermination = async (terminationId: number) => {
    if (!confirm("Are you sure you want to delete this termination record? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/terminations/${terminationId}`, { method: "DELETE" });
      if (res.ok) await fetchTerminations();
    } catch (error) {
      console.error("Error deleting termination:", error);
    }
  };

  // ---- Debounced field handlers (delegate to hook's updateTermination) ----

  const debouncedUpdateTrackingNumber = useCallback(
    (terminationId: number, trackingNumber: string) => {
      const timeoutId = setTimeout(() => {
        updateTermination(terminationId, { trackingNumber });
      }, 1000);
      return () => clearTimeout(timeoutId);
    },
    [updateTermination]
  );

  const handleEquipmentDispositionChange = useCallback(
    (terminationId: number, value: "return_to_pool" | "retire" | "pending_assessment" | "malicious_damage") => {
      updateTermination(terminationId, { equipmentDisposition: value });
    },
    [updateTermination]
  );

  const handleCompletedByChange = useCallback(
    (terminationId: number, value: string) => {
      const completedByUserId = value ? parseInt(value) : undefined;
      updateTermination(terminationId, { completedByUserId });
    },
    [updateTermination]
  );

  const handleTrackingNumberChange = useCallback(
    (terminationId: number, value: string) => {
      debouncedUpdateTrackingNumber(terminationId, value);
    },
    [debouncedUpdateTrackingNumber]
  );

  const handleComputerSerialChange = useCallback(
    (terminationId: number, value: string) => {
      const timeoutId = setTimeout(() => {
        updateTermination(terminationId, { computerSerial: value });
      }, 1000);
      return () => clearTimeout(timeoutId);
    },
    [updateTermination]
  );

  const handleComputerModelChange = useCallback(
    (terminationId: number, value: string) => {
      const timeoutId = setTimeout(() => {
        updateTermination(terminationId, { computerModel: value });
      }, 1000);
      return () => clearTimeout(timeoutId);
    },
    [updateTermination]
  );

  const getStatusColor = (
    status: string,
    isOverdue: boolean,
    equipmentDisposition?: string
  ) => {
    if (isOverdue) return "bg-red-100 text-red-800 border border-red-200";

    if (status === "pending" && equipmentDisposition === "pending_assessment") {
      return "bg-blue-100 text-blue-800 border border-blue-200";
    }

    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "equipment_returned":
        return "bg-green-100 text-green-800 border border-green-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "overdue":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusText = (
    status: string,
    daysRemaining: number,
    isOverdue: boolean,
    equipmentDisposition?: string
  ) => {
    if (isOverdue) return "OVERDUE - Equipment Not Returned";

    if (status === "pending" && equipmentDisposition === "pending_assessment") {
      return `Awaiting Equipment Return - ${daysRemaining} days remaining`;
    }

    switch (status) {
      case "pending":
        return `${daysRemaining} days remaining for equipment return`;
      case "equipment_returned":
        return "Equipment Returned - Ready for Archive";
      case "archived":
        return "Archived";
      case "overdue":
        return "Overdue";
      default:
        return "Pending";
    }
  };

  const generatePrintReport = (termination: Termination) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const completedChecklistItems =
      termination.checklist?.filter((item) => item.completed) || [];
    const totalChecklistItems = termination.checklist?.length || 0;
    const progress =
      totalChecklistItems > 0
        ? Math.round(
            (completedChecklistItems.length / totalChecklistItems) * 100
          )
        : 0;

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Termination Report - ${termination.employeeName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
        .header { border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #dc2626; margin: 0; font-size: 28px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
        .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 8px; }
        .info-label { font-weight: bold; color: #6b7280; display: inline-block; width: 180px; }
        .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; margin: 15px 0; overflow: hidden; }
        .progress-fill { background: #dc2626; height: 100%; border-radius: 12px; text-align: center; color: white; font-size: 14px; line-height: 24px; font-weight: bold; }
        .checklist { margin: 15px 0; }
        .checklist-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .completed { color: #059669; }
        .pending { color: #6b7280; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 10px; font-weight: 500; }
        .completed-badge { background: #d1fae5; color: #065f46; }
        .pending-badge { background: #f3f4f6; color: #374151; }
        .print-date { text-align: right; color: #6b7280; font-size: 14px; margin-top: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-number { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 4px; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        @media print { body { margin: 20px; } .no-print { display: none; } .section { break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Employee Termination Report</h1>
        <div class="print-date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
      </div>

      <div class="section">
        <h2>Employee Information</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Employee Name:</span> ${
              termination.employeeName
            }</div>
            
            <div class="info-item"><span class="info-label">Email:</span> ${
              termination.employeeEmail
            }</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Termination Date:</span> ${new Date(
              termination.terminationDate
            ).toLocaleDateString()}</div>
            <div class="info-item"><span class="info-label">Reason:</span> ${
              termination.terminationReason
            }</div>
            <div class="info-item"><span class="info-label">Initiated By:</span> ${
              termination.initiatedBy
            }</div>
            <div class="info-item"><span class="info-label">Status:</span> ${
              termination.status
            }</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Equipment Return</h2>
        <div class="employee-info">
          <div>
            <div class="info-item"><span class="info-label">Tracking Number:</span> ${
              termination.trackingNumber || "Not provided"
            }</div>
            <div class="info-item"><span class="info-label">Disposition:</span> ${
              termination.equipmentDisposition === "return_to_pool"
                ? "Return to Available Pool"
                : termination.equipmentDisposition === "retire"
                ? "Retire Equipment"
                : "Pending Assessment"
            }</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Completed By:</span> ${
              termination.completedByUser?.name || "Not assigned"
            }</div>
            <div class="info-item"><span class="info-label">Days Remaining:</span> ${
              termination.daysRemaining
            }</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Checklist Progress</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${progress}%</div>
            <div class="stat-label">Overall Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${completedChecklistItems.length}</div>
            <div class="stat-label">Completed Items</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${totalChecklistItems}</div>
            <div class="stat-label">Total Items</div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%">${progress}%</div>
        </div>
      </div>

      <div class="section">
        <h2>IT Access Removal Checklist</h2>
        <div class="checklist">
          ${
            termination.checklist
              ?.map(
                (item) => `
            <div class="checklist-item ${
              item.completed ? "completed" : "pending"
            }">
              ${item.completed ? "✓" : "○"} ${item.description}
              <span class="status-badge ${
                item.completed ? "completed-badge" : "pending-badge"
              }">
                ${item.completed ? "Completed" : "Pending"}
              </span>
              ${
                item.completed && item.completedBy
                  ? `<br><small>Completed by ${item.completedBy} on ${
                      item.completedDate
                        ? new Date(item.completedDate).toLocaleDateString()
                        : "unknown date"
                    }</small>`
                  : ""
              }
            </div>
          `
              )
              .join("") || "No checklist items"
          }
        </div>
      </div>

      <div class="section">
        <div class="print-date">
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;">
          Report generated by NSN IT Management Portal<br>
          Termination ID: ${termination.id} | Report ID: ${Date.now()}
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

  const formatTerminationDate = (dateString: string) => {
  const date = new Date(dateString);
  // Add a day if the date appears off due to timezone
  const adjustedDate = new Date(date);
  adjustedDate.setDate(adjustedDate.getDate() + 1);
  
  return adjustedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Employee Terminations
        </h1>

        {isAuthorized && (
          <button
            onClick={() => setShowTerminationForm(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Initiate Termination
          </button>
        )}
      </div>

      {/* Termination Form Modal */}
      {showTerminationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Initiate Termination Process
            </h3>
            <form onSubmit={handleCreateTermination}>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.employeeName}
                    onChange={(e) =>
                      setTerminationForm({
                        ...terminationForm,
                        employeeName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Email *
                  </label>
                  <input
                    type="email"
                    value={terminationForm.employeeEmail}
                    onChange={(e) =>
                      setTerminationForm({
                        ...terminationForm,
                        employeeEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Date *
                  </label>
                  <input
                    type="date"
                    value={terminationForm.terminationDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setTerminationForm((prev) => ({
                        ...prev,
                        terminationDate: newDate,
                        // Auto-update deadline only if it still matches the old +14 default
                        equipmentReturnDeadline:
                          prev.equipmentReturnDeadline === deadlineFrom(prev.terminationDate)
                            ? deadlineFrom(newDate)
                            : prev.equipmentReturnDeadline,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Return Deadline *
                  </label>
                  <input
                    type="date"
                    value={terminationForm.equipmentReturnDeadline}
                    onChange={(e) =>
                      setTerminationForm((prev) => ({
                        ...prev,
                        equipmentReturnDeadline: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults to 14 days after termination. Adjust if a different deadline was communicated.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> HR must provide the equipment
                      return tracking number in the termination record.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerminationForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
                >
                  Initiate Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {terminations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            No Active Termination Processes
          </h2>
          <p className="text-gray-500 mb-4">
            {isAuthorized
              ? "Get started by initiating a termination process."
              : "No termination processes require attention."}
          </p>
          {isAuthorized && (
            <button
              onClick={() => setShowTerminationForm(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Initiate Termination
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {terminations.map((termination) => (
            <div
              key={termination.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* Termination Header */}
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={() => toggleExpanded(termination.id)}
                      className="mt-1 text-gray-400 hover:text-gray-600"
                    >
                      {termination.isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {termination.employeeName}
                        </h3>

                        <button
                          onClick={() =>
                            router.push(
                              `/management-portal/terminations/${termination.id}/edit`
                            )
                          }
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Termination"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => generatePrintReport(termination)}
                          className="text-gray-400 hover:text-green-600"
                          title="Print Report"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTermination(termination.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete Termination"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        {termination.isOverdue && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {termination.jobTitle && termination.department && (
                        <p className="text-gray-600">
                          {termination.jobTitle} - {termination.department}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Terminated:{" "}
                        {formatTerminationDate(termination.terminationDate)}{" "}
  | Email: {termination.employeeEmail} | Initiated by:{" "}
  {termination.initiatedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        termination.status,
                        termination.isOverdue,
                        termination.equipmentDisposition
                      )}`}
                    >
                      {termination.isOverdue && (
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      )}
                      {getStatusText(
                        termination.status,
                        termination.daysRemaining,
                        termination.isOverdue,
                        termination.equipmentDisposition
                      )}
                    </div>

                    {termination.isOverdue && (
                      <div className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ {Math.abs(termination.daysRemaining)} days overdue
                      </div>
                    )}
                    {termination.trackingNumber && (
                      <div className="text-sm text-gray-500 mt-1">
                        Tracking: {termination.trackingNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {termination.isExpanded && (
                <div className="border-t border-gray-200 px-6 py-4 space-y-4">
                  {/* Equipment Return Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                      Equipment Return Process
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tracking Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Number *
                        </label>
                        <input
                          type="text"
                          value={termination.trackingNumber || ""}
                          onChange={(e) =>
                            handleTrackingNumberChange(
                              termination.id,
                              e.target.value
                            )
                          }
                          placeholder="Enter return tracking number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* Equipment Disposition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment Disposition *
                        </label>
                        <select
                          value={
                            termination.equipmentDisposition ||
                            "pending_assessment"
                          }
                          onChange={(e) =>
                            handleEquipmentDispositionChange(
                              termination.id,
                              e.target.value as
                                | "return_to_pool"
                                | "retire"
                                | "pending_assessment"
                                | "malicious_damage"
                            )
                          }
                          className={"w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" + (termination.equipmentDisposition === "malicious_damage" ? " text-red-600 font-bold" : "")}
                          required
                        >
                          <option value="pending_assessment">
                            Pending Assessment
                          </option>
                          <option value="return_to_pool">
                            Return to Available Pool
                          </option>
                          <option value="retire">Retire Equipment</option>
                          <option value="malicious_damage">
                            Malicious Damage by Employee
                          </option>
                        </select>
                      </div>

                      {/* Completed By */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Completed By (IT Staff) *
                        </label>
                        <select
                          value={termination.completedByUserId || ""}
                          onChange={(e) =>
                            handleCompletedByChange(
                              termination.id,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select IT Staff</option>
                          {itUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Completion Status */}
                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Completion Status
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div
                          className={`p-2 rounded ${
                            termination.trackingNumber
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          Tracking Number:{" "}
                          {termination.trackingNumber
                            ? "✓ Provided"
                            : "✗ Missing"}
                        </div>
                        <div
                          className={`p-2 rounded ${
                            termination.completedByUserId
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          IT Staff:{" "}
                          {termination.completedByUserId
                            ? "✓ Assigned"
                            : "✗ Not Assigned"}
                        </div>
                        <div
                          className={`p-2 rounded ${
                            termination.equipmentDisposition &&
                            termination.equipmentDisposition !==
                              "pending_assessment"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          Disposition:{" "}
                          {termination.equipmentDisposition &&
                          termination.equipmentDisposition !==
                            "pending_assessment"
                            ? "✓ Set"
                            : "✗ Not Set"}
                        </div>
                        <div
                          className={`p-2 rounded ${
                            getChecklistCompletion(termination.checklist).percent === 100
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          Checklist:{" "}
                          {getChecklistCompletion(termination.checklist).percent}
                          %
                        </div>
                      </div>
                    </div>

                    {/* Mark Equipment Returned Button */}
                    {isAdminOrIT && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            if (!termination.trackingNumber) {
                              alert("Please enter a tracking number");
                              return;
                            }
                            if (!termination.completedByUserId) {
                              alert("Please select an IT staff member");
                              return;
                            }
                            if (
                              !termination.equipmentDisposition ||
                              termination.equipmentDisposition ===
                                "pending_assessment"
                            ) {
                              alert("Please select equipment disposition");
                              return;
                            }

                            markEquipmentReturned(
                              termination.id,
                              termination.trackingNumber!,
                              termination.equipmentDisposition,
                              termination.completedByUserId
                            );
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center shadow-sm"
                          disabled={
                            !termination.trackingNumber ||
                            !termination.completedByUserId ||
                            !termination.equipmentDisposition ||
                            termination.equipmentDisposition ===
                              "pending_assessment"
                          }
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Mark Equipment Returned
                          {termination.equipmentDisposition ===
                            "return_to_pool" && (
                            <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">
                              +1 Laptop to{" "}
                              {
                                itUsers.find(
                                  (u) => u.id === termination.completedByUserId
                                )?.name
                              }
                              's Inventory
                            </span>
                          )}
                        </button>

                        {(!termination.trackingNumber ||
                          !termination.completedByUserId ||
                          !termination.equipmentDisposition ||
                          termination.equipmentDisposition ===
                            "pending_assessment") && (
                          <div className="mt-2 text-xs text-amber-600">
                            {!termination.trackingNumber &&
                              "• Tracking number required\n"}
                            {!termination.completedByUserId &&
                              "• IT staff member required\n"}
                            {(!termination.equipmentDisposition ||
                              termination.equipmentDisposition ===
                                "pending_assessment") &&
                              "• Equipment disposition required"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* IT Checklist Section */}
                  {isAdminOrIT && termination.checklist && (
                    <ChecklistSection
                      termination={termination}
                      currentUserName={currentUser?.name}
                      itUsers={itUsers}
                      onUpdate={updateTermination}
                      onCompletedByChange={handleCompletedByChange}
                      onComputerSerialChange={handleComputerSerialChange}
                      onComputerModelChange={handleComputerModelChange}
                    />
                  )}

                  {/* Action Buttons */}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {termination.isOverdue ? (
                        <span className="text-red-600 font-medium flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          Equipment return is overdue!
                        </span>
                      ) : termination.status === "pending" ? (
                        <span className="text-amber-600 font-medium">
                          {termination.daysRemaining} days remaining for
                          equipment return
                        </span>
                      ) : termination.status === "equipment_returned" ? (
                        <div className="flex items-center space-x-4">
                          <span className="text-green-600 font-medium flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Equipment Returned - Ready for Archive
                          </span>
                          <span className="text-blue-600">
                            Checklist:{" "}
                            {getChecklistCompletion(termination.checklist).percent}
                            % Complete
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      {termination.status === "equipment_returned" && (
                        <button
                          onClick={() => {
                            if (!canArchive(termination)) {
                              alert(
                                `Cannot archive yet:\n• Checklist must be 100% complete (currently ${getChecklistCompletion(termination.checklist).percent}%)\n• All fields must be completed`
                              );
                              return;
                            }
                            archiveTermination(termination.id);
                          }}
                          className={`px-3 py-1 rounded text-sm flex items-center ${
                            canArchive(termination)
                              ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                          disabled={!canArchive(termination)}
                          title={
                            canArchive(termination)
                              ? "Archive this completed termination"
                              : "Complete all requirements to archive"
                          }
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Archive
                          {canArchive(termination) && (
                            <span className="ml-1 text-xs bg-green-600 px-1 rounded">
                              ✓
                            </span>
                          )}
                        </button>
                      )}

                      {termination.status === "equipment_returned" &&
                        !canArchive(termination) && (
                          <div className="text-xs text-amber-600 flex items-center">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Complete checklist to archive
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
