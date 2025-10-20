import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    
    // Get both total pending and overdue counts
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as pendingReturns,
        SUM(CASE WHEN DATEDIFF(day, terminationDate, GETDATE()) > 30 THEN 1 ELSE 0 END) as overdueReturns
      FROM Terminations 
      WHERE status = 'pending'
    `);

    const pendingReturns = result.recordset[0]?.pendingReturns || 0;
    const overdueReturns = result.recordset[0]?.overdueReturns || 0;

    return NextResponse.json({
      pendingReturns,
      overdueReturns
    });
  } catch (error) {
    console.error("Error fetching termination stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch termination stats" },
      { status: 500 }
    );
  }
}