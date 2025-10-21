import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

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
    const employeeData = await request.json();
    console.log("Received employee data:", employeeData);

    // Validate required fields - match your table structure
    if (!employeeData.firstName || !employeeData.lastName || !employeeData.jobTitle || !employeeData.startDate) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "First Name, Last Name, Job Title, and Start Date are required" },
        { status: 400 }
      );
    }

    console.log("🔄 Attempting database connection...");
    const pool = await connectToDatabase();
    console.log("✅ Database connected, executing query...");

    // Use proper SQL parameter types matching your table columns
    const result = await pool
      .request()
      .input("firstName", sql.NVarChar, employeeData.firstName)
      .input("lastName", sql.NVarChar, employeeData.lastName)
      .input("jobTitle", sql.NVarChar, employeeData.jobTitle)
      .input("startDate", sql.Date, employeeData.startDate)
      .input("currentManager", sql.NVarChar, employeeData.currentManager || "")
      .input("directorRegionalDirector", sql.NVarChar, employeeData.directorRegionalDirector || "")
      .input("status", sql.NVarChar, employeeData.status || "Active") // Default status
      .query(`
        INSERT INTO Employees (firstName, lastName, jobTitle, startDate, currentManager, directorRegionalDirector, status)
        OUTPUT INSERTED.*
        VALUES (@firstName, @lastName, @jobTitle, @startDate, @currentManager, @directorRegionalDirector, @status)
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