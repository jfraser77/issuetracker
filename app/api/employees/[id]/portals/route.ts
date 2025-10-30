import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employeeId = parseInt(id);

    console.log(`🔵 GET /api/employees/${employeeId}/portals called`);

    if (isNaN(employeeId) || employeeId <= 0) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // First, verify the employee exists
    const employeeCheck = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query("SELECT id FROM Employees WHERE id = @employeeId");

    if (employeeCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Try to get portals from the database
    const result = await pool.request().input("employeeId", sql.Int, employeeId)
      .query(`
        SELECT portals FROM EmployeePortals 
        WHERE employeeId = @employeeId
      `);

    console.log(`📊 Portals query result:`, result.recordset);

    if (result.recordset.length > 0 && result.recordset[0].portals) {
      try {
        const portals = JSON.parse(result.recordset[0].portals);
        console.log(
          `✅ Loaded ${portals.length} portals for employee ${employeeId}`
        );
        return NextResponse.json(portals);
      } catch (parseError) {
        console.error(`❌ Failed to parse portals:`, parseError);
        // Return empty array if parsing fails
        return NextResponse.json([]);
      }
    }

    console.log(
      `✅ No saved portals found for employee ${employeeId}, returning empty array`
    );
    return NextResponse.json([]);
  } catch (error: any) {
    console.error("❌ Error fetching employee portals:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee portals", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employeeId = parseInt(id);

    console.log(`🔵 POST /api/employees/${employeeId}/portals called`);

    // Validate employeeId
    if (isNaN(employeeId) || employeeId <= 0) {
      console.error(`❌ Invalid employeeId: ${id}`);
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const portalsData = await request.json();
    console.log(
      `📦 Received ${portalsData.length} portals for employee ${employeeId}`
    );

    // Validate portals data
    if (!Array.isArray(portalsData)) {
      return NextResponse.json(
        { error: "Portals data must be an array" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // First, verify the employee exists
    const employeeCheck = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query("SELECT id FROM Employees WHERE id = @employeeId");

    if (employeeCheck.recordset.length === 0) {
      console.error(`❌ Employee ${employeeId} not found`);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const portalsJson = JSON.stringify(portalsData);
    console.log(`📦 JSON data length:`, portalsJson.length);

    // Check if portals already exist
    const existingResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query(
        "SELECT * FROM EmployeePortals WHERE employeeId = @employeeId"
      );

    console.log(
      `📊 Existing portals check:`,
      existingResult.recordset
    );

    if (existingResult.recordset.length > 0) {
      // Update existing portals
      console.log(`🔄 Updating existing portals`);
      const updateResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("portals", sql.NVarChar(sql.MAX), portalsJson).query(`
          UPDATE EmployeePortals 
          SET portals = @portals,
              updatedAt = GETDATE()
          WHERE employeeId = @employeeId
        `);
      console.log(
        `✅ Updated portals, rows affected:`,
        updateResult.rowsAffected
      );
    } else {
      // Create new portals record
      console.log(`🔄 Creating new portals record`);
      const insertResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("portals", sql.NVarChar(sql.MAX), portalsJson).query(`
          INSERT INTO EmployeePortals (employeeId, portals, createdAt, updatedAt)
          VALUES (@employeeId, @portals, GETDATE(), GETDATE())
        `);
      console.log(
        `✅ Created new portals, rows affected:`,
        insertResult.rowsAffected
      );
    }

    return NextResponse.json({
      success: true,
      message: "Portals saved successfully",
      portalCount: portalsData.length,
    });
  } catch (error: any) {
    console.error("❌ Error saving employee portals:", error);
    console.error("❌ Error message:", error.message);

    // More specific error handling
    if (error.message.includes("JSON") || error.message.includes("parse")) {
      return NextResponse.json(
        { error: "Invalid JSON data", details: error.message },
        { status: 400 }
      );
    } else if (
      error.message.includes("foreign key") ||
      error.message.includes("constraint")
    ) {
      return NextResponse.json(
        { error: "Employee does not exist", details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save employee portals", details: error.message },
      { status: 500 }
    );
  }
}