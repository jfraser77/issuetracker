import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    // Create missing inventory records
    const result = await pool.request().query(`
      INSERT INTO ITStaffInventory (userId, availableLaptops)
      SELECT u.id, 0 
      FROM Users u
      WHERE u.id NOT IN (SELECT userId FROM ITStaffInventory)
    `);

    // Get count of all inventory records
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM ITStaffInventory
    `);

    return NextResponse.json({
      success: true,
      created: result.rowsAffected[0],
      total: countResult.recordset[0].total,
    });
  } catch (error: any) {
    console.error("Error fixing inventory:", error);
    return NextResponse.json(
      { error: "Failed to fix inventory" },
      { status: 500 }
    );
  }
}
