"use client";

import {
  TextField,
  Button,
  Flex,
  Box,
  Text,
  AlertDialog,
  Heading,
} from "@radix-ui/themes";
import React, { useState } from "react";
import { createEmployee } from "@/services/employeeService";
import { CreateNewEmployee } from "@/app/types/index";
import { useRouter } from "next/navigation";

const NewEmployeePage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateNewEmployee>({
    name: "",
    jobTitle: "",
    startDate: "",
    currentManager: "",
    directorRegionalDirector: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.name || !formData.jobTitle || !formData.startDate) {
        setError("Name, Job Title, and Start Date are required fields");
        setIsSubmitting(false);
        return;
      }

      await createEmployee(formData);

      // Redirect to onboarding page
      router.push("/management-portal/onboarding");
    } catch (err) {
      setError("Failed to create employee. Please try again.");
      console.error("Error creating employee:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      jobTitle: "",
      startDate: "",
      currentManager: "",
      directorRegionalDirector: "",
    });
    setError("");
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Box>
        <Heading size="7" weight="bold" as="h1" className="block mb-6">
          Add New Employee
        </Heading>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" weight="bold" mb="2">
                Full Name *
              </Text>
              <TextField.Root
                placeholder="Enter employee's full name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <Text as="div" size="2" weight="bold" mb="2">
                Job Title *
              </Text>
              <TextField.Root
                placeholder="Enter job title"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <Text as="div" size="2" weight="bold" mb="2">
                Start Date *
              </Text>
              <TextField.Root
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <Text as="div" size="2" weight="bold" mb="2">
                Current Manager
              </Text>
              <TextField.Root
                placeholder="Enter manager's name"
                name="currentManager"
                value={formData.currentManager}
                onChange={handleChange}
              />
            </label>

            <label>
              <Text as="div" size="2" weight="bold" mb="2">
                Director/Regional Director
              </Text>
              <TextField.Root
                placeholder="Enter director's name"
                name="directorRegionalDirector"
                value={formData.directorRegionalDirector}
                onChange={handleChange}
              />
            </label>

            <Flex gap="3" mt="4">
              <Button
                type="submit"
                size="3"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Creating..." : "Create Employee"}
              </Button>

              <Button
                type="button"
                size="3"
                variant="soft"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Reset
              </Button>
            </Flex>
          </Flex>
        </form>
      </Box>
    </div>
  );
};

export default NewEmployeePage;
