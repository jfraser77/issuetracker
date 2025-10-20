import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import { CreateNewEmployee } from "../../../types/employee";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query(`
      SELECT * FROM Employees 
      ORDER BY timestamp DESC
    `);

    // Transform the data to match your frontend expectations
    const employees = result.recordset.map(employee => ({
      ...employee,
      firstName: employee.name.split(' ')[0] || '', // Extract first name
      lastName: employee.name.split(' ').slice(1).join(' ') || '', // Extract last name
    }));

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("🔵 POST /api/employees called");

  try {
    const employeeData: CreateNewEmployee = await request.json();
    console.log("Received employee data:", employeeData);

    // Validate required fields - updated to match your form
    if (!employeeData.name || !employeeData.jobTitle || !employeeData.startDate) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Name, Job Title, and Start Date are required" },
        { status: 400 }
      );
    }

    console.log("🔄 Attempting database connection...");
    const pool = await connectToDatabase();
    console.log("✅ Database connected, executing query...");

    const result = await pool
      .request()
      .input("name", employeeData.name)
      .input("jobTitle", employeeData.jobTitle)
      .input("startDate", employeeData.startDate)
      .input("currentManager", employeeData.currentManager || "")
      .input("directorRegionalDirector", employeeData.directorRegionalDirector || "")
      .query(`
        INSERT INTO Employees (name, jobTitle, startDate, currentManager, directorRegionalDirector)
        OUTPUT INSERTED.*
        VALUES (@name, @jobTitle, @startDate, @currentManager, @directorRegionalDirector)
      `);

    console.log("✅ Employee created successfully:", result.recordset[0]);
    
    // Transform the response to include firstName and lastName
    const createdEmployee = result.recordset[0];
    const responseEmployee = {
      ...createdEmployee,
      firstName: createdEmployee.name.split(' ')[0] || '',
      lastName: createdEmployee.name.split(' ').slice(1).join(' ') || '',
    };

    return NextResponse.json(responseEmployee, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee", details: error.message },
      { status: 500 }
    );
  }
}