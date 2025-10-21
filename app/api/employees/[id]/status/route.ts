import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise here
) {
  try {
    const { id } = await params; // Await the params
    const employeeId = parseInt(id);

    const pool = await connectToDatabase();

    const result = await pool.request().input("employeeId", sql.Int, employeeId)
      .query(`
        SELECT applicationStatus FROM EmployeeStatus 
        WHERE employeeId = @employeeId
      `);

    if (result.recordset.length > 0 && result.recordset[0].applicationStatus) {
      return NextResponse.json(
        JSON.parse(result.recordset[0].applicationStatus)
      );
    } else {
      return NextResponse.json({});
    }
  } catch (error: any) {
    console.error("Error fetching employee status:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee status" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise here
) {
  try {
    const { id } = await params; // Await the params
    const employeeId = parseInt(id);
    const statusData = await request.json();

    const pool = await connectToDatabase();

    // Check if status exists
    const existingResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId).query(`
        SELECT * FROM EmployeeStatus 
        WHERE employeeId = @employeeId
      `);

    if (existingResult.recordset.length > 0) {
      // Update existing status
      await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("applicationStatus", sql.NVarChar, JSON.stringify(statusData))
        .query(`
          UPDATE EmployeeStatus 
          SET applicationStatus = @applicationStatus,
              updatedAt = GETDATE()
          WHERE employeeId = @employeeId
        `);
    } else {
      // Create new status
      await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("applicationStatus", sql.NVarChar, JSON.stringify(statusData))
        .query(`
          INSERT INTO EmployeeStatus (employeeId, applicationStatus)
          VALUES (@employeeId, @applicationStatus)
        `);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating employee status:", error);
    return NextResponse.json(
      { error: "Failed to update employee status" },
      { status: 500 }
    );
  }
}
