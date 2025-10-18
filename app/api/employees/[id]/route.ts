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

    return NextResponse.json(result.recordset[0]);
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

    await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .input("firstName", sql.NVarChar, data.firstName)
      .input("lastName", sql.NVarChar, data.lastName)
      .input("jobTitle", sql.NVarChar, data.jobTitle)
      .input("startDate", sql.Date, data.startDate)
      .input("currentManager", sql.NVarChar, data.currentManager)
      .input("directorRegionalDirector", sql.NVarChar, data.directorRegionalDirector)
      .query(`
        UPDATE Employees 
        SET firstName = @firstName, 
            lastName = @lastName, 
            jobTitle = @jobTitle, 
            startDate = @startDate, 
            currentManager = @currentManager, 
            directorRegionalDirector = @directorRegionalDirector,
            updatedAt = GETDATE()
        WHERE id = @id
      `);

    return NextResponse.json({ success: true, message: "Employee updated successfully" });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pool = await connectToDatabase();

    await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query("DELETE FROM Employees WHERE id = @id");

    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}