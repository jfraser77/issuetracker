import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

interface OnboardingTask {
  id: string;
  name: string;
  status: "not begun" | "in progress" | "completed" | "not applicable";
  notes: any[];
  completedBy?: string;
  completedAt?: string;
  isCustom?: boolean;
}

// GET - Fetch current default tasks
export async function GET() {
  try {
    const pool = await connectToDatabase();

    // Try to get default tasks from database
    const result = await pool.request().query(`
      SELECT TOP 1 task_data, created_at 
      FROM OnboardingDefaultTasks 
      ORDER BY created_at DESC
    `);

    if (result.recordset.length > 0 && result.recordset[0].task_data) {
      // Parse the JSON task data from database
      const taskData = JSON.parse(result.recordset[0].task_data);
      return NextResponse.json(taskData);
    } else {
      // Return fallback default tasks if none exist in database
      const fallbackTasks: OnboardingTask[] = [
        { id: "1", name: "E-Tenet ID #", status: "not begun", notes: [] },
        {
          id: "2",
          name: "New User Network Access Request - tenetone.com",
          status: "not begun",
          notes: [],
        },
        {
          id: "3",
          name: "Tenet Portal & TENET/USPI email - tenetone.com",
          status: "not begun",
          notes: [],
        },
        {
          id: "4",
          name: "Citrix / Citrix Explorer",
          status: "not begun",
          notes: [],
        },
        { id: "5", name: "USPI Billing drive", status: "not begun", notes: [] },
        { id: "6", name: "CSO Public drive", status: "not begun", notes: [] },
        { id: "7", name: "NSN1 Public drive", status: "not begun", notes: [] },
        {
          id: "8",
          name: "Microsoft 365 license (Outlook and Teams)",
          status: "not begun",
          notes: [],
        },
        {
          id: "9",
          name: "DDL - Digital Deposit Log",
          status: "not begun",
          notes: [],
        },
        {
          id: "10",
          name: "Scan Chart - Req icon to be added to the user Citrix Explorer Account",
          status: "not begun",
          notes: [],
        },
        {
          id: "11",
          name: "Patient Refund Portal - Role Specific",
          status: "not begun",
          notes: [],
        },
        {
          id: "12",
          name: "Learn share - USPI university",
          status: "not begun",
          notes: [],
        },
        {
          id: "13",
          name: "ProVation - Center Specific",
          status: "not begun",
          notes: [],
        },
        {
          id: "14",
          name: "EOM Tool - Role Specific",
          status: "not begun",
          notes: [],
        },
        {
          id: "15",
          name: "Bank Access - Role Specific Managers and above",
          status: "not begun",
          notes: [],
        },
        {
          id: "16",
          name: "ENVI - Billing Dept",
          status: "not begun",
          notes: [],
        },
        {
          id: "17",
          name: "Nimble - Billing Dept",
          status: "not begun",
          notes: [],
        },
        { id: "18", name: "Waystar", status: "not begun", notes: [] },
      ];
      return NextResponse.json(fallbackTasks);
    }
  } catch (error: any) {
    console.error("Error fetching default tasks:", error);

    // If table doesn't exist, return fallback tasks
    if (error.message?.includes("Invalid object name")) {
      const fallbackTasks: OnboardingTask[] = [
        { id: "1", name: "E-Tenet ID #", status: "not begun", notes: [] },
        {
          id: "2",
          name: "New User Network Access Request - tenetone.com",
          status: "not begun",
          notes: [],
        },
        {
          id: "3",
          name: "Tenet Portal & TENET/USPI email - tenetone.com",
          status: "not begun",
          notes: [],
        },
        {
          id: "4",
          name: "Citrix / Citrix Explorer",
          status: "not begun",
          notes: [],
        },
        { id: "5", name: "USPI Billing drive", status: "not begun", notes: [] },
        { id: "6", name: "CSO Public drive", status: "not begun", notes: [] },
        { id: "7", name: "NSN1 Public drive", status: "not begun", notes: [] },
        {
          id: "8",
          name: "Microsoft 365 license (Outlook and Teams)",
          status: "not begun",
          notes: [],
        },
        {
          id: "9",
          name: "DDL - Digital Deposit Log",
          status: "not begun",
          notes: [],
        },
        {
          id: "10",
          name: "Scan Chart - Req icon to be added to the user Citrix Explorer Account",
          status: "not begun",
          notes: [],
        },
        {
          id: "11",
          name: "Patient Refund Portal - Role Specific",
          status: "not begun",
          notes: [],
        },
        {
          id: "12",
          name: "Learn share - USPI university",
          status: "not begun",
          notes: [],
        },
        {
          id: "13",
          name: "ProVation - Center Specific",
          status: "not begun",
          notes: [],
        },
        {
          id: "14",
          name: "EOM Tool - Role Specific",
          status: "not begun",
          notes: [],
        },
        {
          id: "15",
          name: "Bank Access - Role Specific Managers and above",
          status: "not begun",
          notes: [],
        },
        {
          id: "16",
          name: "ENVI - Billing Dept",
          status: "not begun",
          notes: [],
        },
        {
          id: "17",
          name: "Nimble - Billing Dept",
          status: "not begun",
          notes: [],
        },
        { id: "18", name: "Waystar", status: "not begun", notes: [] },
      ];
      return NextResponse.json(fallbackTasks);
    }

    return NextResponse.json(
      { error: "Failed to fetch default tasks" },
      { status: 500 }
    );
  }
}

// POST - Update default tasks
export async function POST(request: NextRequest) {
  try {
    const tasks: OnboardingTask[] = await request.json();
    const pool = await connectToDatabase();

    // First, check if table exists, create if not
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnboardingDefaultTasks' AND xtype='U')
        CREATE TABLE OnboardingDefaultTasks (
          id INT IDENTITY(1,1) PRIMARY KEY,
          task_data NVARCHAR(MAX) NOT NULL,
          updated_by NVARCHAR(255),
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        )
      `);
    } catch (createError) {
      console.error("Error creating table:", createError);
      // Continue anyway - table might already exist
    }

    // Insert new default tasks
    const result = await pool
      .request()
      .input("task_data", sql.NVarChar, JSON.stringify(tasks))
      .input("updated_by", sql.NVarChar, "system").query(`
        INSERT INTO OnboardingDefaultTasks (task_data, updated_by) 
        OUTPUT INSERTED.id
        VALUES (@task_data, @updated_by)
      `);

    return NextResponse.json({
      success: true,
      message: "Default tasks updated successfully",
      id: result.recordset[0].id,
    });
  } catch (error: any) {
    console.error("Error updating default tasks:", error);
    return NextResponse.json(
      { error: "Failed to update default tasks" },
      { status: 500 }
    );
  }
}
