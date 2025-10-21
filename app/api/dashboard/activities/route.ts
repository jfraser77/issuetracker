import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    console.log("🔍 Fetching dashboard activities...");

    /**
     * SECTION 1: RECENT ACTIVITIES - This works fine now
     */
    let recentActivities = [];

    try {
      const employeeActivities = await pool.request().query(`
        SELECT TOP 10 
          firstName + ' ' + lastName as employee,
          jobTitle as department,
          'Employee Onboarded' as activity,
          timestamp as date,
          'completed' as status,
          '/management-portal/onboarding' as link
        FROM Employees 
        WHERE status = 'active'
        ORDER BY timestamp DESC
      `);

      recentActivities = employeeActivities.recordset.map((activity) => ({
        employee: activity.employee,
        department: activity.department,
        activity: activity.activity,
        date: new Date(activity.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: activity.status,
        link: activity.link,
      }));

      console.log(`✅ Found ${recentActivities.length} employee activities`);
    } catch (employeeError) {
      console.log("❌ Employee activities error:", employeeError.message);
    }

    /**
     * SECTION 2: PENDING ACTIONS - Handle missing table gracefully
     */
    let pendingActions = [];

    try {
      const terminationsResult = await pool.request().query(`
        SELECT TOP 5 
          employeeName as employee,
          department,
          'Pending Termination' as activity,
          terminationDate as date,
          'warning' as status,
          '/management-portal/terminations' as link
        FROM Terminations 
        WHERE status IN ('pending', 'overdue')
        ORDER BY terminationDate DESC
      `);

      pendingActions = terminationsResult.recordset.map((action) => ({
        employee: action.employee,
        department: action.department,
        activity: action.activity,
        date: new Date(action.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: action.status,
        link: action.link,
      }));

      console.log(`✅ Found ${pendingActions.length} pending terminations`);
    } catch (terminationError) {
      console.log(
        "ℹ️ Terminations table not available - this is normal if you don't have terminations data"
      );
      // Don't log as error since this table might not exist yet
    }

    /**
     * SECTION 3: SYSTEM ALERTS - Handle missing table gracefully
     */
    let systemAlerts = [];

    try {
      const approvalResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM PendingApprovals WHERE status = 'pending'
      `);

      const pendingCount = approvalResult.recordset[0]?.count || 0;

      if (pendingCount > 0) {
        systemAlerts.push({
          employee: "System",
          department: "Administration",
          activity: `${pendingCount} Role Approval Request(s) Pending`,
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: "warning",
          link: "/management-portal/admin/approvals",
        });
      }

      console.log(`✅ Found ${pendingCount} pending approvals`);
    } catch (approvalError) {
      console.log(
        "ℹ️ PendingApprovals table not available - this is normal if you don't have role approvals yet"
      );
    }

    console.log("📊 Final activities summary:", {
      recent: recentActivities.length,
      pending: pendingActions.length,
      alerts: systemAlerts.length,
    });

    return NextResponse.json({
      recentActivities,
      pendingActions,
      systemAlerts,
    });
  } catch (error: any) {
    console.error("❌ Critical error in activities API:", error.message);

    return NextResponse.json({
      recentActivities: [
        {
          employee: "Employee Management System",
          department: "Operations",
          activity: "System initialized and ready",
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: "completed",
          link: "/management-portal/dashboard",
        },
      ],
      pendingActions: [],
      systemAlerts: [],
    });
  }
}
