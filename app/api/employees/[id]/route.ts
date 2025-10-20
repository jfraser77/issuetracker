import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import sql from "mssql";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

    const employee = result.recordset[0];
    // Transform to include firstName and lastName for frontend compatibility
    const transformedEmployee = {
      ...employee,
      firstName: employee.name?.split(' ')[0] || '',
      lastName: employee.name?.split(' ').slice(1).join(' ') || '',
    };

    return NextResponse.json(transformedEmployee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    const pool = await connectToDatabase();

    // Use the actual database column names
    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .input("name", sql.NVarChar, data.name || `${data.firstName} ${data.lastName}`.trim())
      .input("jobTitle", sql.NVarChar, data.jobTitle)
      .input("startDate", sql.Date, data.startDate)
      .input("currentManager", sql.NVarChar, data.currentManager)
      .input("directorRegionalDirector", sql.NVarChar, data.directorRegionalDirector)
      .input("status", sql.NVarChar, data.status || 'active')
      .query(`
        UPDATE Employees 
        SET name = @name, 
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

    const updatedEmployee = result.recordset[0];
    const transformedEmployee = {
      ...updatedEmployee,
      firstName: updatedEmployee.name?.split(' ')[0] || '',
      lastName: updatedEmployee.name?.split(' ').slice(1).join(' ') || '',
    };

    return NextResponse.json({ 
      success: true, 
      message: "Employee updated successfully",
      employee: transformedEmployee
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE function remains the same as your current code
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
    const deleteResult = await pool
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