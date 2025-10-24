import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employeeId = parseInt(id);
    
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const { archivedBy = "system" } = await request.json();
    console.log(`🔵 Archiving employee ${employeeId} by ${archivedBy}`);

    const pool = await connectToDatabase();

    // 1. Get employee data before archiving
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
    console.log(`✅ Found employee: ${employee.firstName} ${employee.lastName}`);

    // 2. Get application status from EmployeeStatus table (using statusData column)
    let applicationStatus = "{}";
    try {
      const statusResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .query("SELECT statusData FROM EmployeeStatus WHERE employeeId = @employeeId");

      if (statusResult.recordset.length > 0 && statusResult.recordset[0].statusData) {
        applicationStatus = statusResult.recordset[0].statusData;
        console.log(`✅ Found application status data`);
      } else {
        console.log(`✅ No application status found, using empty object`);
      }
    } catch (statusError) {
      console.log(`✅ No EmployeeStatus record found, using empty object`);
    }

    // 3. Get IT assignment from ITAssignments table
    let itStaffAssignment = "{}";
    try {
      const itAssignmentResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .query("SELECT * FROM ITAssignments WHERE employeeId = @employeeId");

      if (itAssignmentResult.recordset.length > 0) {
        itStaffAssignment = JSON.stringify(itAssignmentResult.recordset[0]);
        console.log(`✅ Found IT assignment data`);
      } else {
        console.log(`✅ No IT assignment found, using empty object`);
      }
    } catch (itError) {
      console.log(`✅ No IT assignment record found, using empty object`);
    }

    // 4. Get onboarding tasks from EmployeeOnboardingTasks table
    let onboardingTasks = "[]";
    try {
      const tasksResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .query("SELECT * FROM EmployeeOnboardingTasks WHERE employeeId = @employeeId");

      if (tasksResult.recordset.length > 0) {
        onboardingTasks = JSON.stringify(tasksResult.recordset);
        console.log(`✅ Found ${tasksResult.recordset.length} onboarding tasks`);
      } else {
        console.log(`✅ No onboarding tasks found, using empty array`);
      }
    } catch (tasksError) {
      console.log(`✅ No onboarding tasks record found, using empty array`);
    }

    // 5. Insert into ArchivedEmployees table
    try {
      const archiveResult = await pool
        .request()
        .input("originalId", sql.Int, employeeId)
        .input("firstName", sql.NVarChar, employee.firstName || "")
        .input("lastName", sql.NVarChar, employee.lastName || "")
        .input("jobTitle", sql.NVarChar, employee.jobTitle || "")
        .input("startDate", sql.Date, employee.startDate)
        .input("currentManager", sql.NVarChar, employee.currentManager || "")
        .input(
          "directorRegionalDirector",
          sql.NVarChar,
          employee.directorRegionalDirector || ""
        )
        .input("applicationStatus", sql.NVarChar, applicationStatus)
        .input("itStaffAssignment", sql.NVarChar, itStaffAssignment)
        .input("onboardingTasks", sql.NVarChar, onboardingTasks)
        .input("timestamp", sql.DateTime, employee.timestamp)
        .input("archivedBy", sql.NVarChar, archivedBy)
        .input("archivedAt", sql.DateTime, new Date())
        .query(`
          INSERT INTO ArchivedEmployees 
          (originalId, firstName, lastName, jobTitle, startDate, currentManager, 
           directorRegionalDirector, applicationStatus, itStaffAssignment, onboardingTasks, 
           timestamp, archivedBy, archivedAt)
          OUTPUT INSERTED.*
          VALUES 
          (@originalId, @firstName, @lastName, @jobTitle, @startDate, @currentManager,
           @directorRegionalDirector, @applicationStatus, @itStaffAssignment, @onboardingTasks,
           @timestamp, @archivedBy, @archivedAt)
        `);
      
      console.log(`✅ Employee archived in ArchivedEmployees table with ID: ${archiveResult.recordset[0]?.id}`);
    } catch (archiveError: any) {
      console.error(`❌ Error inserting into ArchivedEmployees:`, archiveError.message);
      return NextResponse.json(
        { 
          error: "Failed to archive employee - database error", 
          details: archiveError.message 
        },
        { status: 500 }
      );
    }

    // 6. Update status in Employees table to 'archived'
    const updateResult = await pool
      .request()
      .input("id", sql.Int, employeeId)
      .input("status", sql.NVarChar, "archived")
      .query("UPDATE Employees SET status = @status WHERE id = @id");

    console.log(`✅ Employee ${employeeId} status updated to 'archived'`);

    return NextResponse.json({
      success: true,
      message: "Employee archived successfully",
    });
  } catch (error: any) {
    console.error("❌ Error archiving employee:", error);
    console.error("❌ Error details:", error.message);
    
    return NextResponse.json(
      { 
        error: "Failed to archive employee", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}