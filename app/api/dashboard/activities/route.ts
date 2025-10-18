import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    // Get recent onboarding activities
    const onboardingActivities = await pool.request().query(`
      SELECT 
        firstName + ' ' + lastName as employee,
        jobTitle as department,
        'Onboarding Started' as activity,
        timestamp as date,
        'pending' as status
      FROM Employees 
      WHERE timestamp >= DATEADD(day, -30, GETDATE())
      ORDER BY timestamp DESC
    `);

    // Get recent termination activities  
    const terminationActivities = await pool.request().query(`
      SELECT 
        employeeName as employee,
        department,
        'Termination Initiated' as activity,
        timestamp as date,
        CASE 
          WHEN status = 'overdue' THEN 'overdue'
          ELSE 'warning'
        END as status
      FROM Terminations 
      WHERE timestamp >= DATEADD(day, -30, GETDATE())
      ORDER BY timestamp DESC
    `);

    // Combine and format activities
    const activities = [
      ...onboardingActivities.recordset,
      ...terminationActivities.recordset
    ].map(activity => ({
      employee: activity.employee,
      department: activity.department,
      activity: activity.activity,
      date: new Date(activity.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      status: activity.status
    })).slice(0, 10); // Limit to 10 most recent

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json([]);
  }
}