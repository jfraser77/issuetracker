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

    console.log(`🔵 Archiving termination ${terminationId}`);

    const pool = await connectToDatabase();

    // verify the termination exists and get current status
    const existingResult = await pool
      .request()
      .input("terminationId", sql.Int, terminationId)
      .query("SELECT status, employeeName FROM Terminations WHERE id = @terminationId");

    if (existingResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    const currentStatus = existingResult.recordset[0].status;
    const employeeName = existingResult.recordset[0].employeeName;

    // validation to prevent archiving pending terminations
    if (currentStatus === 'pending') {
      return NextResponse.json(
        { error: "Cannot archive termination until equipment has been returned" },
        { status: 400 }
      );
    }

    // Archive the termination
    const result = await pool
      .request()
      .input("terminationId", sql.Int, terminationId)
      .query(`
        UPDATE Terminations 
        SET status = 'archived',
            timestamp = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @terminationId
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "Failed to archive termination" },
        { status: 500 }
      );
    }

    const archivedTermination = result.recordset[0];
    
    console.log(`✅ Successfully archived termination ${terminationId} for ${employeeName}`);

    return NextResponse.json({ 
      success: true,
      message: `Termination for ${employeeName} archived successfully`,
      termination: archivedTermination
    });
  } catch (error: any) {
    console.error("❌ Error archiving termination:", error);
    return NextResponse.json(
      { error: "Failed to archive termination", details: error.message },
      { status: 500 }
    );
  }
}