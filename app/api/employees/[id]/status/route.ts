import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import sql from "mssql";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Fetch application status for an employee
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pool = await connectToDatabase();

    // Check if EmployeeStatus table exists, if not return default status
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'EmployeeStatus'
    `);

    if (tableCheck.recordset[0].count === 0) {
      // Return the default system applications structure
      const defaultStatus = {
        "E-Tenet ID #": { status: "not begun", notes: [] },
        "New User Network Access Request - tenetone.com": { status: "not begun", notes: [] },
        "Tenet Portal & TENET/USPI email - tenetone.com": { status: "not begun", notes: [] },
        "Citrix / Citrix Explorer": { status: "not begun", notes: [] },
        "USPI Billing drive": { status: "not begun", notes: [] },
        "CSO Public drive": { status: "not begun", notes: [] },
        "NSN1 Public drive": { status: "not begun", notes: [] },
        "Microsoft 365 license (Outlook and Teams)": { status: "not begun", notes: [] },
        "DDL - Digital Deposit Log": { status: "not begun", notes: [] },
        "Scan Chart - Req icon to be added to the user Citrix Explorer Account": { status: "not begun", notes: [] },
        "Patient Refund Portal - Role Specific": { status: "not begun", notes: [] },
        "Learn share - USPI university": { status: "not begun", notes: [] },
        "ProVation - Center Specific": { status: "not begun", notes: [] },
        "EOM Tool - Role Specific": { status: "not begun", notes: [] },
        "Bank Access - Role Specific Managers and above": { status: "not begun", notes: [] },
        "ENVI - Billing Dept": { status: "not begun", notes: [] },
        "Nimble - Billing Dept": { status: "not begun", notes: [] },
      };
      return NextResponse.json(defaultStatus);
    }

    const result = await pool
      .request()
      .input("employeeId", sql.Int, parseInt(id))
      .query("SELECT statusData FROM EmployeeStatus WHERE employeeId = @employeeId");

    if (result.recordset.length === 0) {
      // Return default status if no record exists
      const defaultStatus = {
        "E-Tenet ID #": { status: "not begun", notes: [] },
        // ... include all default applications
      };
      return NextResponse.json(defaultStatus);
    }

    return NextResponse.json(JSON.parse(result.recordset[0].statusData));
  } catch (error: any) {
    console.error("Error fetching employee status:", error);
    // Return empty object instead of default to avoid confusion
    return NextResponse.json({});
  }
}

// POST: Save application status for an employee - YOUR CURRENT CODE IS GOOD
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const statusData = await request.json();
    const pool = await connectToDatabase();

    // Validate that statusData is an object
    if (typeof statusData !== 'object' || statusData === null) {
      return NextResponse.json(
        { error: "Invalid status data format" },
        { status: 400 }
      );
    }

    // Create EmployeeStatus table if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmployeeStatus')
      CREATE TABLE EmployeeStatus (
        id INT IDENTITY(1,1) PRIMARY KEY,
        employeeId INT NOT NULL,
        statusData NVARCHAR(MAX) NOT NULL,
        timestamp DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (employeeId) REFERENCES Employees(id)
      )
    `);

    // Upsert the status data
    const result = await pool
      .request()
      .input("employeeId", sql.Int, parseInt(id))
      .input("statusData", sql.NVarChar, JSON.stringify(statusData)).query(`
        MERGE EmployeeStatus AS target
        USING (SELECT @employeeId as employeeId, @statusData as statusData) AS source
        ON target.employeeId = source.employeeId
        WHEN MATCHED THEN
          UPDATE SET statusData = source.statusData, timestamp = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (employeeId, statusData) VALUES (source.employeeId, source.statusData);
      `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving employee status:", error);
    return NextResponse.json(
      { error: "Failed to save employee status", details: error.message },
      { status: 500 }
    );
  }
}