import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import sql from "mssql";

// GET: Fetch application status for an employee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await connectToDatabase();

    // Check if EmployeeStatus table exists, if not return default status
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'EmployeeStatus'
    `);

    if (tableCheck.recordset[0].count === 0) {
      return NextResponse.json({});
    }

    const result = await pool
      .request()
      .input("employeeId", sql.Int, params.id)
      .query(
        "SELECT statusData FROM EmployeeStatus WHERE employeeId = @employeeId"
      );

    if (result.recordset.length === 0) {
      return NextResponse.json({});
    }

    return NextResponse.json(JSON.parse(result.recordset[0].statusData));
  } catch (error: any) {
    console.error("Error fetching employee status:", error);
    return NextResponse.json({});
  }
}

// POST: Save application status for an employee
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statusData = await request.json();
    const pool = await connectToDatabase();

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
      .input("employeeId", sql.Int, params.id)
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
