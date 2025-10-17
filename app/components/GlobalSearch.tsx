"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchEmployees from "./SearchEmployees";

export default function GlobalSearch() {
  const router = useRouter();

  const handleEmployeeSelect = (employee: any) => {
    // Navigate based on employee status
    if (employee.status === "onboarding") {
      router.push(`/management-portal/onboarding/${employee.id}`);
    } else if (employee.status === "terminated") {
      router.push(`/management-portal/terminations?search=${employee.id}`);
    } else {
      router.push(`/management-portal/employees/${employee.id}`);
    }
  };

  return (
    <div className="w-full max-w-md">
      <SearchEmployees
        onEmployeeSelect={handleEmployeeSelect}
        placeholder="Search across all employees..."
        showStatus={true}
      />
    </div>
  );
}