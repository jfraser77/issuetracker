"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TextField, Button, Flex, Box, Heading } from "@radix-ui/themes";

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
    return <div>Loading...</div>;
  }

  if (!employee) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Box>
        <Heading size="7" weight="bold" as="h1" className="block mb-6">
          Edit Employee
        </Heading>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <TextField.Root
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            
            <TextField.Root
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />

            <TextField.Root
              placeholder="Job Title"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              required
            />

            <TextField.Root
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />

            <TextField.Root
              placeholder="Current Manager"
              value={formData.currentManager}
              onChange={(e) => setFormData({ ...formData, currentManager: e.target.value })}
            />

            <TextField.Root
              placeholder="Director/Regional Director"
              value={formData.directorRegionalDirector}
              onChange={(e) => setFormData({ ...formData, directorRegionalDirector: e.target.value })}
            />

            <Flex gap="3" mt="4">
              <Button 
                type="submit" 
                size="3" 
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              
              <Button 
                type="button" 
                size="3" 
                variant="soft" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </Flex>
          </Flex>
        </form>
      </Box>
    </div>
  );
}