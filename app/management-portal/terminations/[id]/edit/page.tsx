"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface Termination {
  id: number;
  employeeName: string;
  employeeEmail: string;
  terminationDate: string;
  initiatedBy: string;
  status: "pending" | "equipment_returned" | "archived" | "overdue";
}

export default function EditTerminationPage() {
  const params = useParams();
  const router = useRouter();
  const [termination, setTermination] = useState<Termination | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    employeeName: "",
    employeeEmail: "",
    terminationDate: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchTermination();
    }
  }, [params.id]);

  const fetchTermination = async () => {
    try {
      const response = await fetch(`/api/terminations/${params.id}`);
      if (response.ok) {
        const terminationData = await response.json();
        setTermination(terminationData);
        setFormData({
          employeeName: terminationData.employeeName,
          employeeEmail: terminationData.employeeEmail,
          terminationDate: terminationData.terminationDate.split('T')[0],
        });
      } else {
        console.error("Failed to fetch termination");
      }
    } catch (error) {
      console.error("Error fetching termination:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/terminations/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Termination updated successfully!");
        router.push("/management-portal/terminations");
      } else {
        const errorData = await response.json();
        alert(`Failed to update termination: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating termination:", error);
      alert("Failed to update termination. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!termination) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Termination Not Found
        </h2>
        <p className="text-gray-500 mb-4">
          The termination you're looking for doesn't exist.
        </p>
        <Link
          href="/management-portal/terminations"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
        >
          Back to Terminations
        </Link>
      </div>
    );
  }

  return (
    <div>
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
              Edit Termination - {termination.employeeName}
            </h1>
            <p className="text-gray-600">Update termination details</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name *
              </label>
              <input
                type="text"
                name="employeeName"
                value={formData.employeeName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Email *
              </label>
              <input
                type="email"
                name="employeeEmail"
                value={formData.employeeEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Termination Date *
              </label>
              <input
                type="date"
                name="terminationDate"
                value={formData.terminationDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ArrowLeftIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Equipment return tracking and IT checklist management 
                  should be completed in the main termination view, not in this form.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Link
              href="/management-portal/terminations"
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update Termination"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}