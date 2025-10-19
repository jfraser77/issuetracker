import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await connectToDatabase();
    
    // Count pending terminations (status = 'pending' and not overdue)
    const result = await pool.request().query(`
      SELECT COUNT(*) as pendingReturns 
      FROM Terminations 
      WHERE status = 'pending' 
      AND DATEDIFF(day, terminationDate, GETDATE()) <= 30
    `);

    const pendingReturns = result.recordset[0]?.pendingReturns || 0;

    return NextResponse.json({
      pendingReturns
    });
  } catch (error) {
    console.error("Error fetching termination stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch termination stats" },
      { status: 500 }
    );
  }
}