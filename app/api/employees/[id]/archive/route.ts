import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise here
) {
  try {
    const { id } = await params; // Await the params
    const employeeId = parseInt(id);
    const { archivedBy = "system" } = await request.json();

    const pool = await connectToDatabase();

    // Get employee data before archiving
    const employeeResult = await pool
      .request()
      .input("id", sql.Int, employeeId)
      .query("SELECT * FROM Employees WHERE id = @id");

    if (employeeResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employee = employeeResult.recordset[0];

    // Get application status and IT assignment
    const statusResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query(
        "SELECT applicationStatus FROM EmployeeStatus WHERE employeeId = @employeeId"
      );

    const itAssignmentResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query("SELECT * FROM ITAssignments WHERE employeeId = @employeeId");

    const applicationStatus =
      statusResult.recordset[0]?.applicationStatus || "{}";
    const itStaffAssignment = itAssignmentResult.recordset[0]
      ? JSON.stringify(itAssignmentResult.recordset[0])
      : "{}";

    // Insert into ArchivedEmployees table
    await pool
      .request()
      .input("originalId", sql.Int, employeeId)
      .input("firstName", sql.NVarChar, employee.firstName)
      .input("lastName", sql.NVarChar, employee.lastName)
      .input("jobTitle", sql.NVarChar, employee.jobTitle)
      .input("startDate", sql.Date, employee.startDate)
      .input("currentManager", sql.NVarChar, employee.currentManager || "")
      .input(
        "directorRegionalDirector",
        sql.NVarChar,
        employee.directorRegionalDirector || ""
      )
      .input("applicationStatus", sql.NVarChar, applicationStatus)
      .input("itStaffAssignment", sql.NVarChar, itStaffAssignment)
      .input("timestamp", sql.DateTime, employee.timestamp)
      .input("archivedBy", sql.NVarChar, archivedBy).query(`
        INSERT INTO ArchivedEmployees 
        (originalId, firstName, lastName, jobTitle, startDate, currentManager, 
         directorRegionalDirector, applicationStatus, itStaffAssignment, timestamp, archivedBy)
        VALUES 
        (@originalId, @firstName, @lastName, @jobTitle, @startDate, @currentManager,
         @directorRegionalDirector, @applicationStatus, @itStaffAssignment, @timestamp, @archivedBy)
      `);

    // Update status in Employees table
    await pool
      .request()
      .input("id", sql.Int, employeeId)
      .input("status", sql.NVarChar, "archived")
      .query("UPDATE Employees SET status = @status WHERE id = @id");

    console.log(`Employee ${employeeId} archived by ${archivedBy}`);

    return NextResponse.json({
      success: true,
      message: "Employee archived successfully",
    });
  } catch (error: any) {
    console.error("Error archiving employee:", error);
    return NextResponse.json(
      { error: "Failed to archive employee" },
      { status: 500 }
    );
  }
}
