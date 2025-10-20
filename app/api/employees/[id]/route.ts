import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import { CreateNewEmployee } from "../../../types/employee";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query(`
      SELECT * FROM Employees 
      ORDER BY timestamp DESC
    `);

    // Transform the data to match your frontend expectations
    const employees = result.recordset.map(employee => ({
      ...employee,
      firstName: employee.name.split(' ')[0] || '', // Extract first name
      lastName: employee.name.split(' ').slice(1).join(' ') || '', // Extract last name
    }));

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("Error fetching employees:", error);
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
    const hasFirstNameLastName = employeeData.firstName && employeeData.lastName;
    const hasFullName = employeeData.name;
    
    if ((!hasFirstNameLastName && !hasFullName) || !employeeData.jobTitle || !employeeData.startDate) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Name (or First/Last Name), Job Title, and Start Date are required" },
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

    const result = await pool
      .request()
      .input("name", name)
      .input("jobTitle", employeeData.jobTitle)
      .input("startDate", employeeData.startDate)
      .input("currentManager", employeeData.currentManager || "")
      .input("directorRegionalDirector", employeeData.directorRegionalDirector || "")
      .query(`
        INSERT INTO Employees (name, jobTitle, startDate, currentManager, directorRegionalDirector)
        OUTPUT INSERTED.*
        VALUES (@name, @jobTitle, @startDate, @currentManager, @directorRegionalDirector)
      `);

    console.log("✅ Employee created successfully:", result.recordset[0]);
    
    // Transform the response to include firstName and lastName
    const createdEmployee = result.recordset[0];
    const responseEmployee = {
      ...createdEmployee,
      firstName: createdEmployee.name.split(' ')[0] || '',
      lastName: createdEmployee.name.split(' ').slice(1).join(' ') || '',
    };

    return NextResponse.json(responseEmployee, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee", details: error.message },
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

// DELETE function
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