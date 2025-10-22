import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import sql from "mssql";

export async function POST() {
  try {
    const pool = await connectToDatabase();

    // Archive orders that were received more than 30 days ago and set canUnarchive flag
    const result = await pool.request().query(`
      UPDATE LaptopOrders 
      SET isArchived = 1, canUnarchive = 1
      WHERE status = 'received' 
      AND receivedDate < DATEADD(day, -30, GETDATE())
      AND isArchived = 0
    `);

    console.log(`Auto-archived ${result.rowsAffected[0]} old orders`);

    return NextResponse.json({
      archived: result.rowsAffected[0],
      message: "Old orders archived successfully",
    });
  } catch (error: any) {
    console.error("Error archiving orders:", error);
    return NextResponse.json(
      { error: "Failed to archive orders", details: error.message },
      { status: 500 }
    );
  }
}