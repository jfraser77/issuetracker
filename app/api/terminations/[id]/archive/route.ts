import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const terminationId = parseInt(id);
    const pool = await connectToDatabase();

    // Get termination data before archiving
    const terminationResult = await pool
      .request()
      .input("id", sql.Int, terminationId)
      .query("SELECT * FROM Terminations WHERE id = @id");

    if (terminationResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination record not found" },
        { status: 404 }
      );
    }

    const termination = terminationResult.recordset[0];

    // Update termination status to archived
    await pool
      .request()
      .input("id", sql.Int, terminationId)
      .input("status", sql.NVarChar, "archived").query(`
        UPDATE Terminations 
        SET status = @status 
        WHERE id = @id
      `);

    console.log(
      `Termination ${terminationId} archived for employee: ${termination.employeeName}`
    );

    return NextResponse.json({
      success: true,
      message: "Termination archived successfully",
      employeeName: termination.employeeName,
    });
  } catch (error: any) {
    console.error("Error archiving termination:", error);
    return NextResponse.json(
      {
        error: "Failed to archive termination",
      },
      { status: 500 }
    );
  }
}
