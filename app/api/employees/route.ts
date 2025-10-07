import { NextRequest, NextResponse } from "next/server";
import { createEmployee } from "../../../services/employeeService";
import { CreateNewEmployee } from "@/app/types/index";

export async function POST(request: NextRequest) {
  try {
    const employeeData: CreateNewEmployee = await request.json();

    // Validate required fields
    if (
      !employeeData.name ||
      !employeeData.jobTitle ||
      !employeeData.startDate
    ) {
      return NextResponse.json(
        { error: "Name, Job Title, and Start Date are required" },
        { status: 400 }
      );
    }

    const newEmployee = await createEmployee(employeeData);
    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
