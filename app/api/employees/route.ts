import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    console.log("🔵 GET /api/employees called with status:", status);

    const pool = await connectToDatabase();

    let query = "SELECT * FROM Employees";
    const requestPool = pool.request();

    // Add status filter if not 'all'
    if (status !== "all") {
      query += " WHERE status = @status";
      requestPool.input("status", sql.NVarChar, status);
    }

    query += " ORDER BY timestamp DESC";

    console.log("🔄 Executing query:", query);
    const result = await requestPool.query(query);

    console.log(
      `✅ Found ${result.recordset.length} employees with status: ${status}`
    );
    return NextResponse.json(result.recordset);
  } catch (error: any) {
    console.error("❌ Error fetching employees:", error);
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
    const hasFirstNameLastName =
      employeeData.firstName && employeeData.lastName;
    const hasFullName = employeeData.name;

    if (
      (!hasFirstNameLastName && !hasFullName) ||
      !employeeData.jobTitle ||
      !employeeData.startDate
    ) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        {
          error:
            "Name (or First/Last Name), Job Title, and Start Date are required",
        },
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
      .input(
        "firstName",
        sql.NVarChar,
        hasFirstNameLastName ? employeeData.firstName : name.split(" ")[0] || ""
      )
      .input(
        "lastName",
        sql.NVarChar,
        hasFirstNameLastName
          ? employeeData.lastName
          : name.split(" ").slice(1).join(" ") || ""
      )
      .input("jobTitle", sql.NVarChar, employeeData.jobTitle)
      .input("startDate", sql.Date, employeeData.startDate)
      .input("currentManager", sql.NVarChar, employeeData.currentManager || "")
      .input(
        "directorRegionalDirector",
        sql.NVarChar,
        employeeData.directorRegionalDirector || ""
      )
      .input("status", sql.NVarChar, employeeData.status || "active") // Default to 'active' for new employees
      .query(`
        INSERT INTO Employees (firstName, lastName, jobTitle, startDate, currentManager, directorRegionalDirector, status, timestamp)
        OUTPUT INSERTED.*
        VALUES (@firstName, @lastName, @jobTitle, @startDate, @currentManager, @directorRegionalDirector, @status, GETDATE())
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

// Add PUT method for updating employee status
export async function PUT(request: NextRequest) {
  console.log("🔵 PUT /api/employees called");

  try {
    const employeeData = await request.json();
    console.log("Received employee update data:", employeeData);

    if (!employeeData.id) {
      return NextResponse.json(
        { error: "Employee ID is required for update" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("id", sql.Int, employeeData.id)
      .input("firstName", sql.NVarChar, employeeData.firstName || "")
      .input("lastName", sql.NVarChar, employeeData.lastName || "")
      .input("jobTitle", sql.NVarChar, employeeData.jobTitle || "")
      .input("startDate", sql.Date, employeeData.startDate)
      .input("currentManager", sql.NVarChar, employeeData.currentManager || "")
      .input(
        "directorRegionalDirector",
        sql.NVarChar,
        employeeData.directorRegionalDirector || ""
      )
      .input("status", sql.NVarChar, employeeData.status || "active").query(`
        UPDATE Employees 
        SET firstName = @firstName,
            lastName = @lastName,
            jobTitle = @jobTitle,
            startDate = @startDate,
            currentManager = @currentManager,
            directorRegionalDirector = @directorRegionalDirector,
            status = @status
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    console.log("✅ Employee updated successfully:", result.recordset[0]);
    return NextResponse.json(result.recordset[0]);
  } catch (error: any) {
    console.error("❌ Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee", details: error.message },
      { status: 500 }
    );
  }
}
