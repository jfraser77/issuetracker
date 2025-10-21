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

    // Validate required fields - accept both firstName/lastName and name
    const hasFirstNameLastName = employeeData.firstName && employeeData.lastName;
    const hasFullName = employeeData.name;
    
    if ((!hasFirstNameLastName && !hasFullName) || !employeeData.jobTitle || !employeeData.startDate) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Name (or First/Last Name), Job Title, and Start Date are required" },
        { status: 400 }
      );
    }

    // Build the name field from firstName/lastName or use the name field
    const name = hasFirstNameLastName 
      ? `${employeeData.firstName} ${employeeData.lastName}`.trim()
      : employeeData.name;

    console.log("🔄 Attempting database connection...");
    const pool = await connectToDatabase();
    console.log("✅ Database connected, executing query...");

    // Use proper SQL parameter types
    const result = await pool
      .request()
      .input("firstName", sql.NVarChar, hasFirstNameLastName ? employeeData.firstName : name.split(' ')[0] || '')
      .input("lastName", sql.NVarChar, hasFirstNameLastName ? employeeData.lastName : name.split(' ').slice(1).join(' ') || '')
      .input("jobTitle", sql.NVarChar, employeeData.jobTitle)
      .input("startDate", sql.Date, employeeData.startDate)
      .input("currentManager", sql.NVarChar, employeeData.currentManager || "")
      .input("directorRegionalDirector", sql.NVarChar, employeeData.directorRegionalDirector || "")
      .input("status", sql.NVarChar, employeeData.status || "Active")
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