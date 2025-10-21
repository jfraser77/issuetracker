import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

interface RouteContext {
  params: {
    id: string;
  };
}

// GET single employee
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query("SELECT * FROM Employees WHERE id = @id");

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error: any) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee", details: error.message },
      { status: 500 }
    );
  }
}

// UPDATE employee
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .input("firstName", sql.NVarChar, data.firstName)
      .input("lastName", sql.NVarChar, data.lastName)
      .input("jobTitle", sql.NVarChar, data.jobTitle)
      .input("startDate", sql.Date, data.startDate)
      .input("currentManager", sql.NVarChar, data.currentManager || "")
      .input("directorRegionalDirector", sql.NVarChar, data.directorRegionalDirector || "")
      .input("status", sql.NVarChar, data.status || 'Active')
      .query(`
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

    return NextResponse.json({ 
      success: true, 
      message: "Employee updated successfully",
      employee: result.recordset[0]
    });
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE employee
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const employeeId = parseInt(id);
    
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // First, check if the employee exists
    const checkResult = await pool
      .request()
      .input("id", sql.Int, employeeId)
      .query("SELECT id FROM Employees WHERE id = @id");

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Delete related records first to avoid foreign key constraints
    try {
      await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .query("DELETE FROM EmployeeStatus WHERE employeeId = @employeeId");
    } catch (error) {
      console.log("No employee status to delete or table doesn't exist");
    }

    // Now delete the employee
    await pool
      .request()
      .input("id", sql.Int, employeeId)
      .query("DELETE FROM Employees WHERE id = @id");

    console.log(`Employee ${employeeId} deleted successfully`);

    return NextResponse.json({ 
      success: true, 
      message: "Employee deleted successfully" 
    });

  } catch (error: any) {
    console.error("Error deleting employee:", error);
    
    if (error.message?.includes("foreign key constraint") || error.number === 547) {
      return NextResponse.json(
        { error: "Cannot delete employee because they have related records in other tables. Please remove all related records first." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete employee: " + error.message },
      { status: 500 }
    );
  }
}