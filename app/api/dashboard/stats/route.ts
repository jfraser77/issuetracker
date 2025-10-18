import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    
    const [employeesResult, newThisMonthResult, terminationsResult, laptopsResult] = await Promise.all([
      // Total active employees
      pool.request().query("SELECT COUNT(*) as count FROM Employees WHERE status = 'active'"),
      
      // New employees this month (fixed to include active status)
      pool.request().query(`
        SELECT COUNT(*) as count FROM Employees 
        WHERE MONTH(startDate) = MONTH(GETDATE()) 
        AND YEAR(startDate) = YEAR(GETDATE())
        AND status = 'active'
      `),
      
      // PENDING terminations (not terminations this month)
      pool.request().query(`
        SELECT COUNT(*) as count FROM Terminations 
        WHERE status IN ('pending', 'overdue')
      `),
      
      // Available laptops from ITStaffInventory (not Laptops table)
      pool.request().query("SELECT SUM(availableLaptops) as count FROM ITStaffInventory")
    ]);

    const stats = {
      totalEmployees: employeesResult.recordset[0]?.count || 0,
      newThisMonth: newThisMonthResult.recordset[0]?.count || 0,
      pendingTerminations: terminationsResult.recordset[0]?.count || 0, // Changed from terminationsThisMonth
      availableLaptops: laptopsResult.recordset[0]?.count || 0,
    };

    console.log("Dashboard stats fetched:", stats); // For debugging

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Return default values instead of error to prevent dashboard breakage
    return NextResponse.json({
      totalEmployees: 0,
      newThisMonth: 0,
      pendingTerminations: 0,
      availableLaptops: 0
    });
  }
}