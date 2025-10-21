"use client";

import { useState, useEffect } from "react";

interface Approval {
  approvalId: number;
  requestedRole: string;
  status: string;
  createdAt: string;
  userId: number;
  name: string;
  email: string;
  currentRole: string;
}

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await fetch("/api/admin/approvals");
      const data = await response.json();
      
      if (response.ok) {
        setApprovals(data.approvals || []);
      } else {
        setMessage("Failed to load approvals");
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
      setMessage("Error loading approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (approvalId: number, action: 'approve' | 'reject', userId: number, requestedRole: string, userEmail: string, userName: string) => {
    setUpdating(approvalId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvalId,
          action,
          userId,
          requestedRole,
          userEmail,
          userName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Role request ${action}d successfully`);
        // Refresh the list
        fetchApprovals();
      } else {
        setMessage(data.error || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error("Error updating approval:", error);
      setMessage("Error processing request");
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Role Approval Requests</h1>
          <p className="text-gray-600">Review and manage user role upgrade requests</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.includes("successfully") 
              ? "bg-green-50 border border-green-200 text-green-700" 
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {message}
          </div>
        )}

        {/* Approvals List */}
        <div className="bg-white rounded-lg shadow-sm">
          {approvals.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
              <p className="text-gray-500">All role upgrade requests have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvals.map((approval) => (
                    <tr key={approval.approvalId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{approval.name}</div>
                          <div className="text-sm text-gray-500">{approval.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {approval.currentRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {approval.requestedRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(approval.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprovalAction(
                              approval.approvalId,
                              'approve',
                              approval.userId,
                              approval.requestedRole,
                              approval.email,
                              approval.name
                            )}
                            disabled={updating === approval.approvalId}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {updating === approval.approvalId ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Approving...
                              </>
                            ) : (
                              'Approve'
                            )}
                          </button>
                          <button
                            onClick={() => handleApprovalAction(
                              approval.approvalId,
                              'reject',
                              approval.userId,
                              approval.requestedRole,
                              approval.email,
                              approval.name
                            )}
                            disabled={updating === approval.approvalId}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">{approvals.length}</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Pending Requests</h3>
                <p className="text-sm text-gray-500">Awaiting review</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}