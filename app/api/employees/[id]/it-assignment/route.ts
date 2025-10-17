import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = parseInt(params.id);
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('employeeId', employeeId)
      .query(`
        SELECT it.*, u.name, u.email, u.role
        FROM EmployeeITAssignments it
        LEFT JOIN Users u ON it.assignedToId = u.id
        WHERE it.employeeId = @employeeId
      `);

    return NextResponse.json(result.recordset[0] || { status: "not assigned" });
  } catch (error) {
    console.error("Error fetching IT assignment:", error);
    return NextResponse.json({ status: "not assigned" });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = parseInt(params.id);
    const { assignedToId, status } = await request.json();
    
    const pool = await connectToDatabase();
    
    // Upsert the assignment
    await pool.request()
      .input('employeeId', employeeId)
      .input('assignedToId', assignedToId || null)
      .input('status', status)
      .query(`
        MERGE EmployeeITAssignments AS target
        USING (SELECT @employeeId AS employeeId) AS source
        ON target.employeeId = source.employeeId
        WHEN MATCHED THEN
          UPDATE SET assignedToId = @assignedToId, status = @status, updatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (employeeId, assignedToId, status) 
          VALUES (@employeeId, @assignedToId, @status);
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating IT assignment:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}