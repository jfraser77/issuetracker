import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    console.log("📊 Fetching enhanced dashboard statistics...");

    /**
     * Execute multiple database queries in parallel for performance
     */
    const [
      employeesResult,
      newThisMonthResult,
      terminationsResult,
      laptopsResult,
      onboardingProgressResult,
      terminationProgressResult,
    ] = await Promise.all([
      // Query 1: Count all active employees
      pool
        .request()
        .query(
          "SELECT COUNT(*) as count FROM Employees WHERE status = 'active'"
        ),

      // Query 2: IMPROVED - Count employees who started in current month
      pool.request().query(`
        SELECT COUNT(*) as count FROM Employees 
        WHERE status = 'active'
        AND startDate >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) -- First day of current month
        AND startDate < DATEADD(month, DATEDIFF(month, 0, GETDATE()) + 1, 0) -- First day of next month
      `),

      // Query 3: Pending terminations
      pool
        .request()
        .query(
          `
        SELECT COUNT(*) as count FROM Terminations 
        WHERE status IN ('pending', 'overdue')
      `
        )
        .catch(() => ({ recordset: [{ count: 0 }] })),

      // Query 4: Available laptops
      pool
        .request()
        .query("SELECT SUM(availableLaptops) as count FROM ITStaffInventory")
        .catch(() => ({ recordset: [{ count: 0 }] })),

      // Query 5: Onboarding progress
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

      // Query 6: Termination progress
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
     * Safely check for additional metrics
     */
    let pendingApprovals = 0;
    let archivedCount = 0;
    let overdueReturns = 0;
    let completionRate = 0;

    try {
      // Enhanced completion rate calculation
      const completionResult = await pool.request().query(`
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
          END as rate
        FROM EmployeeOnboardingTasks eot
        CROSS APPLY OPENJSON(eot.onboardingTasks) WITH (
          status NVARCHAR(50)
        )
      `);
      completionRate = Math.round(completionResult.recordset[0]?.rate || 0);
    } catch (error) {
      console.log("ℹ️ Completion rate calculation not available");
    }

    try {
      const approvalResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM PendingApprovals WHERE status = 'pending'
      `);
      pendingApprovals = approvalResult.recordset[0]?.count || 0;
    } catch (error) {
      console.log("ℹ️ PendingApprovals table not available");
    }

    try {
      const archivedResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM Employees 
        WHERE status = 'terminated' OR status = 'archived'
      `);
      archivedCount = archivedResult.recordset[0]?.count || 0;
    } catch (error) {
      console.log("ℹ️ Archived count not available");
    }

    try {
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
     * Compile all statistics with enhanced logging
     */
    const stats = {
      totalEmployees: employeesResult.recordset[0]?.count || 0,
      newThisMonth: newThisMonthResult.recordset[0]?.count || 0,
      pendingTerminations: terminationsResult.recordset[0]?.count || 0,
      onboardingProgress: Math.round(
        onboardingProgressResult.recordset[0]?.avgProgress || 0
      ),
      terminationProgress: Math.round(
        terminationProgressResult.recordset[0]?.avgProgress || 0
      ),
      availableLaptops: laptopsResult.recordset[0]?.count || 0,
      pendingApprovals: pendingApprovals,
      archivedCount: archivedCount,
      completionRate: completionRate, // Now properly calculated
      overdueReturns: overdueReturns,
    };

    console.log("✅ Enhanced dashboard stats fetched:", {
      totalEmployees: stats.totalEmployees,
      newThisMonth: stats.newThisMonth,
      pendingTerminations: stats.pendingTerminations,
      onboardingProgress: stats.onboardingProgress,
      availableLaptops: stats.availableLaptops
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("❌ Error fetching dashboard stats:", error.message);

    // Return default values with enhanced fallback
    return NextResponse.json({
      totalEmployees: 0,
      newThisMonth: 0,
      pendingTerminations: 0,
      availableLaptops: 0,
      pendingApprovals: 0,
      archivedCount: 0,
      completionRate: 0,
      overdueReturns: 0,
      onboardingProgress: 0,
      terminationProgress: 0,
    });
  }
}