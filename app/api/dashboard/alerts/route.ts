import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    // Fetch onboarding progress alerts
    const onboardingAlerts = await pool.request().query(`
      SELECT 
        e.id,
        e.firstName + ' ' + e.lastName as employeeName,
        e.jobTitle,
        COUNT(ot.id) as totalTasks,
        SUM(CASE WHEN ot.status = 'completed' THEN 1 ELSE 0 END) as completedTasks,
        e.timestamp
      FROM Employees e
      LEFT JOIN EmployeeOnboardingTasks eot ON e.id = eot.employeeId
      CROSS APPLY OPENJSON(eot.onboardingTasks) WITH (
        id NVARCHAR(50),
        name NVARCHAR(255),
        status NVARCHAR(50),
        notes NVARCHAR(MAX)
      ) AS ot
      WHERE e.status = 'active'
      GROUP BY e.id, e.firstName, e.lastName, e.jobTitle, e.timestamp
      HAVING COUNT(ot.id) > 0
    `);

    const alerts = onboardingAlerts.recordset.map((record) => {
      const progress =
        record.totalTasks > 0
          ? Math.round((record.completedTasks / record.totalTasks) * 100)
          : 0;

      return {
        id: `onboarding-${record.id}`,
        type: "onboarding" as const,
        title: "Onboarding in Progress",
        message: `${record.employeeName} - ${record.jobTitle}`,
        progress: progress,
        status: progress === 100 ? "completed" : ("in-progress" as const),
        timestamp: record.timestamp,
        viewed: false,
        // CHANGED: Link to main onboarding page instead of individual employee page
        link: "/management-portal/onboarding",
      };
    });

    // Add system alerts for overdue items
    try {
      const overdueResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM Terminations 
        WHERE status = 'overdue'
      `);

      if (overdueResult.recordset[0]?.count > 0) {
        alerts.push({
          id: "system-overdue",
          type: "system",
          title: "Overdue Terminations",
          message: `${overdueResult.recordset[0].count} termination(s) require immediate attention`,
          progress: 0,
          status: "pending",
          timestamp: new Date().toISOString(),
          viewed: false,
          link: "/management-portal/terminations?filter=overdue",
        });
      }
    } catch (error) {
      // Terminations table might not exist yet
    }

    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json([]);
  }
}
