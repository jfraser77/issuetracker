import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role'); // For role-based filtering
    const limit = parseInt(searchParams.get('limit') || '20');

    const pool = await connectToDatabase();

    console.log("🔍 Fetching enhanced dashboard activities...");

    /**
     * SECTION 1: ENHANCED RECENT ACTIVITIES with detailed progress
     */
    let recentActivities = [];

    try {
      // Enhanced query with detailed onboarding progress and individual links
      const enhancedActivities = await pool.request().query(`
        SELECT 
          e.id,
          e.firstName + ' ' + e.lastName as employee,
          e.jobTitle as department,
          e.department as actualDepartment,
          e.timestamp as date,
          eot.onboardingTasks,
          -- Calculate detailed progress
          (
            SELECT COUNT(*) 
            FROM OPENJSON(eot.onboardingTasks) 
            WITH (status NVARCHAR(50))
          ) as totalTasks,
          (
            SELECT COUNT(*) 
            FROM OPENJSON(eot.onboardingTasks) 
            WITH (status NVARCHAR(50))
            WHERE status = 'completed'
          ) as completedTasks,
          -- Determine activity type based on progress
          CASE 
            WHEN NOT EXISTS (SELECT 1 FROM EmployeeOnboardingTasks WHERE employeeId = e.id) 
            THEN 'New Employee Added'
            WHEN (
              SELECT COUNT(*) 
              FROM OPENJSON(eot.onboardingTasks) 
              WITH (status NVARCHAR(50))
              WHERE status = 'completed'
            ) = 0 THEN 'Onboarding Started'
            WHEN (
              SELECT COUNT(*) 
              FROM OPENJSON(eot.onboardingTasks) 
              WITH (status NVARCHAR(50))
              WHERE status = 'completed'
            ) = (
              SELECT COUNT(*) 
              FROM OPENJSON(eot.onboardingTasks) 
              WITH (status NVARCHAR(50))
            ) THEN 'Onboarding Completed'
            ELSE 'Onboarding Progress Updated'
          END as activity,
          -- Enhanced status logic
          CASE 
            WHEN NOT EXISTS (SELECT 1 FROM EmployeeOnboardingTasks WHERE employeeId = e.id) 
            THEN 'pending'
            WHEN (
              SELECT COUNT(*) 
              FROM OPENJSON(eot.onboardingTasks) 
              WITH (status NVARCHAR(50))
              WHERE status = 'completed'
            ) = (
              SELECT COUNT(*) 
              FROM OPENJSON(eot.onboardingTasks) 
              WITH (status NVARCHAR(50))
            ) THEN 'completed'
            WHEN (
              SELECT COUNT(*) 
              FROM OPENJSON(eot.onboardingTasks) 
              WITH (status NVARCHAR(50))
              WHERE status = 'completed'
            ) > 0 THEN 'in progress'
            ELSE 'pending'
          END as status
        FROM Employees e
        LEFT JOIN EmployeeOnboardingTasks eot ON e.id = eot.employeeId
        WHERE e.status = 'active'
          AND e.timestamp >= DATEADD(day, -30, GETDATE()) -- Last 30 days only
        ORDER BY e.timestamp DESC
        OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
      `);

      recentActivities = enhancedActivities.recordset.map((activity) => {
        const progress = activity.totalTasks > 0 
          ? Math.round((activity.completedTasks / activity.totalTasks) * 100)
          : 0;

        // Enhanced activity description with progress
        let activityDescription = activity.activity;
        if (activity.activity === 'Onboarding Progress Updated' && progress > 0) {
          activityDescription = `Onboarding ${progress}% Complete`;
        }

        return {
          employee: activity.employee,
          department: activity.department,
          actualDepartment: activity.actualDepartment,
          activity: activityDescription,
          date: new Date(activity.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: activity.status,
          // FIXED: Link to specific employee onboarding
          link: `/management-portal/onboarding/${activity.id}`,
          // Additional metadata for enhanced display
          progress: progress,
          employeeId: activity.id,
          timestamp: activity.date
        };
      });

      console.log(`✅ Found ${recentActivities.length} enhanced employee activities`);
    } catch (enhancedError) {
      console.log("❌ Enhanced activities query failed:", enhancedError.message);
      
      // Fallback to basic query
      try {
        const fallbackActivities = await pool.request().query(`
          SELECT TOP ${limit}
            id,
            firstName + ' ' + lastName as employee,
            jobTitle as department,
            'Employee Onboarded' as activity,
            timestamp as date,
            'in progress' as status,
            '/management-portal/onboarding' as link
          FROM Employees 
          WHERE status = 'active'
          ORDER BY timestamp DESC
        `);

        recentActivities = fallbackActivities.recordset.map((activity) => ({
          employee: activity.employee,
          department: activity.department,
          activity: activity.activity,
          date: new Date(activity.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: activity.status,
          link: `/management-portal/onboarding/${activity.id}`, // Still use specific link
          employeeId: activity.id
        }));
      } catch (fallbackError) {
        console.log("❌ Fallback activities also failed");
      }
    }

    /**
     * SECTION 2: ENHANCED PENDING ACTIONS with role-based filtering
     */
    let pendingActions = [];

    // Termination actions (visible to Admin, HR, IT)
    if (!userRole || ['Admin', 'HR', 'I.T.'].includes(userRole)) {
      try {
        const terminationsResult = await pool.request().query(`
          SELECT TOP 5 
            id,
            employeeName as employee,
            department,
            'Pending Termination' as activity,
            terminationDate as date,
            CASE 
              WHEN status = 'overdue' OR isOverdue = 1 THEN 'warning'
              ELSE 'pending'
            END as status,
            '/management-portal/terminations' as link
          FROM Terminations 
          WHERE status IN ('pending', 'overdue', 'in-progress')
          ORDER BY terminationDate ASC
        `);

        terminationsResult.recordset.forEach((action) => {
          pendingActions.push({
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
            priority: action.status === 'warning' ? 'high' : 'medium'
          });
        });

        console.log(`✅ Found ${terminationsResult.recordset.length} pending terminations`);
      } catch (terminationError) {
        console.log("ℹ️ Terminations table not available");
      }
    }

    // Incomplete onboarding (visible to HR, Trainer, Admin)
    if (!userRole || ['HR', 'Trainer', 'Admin'].includes(userRole)) {
      try {
        const incompleteOnboarding = await pool.request().query(`
          SELECT TOP 5
            e.id,
            e.firstName + ' ' + e.lastName as employee,
            e.jobTitle as department,
            'Onboarding Requires Attention' as activity,
            e.timestamp as date,
            'warning' as status,
            COUNT(ot.id) as totalTasks,
            SUM(CASE WHEN ot.status = 'completed' THEN 1 ELSE 0 END) as completedTasks
          FROM Employees e
          INNER JOIN EmployeeOnboardingTasks eot ON e.id = eot.employeeId
          CROSS APPLY OPENJSON(eot.onboardingTasks) WITH (
            id NVARCHAR(50),
            status NVARCHAR(50)
          ) AS ot
          WHERE e.status = 'active'
          GROUP BY e.id, e.firstName, e.lastName, e.jobTitle, e.timestamp
          HAVING SUM(CASE WHEN ot.status = 'completed' THEN 1 ELSE 0 END) < COUNT(ot.id)
            AND COUNT(ot.id) > 0
          ORDER BY e.timestamp DESC
        `);

        incompleteOnboarding.recordset.forEach((activity) => {
          const progress = activity.totalTasks > 0 
            ? Math.round((activity.completedTasks / activity.totalTasks) * 100)
            : 0;

          pendingActions.push({
            employee: activity.employee,
            department: activity.department,
            activity: `Onboarding ${progress}% Complete - Needs Review`,
            date: new Date(activity.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status: 'warning',
            link: `/management-portal/onboarding/${activity.id}`,
            priority: 'medium',
            progress: progress
          });
        });

        console.log(`✅ Added ${incompleteOnboarding.recordset.length} incomplete onboarding items`);
      } catch (onboardingError) {
        console.log("❌ Could not fetch incomplete onboarding data");
      }
    }

    /**
     * SECTION 3: ENHANCED SYSTEM ALERTS
     */
    let systemAlerts = [];

    // Role approval alerts (Admin only)
    if (!userRole || userRole === 'Admin') {
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
            priority: 'high'
          });
        }
      } catch (approvalError) {
        console.log("ℹ️ PendingApprovals table not available");
      }
    }

    // Equipment alerts (IT and Admin only)
    if (!userRole || ['I.T.', 'Admin'].includes(userRole)) {
      try {
        const equipmentResult = await pool.request().query(`
          SELECT COUNT(*) as count FROM ITAssets 
          WHERE status = 'maintenance' OR status = 'needs_replacement'
        `);

        const equipmentCount = equipmentResult.recordset[0]?.count || 0;

        if (equipmentCount > 0) {
          systemAlerts.push({
            employee: "System",
            department: "IT Department",
            activity: `${equipmentCount} Equipment Item(s) Need Attention`,
            date: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status: "warning",
            link: "/management-portal/it-assets",
            priority: 'medium'
          });
        }
      } catch (equipmentError) {
        console.log("ℹ️ ITAssets table not available");
      }
    }

    console.log("📊 Final enhanced activities summary:", {
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
    console.error("❌ Critical error in enhanced activities API:", error.message);

    // Enhanced fallback response
    return NextResponse.json({
      recentActivities: [
        {
          employee: "Employee Management System",
          department: "Operations",
          activity: "System initialized and ready for onboarding",
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