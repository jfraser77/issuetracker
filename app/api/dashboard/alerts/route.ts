import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role'); // Get user role for filtering
    
    const pool = await connectToDatabase();

    // Enhanced onboarding alerts query with department and better progress tracking
    const onboardingAlerts = await pool.request().query(`
      SELECT 
        e.id,
        e.firstName + ' ' + e.lastName as employeeName,
        e.jobTitle,
        e.department,
        e.hireDate,
        e.status,
        COUNT(ot.id) as totalTasks,
        SUM(CASE WHEN ot.status = 'completed' THEN 1 ELSE 0 END) as completedTasks,
        e.timestamp,
        e.createdAt
      FROM Employees e
      LEFT JOIN EmployeeOnboardingTasks eot ON e.id = eot.employeeId
      CROSS APPLY OPENJSON(eot.onboardingTasks) WITH (
        id NVARCHAR(50),
        name NVARCHAR(255),
        status NVARCHAR(50),
        notes NVARCHAR(MAX)
      ) AS ot
      WHERE e.status = 'active' 
        AND e.hireDate >= DATEADD(month, -1, GETDATE()) -- Only recent hires
      GROUP BY e.id, e.firstName, e.lastName, e.jobTitle, e.department, 
               e.hireDate, e.status, e.timestamp, e.createdAt
      HAVING COUNT(ot.id) > 0 
        AND SUM(CASE WHEN ot.status = 'completed' THEN 1 ELSE 0 END) < COUNT(ot.id) -- Only incomplete
    `);

    const alerts = onboardingAlerts.recordset.map((record) => {
      const progress =
        record.totalTasks > 0
          ? Math.round((record.completedTasks / record.totalTasks) * 100)
          : 0;

      // Enhanced status logic
      let status: "in-progress" | "completed" | "pending";
      if (progress === 100) {
        status = "completed";
      } else if (progress > 0) {
        status = "in-progress";
      } else {
        status = "pending";
      }

      return {
        id: `onboarding-${record.id}`,
        type: "onboarding" as const,
        title: `Onboarding ${status === "completed" ? "Complete" : "In Progress"}`,
        message: `${record.employeeName} - ${record.jobTitle} (${record.department})`,
        progress: progress,
        status: status,
        timestamp: record.createdAt || record.timestamp,
        viewed: false,
        // FIXED: Link to specific employee onboarding
        link: `/management-portal/onboarding/${record.id}`,
        // Added for better filtering
        department: record.department,
        employeeId: record.id
      };
    });

    // Role-based system alerts
    const systemAlerts = [];

    // Overdue terminations alert (for Admin/IT)
    if (!userRole || ['Admin', 'I.T.'].includes(userRole)) {
      try {
        const overdueResult = await pool.request().query(`
          SELECT COUNT(*) as count FROM Terminations 
          WHERE status = 'overdue' OR isOverdue = 1
        `);

        if (overdueResult.recordset[0]?.count > 0) {
          systemAlerts.push({
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
    }

    // Training completion alerts (for Trainer/HR)
    if (!userRole || ['Trainer', 'HR', 'Admin'].includes(userRole)) {
      try {
        const trainingResult = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM EmployeeTraining 
          WHERE completionDate IS NULL 
          AND dueDate < GETDATE()
        `);

        if (trainingResult.recordset[0]?.count > 0) {
          systemAlerts.push({
            id: "system-training-overdue",
            type: "system",
            title: "Overdue Training",
            message: `${trainingResult.recordset[0].count} training item(s) overdue`,
            progress: 0,
            status: "pending",
            timestamp: new Date().toISOString(),
            viewed: false,
            link: "/management-portal/reports?view=training",
          });
        }
      } catch (error) {
        // Training table might not exist yet
      }
    }

    // Combine all alerts
    const allAlerts = [...alerts, ...systemAlerts];

    // Sort by timestamp (newest first)
    allAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(allAlerts);
  } catch (error: any) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json([]);
  }
}