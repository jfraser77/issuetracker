import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    
    const [employeesResult, newThisMonthResult, terminationsResult, laptopsResult] = await Promise.all([
      pool.request().query("SELECT COUNT(*) as count FROM Employees WHERE status = 'active'"),
      pool.request().query(`
        SELECT COUNT(*) as count FROM Employees 
        WHERE MONTH(startDate) = MONTH(GETDATE()) 
        AND YEAR(startDate) = YEAR(GETDATE())
      `),
      pool.request().query(`
        SELECT COUNT(*) as count FROM Terminations 
        WHERE MONTH(terminationDate) = MONTH(GETDATE()) 
        AND YEAR(terminationDate) = YEAR(GETDATE())
      `),
      pool.request().query("SELECT COUNT(*) as count FROM Laptops WHERE status = 'available'")
    ]);

    const stats = {
      totalEmployees: employeesResult.recordset[0].count,
      newThisMonth: newThisMonthResult.recordset[0].count,
      terminationsThisMonth: terminationsResult.recordset[0].count,
      availableLaptops: laptopsResult.recordset[0].count,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}