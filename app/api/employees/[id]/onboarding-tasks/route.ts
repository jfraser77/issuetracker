import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const employeeId = parseInt(id);

    console.log(`🔵 GET /api/employees/${employeeId}/onboarding-tasks called`);

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

    // Try to get onboarding tasks from the database
    const result = await pool.request().input("employeeId", sql.Int, employeeId)
      .query(`
        SELECT onboardingTasks FROM EmployeeOnboardingTasks 
        WHERE employeeId = @employeeId
      `);

    console.log(`📊 Onboarding tasks query result:`, result.recordset);

    if (result.recordset.length > 0 && result.recordset[0].onboardingTasks) {
      try {
        const tasks = JSON.parse(result.recordset[0].onboardingTasks);
        console.log(
          `✅ Loaded ${tasks.length} onboarding tasks for employee ${employeeId}`
        );
        return NextResponse.json(tasks);
      } catch (parseError) {
        console.error(`❌ Failed to parse onboarding tasks:`, parseError);
        // Return empty array if parsing fails
        return NextResponse.json([]);
      }
    }

    console.log(
      `✅ No saved onboarding tasks found for employee ${employeeId}, returning empty array`
    );
    return NextResponse.json([]);
  } catch (error: any) {
    console.error("❌ Error fetching onboarding tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding tasks", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const employeeId = parseInt(id);

    console.log(`🔵 POST /api/employees/${employeeId}/onboarding-tasks called`);

    // Validate employeeId
    if (isNaN(employeeId) || employeeId <= 0) {
      console.error(`❌ Invalid employeeId: ${id}`);
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const tasksData = await request.json();
    console.log(
      `📦 Received ${tasksData.length} tasks for employee ${employeeId}`
    );

    // Validate tasks data
    if (!Array.isArray(tasksData)) {
      return NextResponse.json(
        { error: "Tasks data must be an array" },
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

    const tasksJson = JSON.stringify(tasksData);
    console.log(`📦 JSON data length:`, tasksJson.length);

    // Check if onboarding tasks already exist
    const existingResult = await pool
      .request()
      .input("employeeId", sql.Int, employeeId)
      .query(
        "SELECT * FROM EmployeeOnboardingTasks WHERE employeeId = @employeeId"
      );

    console.log(
      `📊 Existing onboarding tasks check:`,
      existingResult.recordset
    );

    if (existingResult.recordset.length > 0) {
      // Update existing tasks
      console.log(`🔄 Updating existing onboarding tasks`);
      const updateResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("onboardingTasks", sql.NVarChar(sql.MAX), tasksJson).query(`
          UPDATE EmployeeOnboardingTasks 
          SET onboardingTasks = @onboardingTasks,
              updatedAt = GETDATE()
          WHERE employeeId = @employeeId
        `);
      console.log(
        `✅ Updated onboarding tasks, rows affected:`,
        updateResult.rowsAffected
      );
    } else {
      // Create new tasks record
      console.log(`🔄 Creating new onboarding tasks record`);
      const insertResult = await pool
        .request()
        .input("employeeId", sql.Int, employeeId)
        .input("onboardingTasks", sql.NVarChar(sql.MAX), tasksJson).query(`
          INSERT INTO EmployeeOnboardingTasks (employeeId, onboardingTasks, createdAt, updatedAt)
          VALUES (@employeeId, @onboardingTasks, GETDATE(), GETDATE())
        `);
      console.log(
        `✅ Created new onboarding tasks, rows affected:`,
        insertResult.rowsAffected
      );
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding tasks saved successfully",
      taskCount: tasksData.length,
    });
  } catch (error: any) {
    console.error("❌ Error saving onboarding tasks:", error);
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
      { error: "Failed to save onboarding tasks", details: error.message },
      { status: 500 }
    );
  }
}
