import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise here
) {
  try {
    const { id } = await params; // Await the params
    const employeeId = parseInt(id);
    const { unarchivedBy = "system" } = await request.json();

    const pool = await connectToDatabase();

    // Update status back to active
    await pool
      .request()
      .input("id", sql.Int, employeeId)
      .input("status", sql.NVarChar, "active")
      .query("UPDATE Employees SET status = @status WHERE id = @id");

    console.log(`Employee ${employeeId} unarchived by ${unarchivedBy}`);

    return NextResponse.json({
      success: true,
      message: "Employee unarchived successfully",
    });
  } catch (error: any) {
    console.error("Error unarchiving employee:", error);
    return NextResponse.json(
      { error: "Failed to unarchive employee" },
      { status: 500 }
    );
  }
}
