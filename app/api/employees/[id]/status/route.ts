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

    console.log(`🔵 GET /api/employees/${employeeId}/status called`);

    const pool = await connectToDatabase();

    const result = await pool.request().input("employeeId", sql.Int, employeeId)
      .query(`
        SELECT statusData, applicationStatus FROM EmployeeStatus 
        WHERE employeeId = @employeeId
      `);

    console.log(`✅ Status query result:`, result.recordset);

    if (result.recordset.length > 0) {
      const record = result.recordset[0];
      
      // Check both columns for data with proper error handling
      let statusData = null;
      
      // Try statusData column first
      if (record.statusData) {
        try {
          console.log(`✅ Found data in statusData column`);
          statusData = JSON.parse(record.statusData);
          console.log(`✅ Successfully parsed statusData`);
        } catch (parseError) {
          console.error(`❌ Failed to parse statusData:`, parseError);
          // Continue to check applicationStatus
        }
      }
      
      // If statusData is still null, try applicationStatus
      if (!statusData && record.applicationStatus) {
        try {
          console.log(`✅ Trying applicationStatus column`);
          statusData = JSON.parse(record.applicationStatus);
          console.log(`✅ Successfully parsed applicationStatus`);
        } catch (parseError) {
          console.error(`❌ Failed to parse applicationStatus:`, parseError);
        }
      }
      
      if (statusData) {
        console.log(`✅ Returning status data with ${Object.keys(statusData).length} tasks`);
        return NextResponse.json(statusData);
      } else {
        console.log(`✅ Found record but no parseable data, returning empty`);
        return NextResponse.json({});
      }
    }
    
    console.log(`✅ No status record found, returning empty object`);
    return NextResponse.json({});
  } catch (error: any) {
    console.error("❌ Error fetching employee status:", error);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to fetch employee status", details: error.message },
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
    
    // Validate employeeId
    if (isNaN(employeeId) || employeeId <= 0) {
      console.error(`❌ Invalid employeeId: ${id}`);
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const statusData = await request.json();

    console.log(`🔵 POST /api/employees/${employeeId}/status called`);
    console.log(`📦 Received status data type:`, typeof statusData);

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

    // Check if status exists
    const existingResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query("SELECT * FROM EmployeeStatus WHERE employeeId = @employeeId");

    console.log(`📊 Existing record check:`, existingResult.recordset);

    const statusDataJson = JSON.stringify(statusData);
    console.log(`📦 JSON length:`, statusDataJson.length);

    if (existingResult.recordset.length > 0) {
      // Update existing status - use statusData column
      console.log(`🔄 Updating existing status record in statusData column`);
      const updateResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("statusData", sql.NVarChar(sql.MAX), statusDataJson)
        .query(`
          UPDATE EmployeeStatus 
          SET statusData = @statusData,
              timestamp = GETDATE()
          WHERE employeeId = @employeeId
        `);
      console.log(`✅ Updated existing status, rows affected:`, updateResult.rowsAffected);
    } else {
      // Create new status - use statusData column
      console.log(`🔄 Creating new status record in statusData column`);
      const insertResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("statusData", sql.NVarChar(sql.MAX), statusDataJson)
        .query(`
          INSERT INTO EmployeeStatus (employeeId, statusData, timestamp)
          VALUES (@employeeId, @statusData, GETDATE())
        `);
      console.log(`✅ Created new status, rows affected:`, insertResult.rowsAffected);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error updating employee status:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error code:", error.code);
    
    // More specific error handling
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return NextResponse.json(
        { error: "Invalid JSON data", details: error.message },
        { status: 400 }
      );
    } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
      return NextResponse.json(
        { error: "Employee does not exist", details: error.message },
        { status: 404 }
      );
    } else if (error.message.includes('ELOGIN') || error.message.includes('ESOCKET')) {
      return NextResponse.json(
        { error: "Database connection failed", details: error.message },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update employee status", details: error.message },
      { status: 500 }
    );
  }
}