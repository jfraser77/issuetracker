"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TextField, Button, Flex, Box, Heading, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  startDate: string;
  currentManager: string;
  directorRegionalDirector: string;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    startDate: "",
    currentManager: "",
    directorRegionalDirector: ""
  });

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      if (response.ok) {
        const employeeData = await response.json();
        setEmployee(employeeData);
        setFormData({
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          jobTitle: employeeData.jobTitle,
          startDate: employeeData.startDate.split('T')[0],
          currentManager: employeeData.currentManager,
          directorRegionalDirector: employeeData.directorRegionalDirector
        });
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/management-portal/onboarding");
      }
    } catch (error) {
      console.error("Error updating employee:", error);
    } finally {
      setSaving(false);
    }
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
        <Button onClick={() => router.push("/management-portal/onboarding")}>
          Back to Onboarding
        </Button>
      </div>
    );
  }

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
              Edit Employee
            </h1>
            <p className="text-gray-600">
              Update employee information for {employee.firstName} {employee.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Heading size="5" weight="bold" as="h2" className="mb-6 text-gray-900">
          Employee Details
        </Heading>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* First Name */}
            <div>
              <Text as="div" size="2" weight="medium" className="mb-2 text-gray-700">
                First Name *
              </Text>
              <TextField.Root
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full"
              />
            </div>

            {/* Last Name */}
            <div>
              <Text as="div" size="2" weight="medium" className="mb-2 text-gray-700">
                Last Name *
              </Text>
              <TextField.Root
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full"
              />
            </div>

            {/* Job Title */}
            <div className="md:col-span-2">
              <Text as="div" size="2" weight="medium" className="mb-2 text-gray-700">
                Job Title *
              </Text>
              <TextField.Root
                placeholder="Enter job title"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                required
                className="w-full"
              />
            </div>

            {/* Start Date */}
            <div className="md:col-span-2">
              <Text as="div" size="2" weight="medium" className="mb-2 text-gray-700">
                Start Date *
              </Text>
              <TextField.Root
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full"
              />
            </div>

            {/* Current Manager */}
            <div className="md:col-span-2">
              <Text as="div" size="2" weight="medium" className="mb-2 text-gray-700">
                Current Manager
              </Text>
              <TextField.Root
                placeholder="Enter manager's name"
                value={formData.currentManager}
                onChange={(e) => setFormData({ ...formData, currentManager: e.target.value })}
                className="w-full"
              />
            </div>

            {/* Director/Regional Director */}
            <div className="md:col-span-2">
              <Text as="div" size="2" weight="medium" className="mb-2 text-gray-700">
                Director/Regional Director
              </Text>
              <TextField.Root
                placeholder="Enter director's name"
                value={formData.directorRegionalDirector}
                onChange={(e) => setFormData({ ...formData, directorRegionalDirector: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              size="3" 
              variant="soft" 
              onClick={() => router.back()}
              className="px-6"
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              size="3" 
              disabled={saving}
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Employee Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-start">
          <div className="flex-1">
            <Text as="div" size="2" weight="medium" className="text-blue-800 mb-1">
              Employee ID: {employee.id}
            </Text>
            <Text as="div" size="1" className="text-blue-700">
              Last updated: {new Date().toLocaleDateString()}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}