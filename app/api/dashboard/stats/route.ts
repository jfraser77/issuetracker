import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    /**
     * Execute multiple database queries in parallel for performance
     * Using safe queries that handle missing tables gracefully
     */
    const [
      employeesResult, // Total active employees count
      newThisMonthResult, // New employees added this month
      terminationsResult, // Pending termination requests
      laptopsResult, // Available laptops from IT inventory
      onboardingProgressResult,
      terminationProgressResult, // Removed problematic queries that cause errors
    ] = await Promise.all([
      // Query 1: Count all active employees in the system
      pool
        .request()
        .query(
          "SELECT COUNT(*) as count FROM Employees WHERE status = 'active'"
        ),

      // Query 2: Count employees who started in the current month (active status only)
      pool.request().query(`
        SELECT COUNT(*) as count FROM Employees 
        WHERE MONTH(startDate) = MONTH(GETDATE()) 
        AND YEAR(startDate) = YEAR(GETDATE())
        AND status = 'active'
      `),

      // Query 3: Safely check for terminations table
      pool
        .request()
        .query(
          `
        SELECT COUNT(*) as count FROM Terminations 
        WHERE status IN ('pending', 'overdue')
      `
        )
        .catch(() => ({ recordset: [{ count: 0 }] })), // Return 0 if table doesn't exist

      // Query 4: Safely check for IT staff inventory
      pool
        .request()
        .query("SELECT SUM(availableLaptops) as count FROM ITStaffInventory")
        .catch(() => ({ recordset: [{ count: 0 }] })), // Return 0 if table doesn't exist
      // Onboarding progress calculation
      pool
        .request()
        .query(
          `
    SELECT 
      AVG(progress) as avgProgress
    FROM (
      SELECT 
        e.id,
        CASE 
          WHEN COUNT(ot.id) = 0 THEN 0
          ELSE (SUM(CASE WHEN ot.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(ot.id))
        END as progress
      FROM Employees e
      LEFT JOIN EmployeeOnboardingTasks eot ON e.id = eot.employeeId
      CROSS APPLY OPENJSON(eot.onboardingTasks) WITH (
        id NVARCHAR(50),
        name NVARCHAR(255),
        status NVARCHAR(50)
      ) AS ot
      WHERE e.status = 'active'
      GROUP BY e.id
    ) as progress_data
  `
        )
        .catch(() => ({ recordset: [{ avgProgress: 0 }] })),
      pool
        .request()
        .query(
          `
    SELECT 
      AVG(CASE 
        WHEN status = 'completed' THEN 100
        WHEN status = 'in-progress' THEN 50
        ELSE 0 
      END) as avgProgress
    FROM Terminations 
    WHERE status IN ('pending', 'in-progress', 'completed')
  `
        )
        .catch(() => ({ recordset: [{ avgProgress: 0 }] })),
    ]);

    /**
     * Safely check for additional metrics without causing errors
     */
    let pendingApprovals = 0;
    let archivedCount = 0;
    let overdueReturns = 0;

    try {
      // Check for pending approvals safely
      const approvalResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM PendingApprovals WHERE status = 'pending'
      `);
      pendingApprovals = approvalResult.recordset[0]?.count || 0;
    } catch (error) {
      console.log("ℹ️ PendingApprovals table not available");
    }

    try {
      // Check for archived employees safely
      const archivedResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM Employees 
        WHERE status = 'terminated' OR status = 'archived'
      `);
      archivedCount = archivedResult.recordset[0]?.count || 0;
    } catch (error) {
      console.log("ℹ️ Archived count not available");
    }

    try {
      // Check for overdue returns safely
      const overdueResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM Terminations 
        WHERE status = 'overdue' 
        AND DATEDIFF(day, terminationDate, GETDATE()) > 30
      `);
      overdueReturns = overdueResult.recordset[0]?.count || 0;
    } catch (error) {
      console.log("ℹ️ Overdue returns not available");
    }

    /**
     * Compile all statistics into a single object
     * Using safe fallbacks for all metrics
     */
    const stats = {
      // Core employee metrics
      totalEmployees: employeesResult.recordset[0]?.count || 0,
      newThisMonth: newThisMonthResult.recordset[0]?.count || 0,
      pendingTerminations: terminationsResult.recordset[0]?.count || 0,
      // Onboarding and Termination Progress metric
      onboardingProgress: Math.round(
        onboardingProgressResult.recordset[0]?.avgProgress || 0
      ),
      terminationProgress: Math.round(
        terminationProgressResult.recordset[0]?.avgProgress || 0
      ),

      // IT asset metrics
      availableLaptops: laptopsResult.recordset[0]?.count || 0,

      // Role approval metrics (for admin users)
      pendingApprovals: pendingApprovals,

      // Historical/reporting metrics
      archivedCount: archivedCount,

      // Performance metrics - set to 0 since column doesn't exist
      completionRate: 0,

      // Compliance metrics
      overdueReturns: overdueReturns,
    };

    console.log("✅ Dashboard stats fetched successfully:", stats);

    return NextResponse.json(stats);
  } catch (error: any) {
    /**
     * Enhanced error handling with more specific error messages
     */
    console.error("❌ Error fetching dashboard stats:", error.message);

    // Return default values to prevent dashboard breakage
    return NextResponse.json({
      totalEmployees: 0,
      newThisMonth: 0,
      pendingTerminations: 0,
      availableLaptops: 0,
      pendingApprovals: 0,
      archivedCount: 0,
      completionRate: 0,
      overdueReturns: 0,
    });
  }
}
