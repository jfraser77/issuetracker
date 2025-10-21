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
        SELECT * FROM ITAssignments 
        WHERE employeeId = @employeeId
      `);

    if (result.recordset.length > 0) {
      return NextResponse.json(result.recordset[0]);
    } else {
      return NextResponse.json({ status: "not assigned" });
    }
  } catch (error: any) {
    console.error("Error fetching IT assignment:", error);
    return NextResponse.json(
      { error: "Failed to fetch IT assignment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise here
) {
  try {
    const { id } = await params; // Await the params
    const employeeId = parseInt(id);
    const assignmentData = await request.json();

    const pool = await connectToDatabase();

    // Check if assignment exists
    const existingResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId).query(`
        SELECT * FROM ITAssignments 
        WHERE employeeId = @employeeId
      `);

    if (existingResult.recordset.length > 0) {
      // Update existing assignment
      const result = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("assignedToId", sql.Int, assignmentData.assignedToId || null)
        .input("status", sql.NVarChar, assignmentData.status || "not assigned")
        .query(`
          UPDATE ITAssignments 
          SET assignedToId = @assignedToId, 
              status = @status,
              updatedAt = GETDATE()
          WHERE employeeId = @employeeId
          OUTPUT INSERTED.*
        `);

      return NextResponse.json(result.recordset[0]);
    } else {
      // Create new assignment
      const result = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("assignedToId", sql.Int, assignmentData.assignedToId || null)
        .input("status", sql.NVarChar, assignmentData.status || "not assigned")
        .query(`
          INSERT INTO ITAssignments (employeeId, assignedToId, status)
          OUTPUT INSERTED.*
          VALUES (@employeeId, @assignedToId, @status)
        `);

      return NextResponse.json(result.recordset[0]);
    }
  } catch (error: any) {
    console.error("Error updating IT assignment:", error);
    return NextResponse.json(
      { error: "Failed to update IT assignment" },
      { status: 500 }
    );
  }
}
