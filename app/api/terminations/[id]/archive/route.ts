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
<<<<<<< HEAD
    const pool = await connectToDatabase();

    // Get termination data before archiving
    const terminationResult = await pool
      .request()
      .input("id", sql.Int, terminationId)
      .query("SELECT * FROM Terminations WHERE id = @id");

    if (terminationResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination record not found" },
=======

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
>>>>>>> befc8065b152f16cf2d065f02228016cb0e9965e
        { status: 404 }
      );
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> befc8065b152f16cf2d065f02228016cb0e9965e
