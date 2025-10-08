import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import { CreateNewEmployee } from "../../types/index";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query(`
      SELECT * FROM Employees 
      ORDER BY timestamp DESC
    `);

    return NextResponse.json(result.recordset);
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

    // Validate required fields
    if (
      !employeeData.firstName ||
      !employeeData.lastName ||
      !employeeData.jobTitle ||
      !employeeData.startDate
    ) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        {
          error:
            "First Name, Last Name, Job Title, and Start Date are required",
        },
        { status: 400 }
      );
    }

    console.log("🔄 Attempting database connection...");
    const pool = await connectToDatabase();
    console.log("✅ Database connected, executing query...");

    const result = await pool
      .request()
      .input("firstName", employeeData.firstName)
      .input("lastName", employeeData.lastName)
      .input("jobTitle", employeeData.jobTitle)
      .input("startDate", employeeData.startDate)
      .input("currentManager", employeeData.currentManager || "")
      .input(
        "directorRegionalDirector",
        employeeData.directorRegionalDirector || ""
      ).query(`
        INSERT INTO Employees (firstName, lastName, jobTitle, startDate, currentManager, directorRegionalDirector)
        OUTPUT INSERTED.*
        VALUES (@firstName, @lastName, @jobTitle, @startDate, @currentManager, @directorRegionalDirector)
      `);

    console.log("✅ Employee created successfully:", result.recordset[0]);
    return NextResponse.json(result.recordset[0], { status: 201 });
  } catch (error: any) {
    console.error("❌ Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee", details: error.message },
      { status: 500 }
    );
  }
}
