"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PencilIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";
import SearchEmployees from "@/app/components/SearchEmployees";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Termination {
  id: number;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  terminationDate: string;
  terminationReason: string;
  initiatedBy: string;
  status: "pending" | "equipment_returned" | "archived" | "overdue";
  trackingNumber?: string;
  equipmentDisposition: "return_to_pool" | "retire";
  daysRemaining: number;
  isOverdue: boolean;
  licensesRemoved: {
    automateLicense: boolean;
    screenConnect: boolean;
    office365: boolean;
    adobeAcrobat: boolean;
    phone: boolean;
    fax: boolean;
    additionalRemovals?: string;
  };
  timestamp: string;
  isExpanded?: boolean;
}

export default function TerminationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [terminationForm, setTerminationForm] = useState({
    employeeName: "",
    employeeEmail: "",
    jobTitle: "",
    department: "",
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: "",
    equipmentDisposition: "return_to_pool" as "return_to_pool" | "retire"
  });

  const isAuthorized = currentUser?.role === "Admin" || currentUser?.role === "I.T." || currentUser?.role === "HR";
  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";
  const filter = searchParams.get('filter');

  useEffect(() => {
    fetchCurrentUser();
    fetchTerminations();
    
    // Check for overdue terminations daily
    const interval = setInterval(checkOverdueTerminations, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

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

  const fetchTerminations = async () => {
    try {
      const url = filter ? `/api/terminations?filter=${filter}` : '/api/terminations';
      const response = await fetch(url);
      if (response.ok) {
        const terminationsData = await response.json();
        setTerminations(terminationsData.map((t: Termination) => ({ 
          ...t, 
          isExpanded: false 
        })));
      }
    } catch (error) {
      console.error("Error fetching terminations:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTerminationExpanded = (terminationId: number) => {
    setTerminations(prev => prev.map(t => 
      t.id === terminationId ? { ...t, isExpanded: !t.isExpanded } : t
    ));
  };

  const createTermination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert("You are not authorized to initiate terminations.");
      return;
    }

    try {
      const response = await fetch("/api/terminations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...terminationForm,
          initiatedBy: currentUser?.name
        }),
      });

      if (response.ok) {
        setShowTerminationForm(false);
        setTerminationForm({
          employeeName: "",
          employeeEmail: "",
          jobTitle: "",
          department: "",
          terminationDate: new Date().toISOString().split('T')[0],
          terminationReason: "",
          equipmentDisposition: "return_to_pool"
        });
        fetchTerminations();
        alert("Termination process initiated successfully.");
      }
    } catch (error) {
      console.error("Error creating termination:", error);
      alert("Failed to initiate termination process.");
    }
  };

  const updateTermination = async (terminationId: number, updates: Partial<Termination>) => {
    try {
      const response = await fetch(`/api/terminations/${terminationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchTerminations();
      }
    } catch (error) {
      console.error("Error updating termination:", error);
    }
  };

  const markEquipmentReturned = async (terminationId: number, trackingNumber: string, equipmentDisposition: string) => {
    try {
      const response = await fetch(`/api/terminations/${terminationId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, equipmentDisposition }),
      });

      if (response.ok) {
        if (equipmentDisposition === "return_to_pool" && isAdminOrIT) {
          // Increase available laptops
          await fetch("/api/it-assets/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: currentUser?.id, 
              change: 1 
            }),
          });
        }
        fetchTerminations();
        alert("Equipment return recorded successfully.");
      }
    } catch (error) {
      console.error("Error marking equipment returned:", error);
    }
  };

  const archiveTermination = async (terminationId: number) => {
    try {
      const response = await fetch(`/api/terminations/${terminationId}/archive`, {
        method: "POST",
      });

      if (response.ok) {
        fetchTerminations();
      }
    } catch (error) {
      console.error("Error archiving termination:", error);
    }
  };

  const deleteTermination = async (terminationId: number) => {
    if (!confirm("Are you sure you want to delete this termination record? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/terminations/${terminationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTerminations(prev => prev.filter(t => t.id !== terminationId));
      }
    } catch (error) {
      console.error("Error deleting termination:", error);
    }
  };

  const checkOverdueTerminations = async () => {
    try {
      await fetch("/api/terminations/check-overdue", { method: "POST" });
      fetchTerminations();
    } catch (error) {
      console.error("Error checking overdue terminations:", error);
    }
  };

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue) return "bg-red-100 text-red-800";
    
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "equipment_returned":
        return "bg-green-100 text-green-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string, daysRemaining: number, isOverdue: boolean) => {
    if (isOverdue) return "OVERDUE - Equipment Not Returned";
    
    switch (status) {
      case "pending":
        return `${daysRemaining} days remaining`;
      case "equipment_returned":
        return "Equipment Returned";
      case "archived":
        return "Archived";
      case "overdue":
        return "Overdue";
      default:
        return "Pending";
    }
  };

  const handleEmployeeSelect = (employee: any) => {
    // Pre-fill termination form with employee data
    setTerminationForm(prev => ({
      ...prev,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      jobTitle: employee.jobTitle,
      department: employee.department
    }));
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
          Employee Terminations
        </h1>
        <div className="w-80">
          <SearchEmployees
            onEmployeeSelect={handleEmployeeSelect}
            placeholder="Search employees to initiate termination..."
          />
        </div>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Initiate Termination Process</h3>
            <form onSubmit={createTermination}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.employeeName}
                    onChange={(e) => setTerminationForm({ ...terminationForm, employeeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Email *
                  </label>
                  <input
                    type="email"
                    value={terminationForm.employeeEmail}
                    onChange={(e) => setTerminationForm({ ...terminationForm, employeeEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.jobTitle}
                    onChange={(e) => setTerminationForm({ ...terminationForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={terminationForm.department}
                    onChange={(e) => setTerminationForm({ ...terminationForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Date *
                  </label>
                  <input
                    type="date"
                    value={terminationForm.terminationDate}
                    onChange={(e) => setTerminationForm({ ...terminationForm, terminationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Disposition *
                  </label>
                  <select
                    value={terminationForm.equipmentDisposition}
                    onChange={(e) => setTerminationForm({ ...terminationForm, equipmentDisposition: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="return_to_pool">Return to Available Pool</option>
                    <option value="retire">Retire Equipment</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Termination Reason *
                </label>
                <textarea
                  value={terminationForm.terminationReason}
                  onChange={(e) => setTerminationForm({ ...terminationForm, terminationReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTerminationForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
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
              : "No termination processes require attention."
            }
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
              {/* Termination Header - Always Visible */}
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={() => toggleTerminationExpanded(termination.id)}
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
                          onClick={() => router.push(`/management-portal/terminations/${termination.id}/edit`)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Edit Termination"
                        >
                          <PencilIcon className="h-4 w-4" />
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
                      <p className="text-gray-600">{termination.jobTitle} - {termination.department}</p>
                      <p className="text-sm text-gray-500">
                        Terminated: {new Date(termination.terminationDate).toLocaleDateString()} | 
                        Email: {termination.employeeEmail} |
                        Initiated by: {termination.initiatedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(termination.status, termination.isOverdue)}`}>
                      {termination.isOverdue && <ExclamationTriangleIcon className="h-4 w-4 mr-1" />}
                      {getStatusText(termination.status, termination.daysRemaining, termination.isOverdue)}
                    </div>
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
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Equipment Return
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          value={termination.trackingNumber || ""}
                          onChange={(e) => updateTermination(termination.id, { trackingNumber: e.target.value })}
                          placeholder="Enter return tracking number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment Disposition
                        </label>
                        <select
                          value={termination.equipmentDisposition}
                          onChange={(e) => updateTermination(termination.id, { 
                            equipmentDisposition: e.target.value as "return_to_pool" | "retire" 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="return_to_pool">Return to Available Pool</option>
                          <option value="retire">Retire Equipment</option>
                        </select>
                      </div>
                    </div>
                    {isAdminOrIT && termination.trackingNumber && (
                      <div className="mt-3">
                        <button
                          onClick={() => markEquipmentReturned(
                            termination.id, 
                            termination.trackingNumber!, 
                            termination.equipmentDisposition
                          )}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Mark Equipment Returned
                        </button>
                      </div>
                    )}
                  </div>

                  {/* License Removal Section */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      License and Access Removal
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(termination.licensesRemoved).map(([license, removed]) => {
                        if (license === 'additionalRemovals') return null;
                        
                        return (
                          <div key={license} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={removed as boolean}
                              onChange={(e) => updateTermination(termination.id, {
                                licensesRemoved: {
                                  ...termination.licensesRemoved,
                                  [license]: e.target.checked
                                }
                              })}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700 capitalize">
                              {license.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Removals
                      </label>
                      <textarea
                        value={termination.licensesRemoved.additionalRemovals || ""}
                        onChange={(e) => updateTermination(termination.id, {
                          licensesRemoved: {
                            ...termination.licensesRemoved,
                            additionalRemovals: e.target.value
                          }
                        })}
                        placeholder="List any additional software or access that needs to be removed..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {termination.isOverdue ? (
                        <span className="text-red-600 font-medium">
                          ⚠️ Equipment return is overdue!
                        </span>
                      ) : termination.status === "pending" && (
                        <span className="text-amber-600 font-medium">
                          {termination.daysRemaining} days remaining for equipment return
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {termination.status === "equipment_returned" && (
                        <button
                          onClick={() => archiveTermination(termination.id)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Archive
                        </button>
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