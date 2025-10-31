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

    // Verify the termination exists and get current status + checklist completion
    const existingResult = await pool
      .request()
      .input("terminationId", sql.Int, terminationId)
      .query(`
        SELECT 
          status, 
          employeeName,
          checklist,
          equipmentDisposition,
          trackingNumber,
          completedByUserId
        FROM Terminations 
        WHERE id = @terminationId
      `);

    if (existingResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    const termination = existingResult.recordset[0];
    const currentStatus = termination.status;
    const employeeName = termination.employeeName;

    // Parse checklist to check completion
    let checklistCompletion = 0;
    try {
      if (termination.checklist) {
        const checklist = JSON.parse(termination.checklist);
        const completedItems = checklist.filter((item: any) => item.completed).length;
        const totalItems = checklist.length;
        checklistCompletion = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      }
    } catch (error) {
      console.error("Error parsing checklist:", error);
    }

    // Enhanced validation for archiving
    const validationErrors = [];
    
    if (currentStatus !== 'equipment_returned') {
      validationErrors.push("Equipment must be marked as returned before archiving");
    }
    
    if (!termination.trackingNumber) {
      validationErrors.push("Tracking number is required");
    }
    
    if (!termination.completedByUserId) {
      validationErrors.push("IT staff must be assigned");
    }
    
    if (checklistCompletion < 100) {
      validationErrors.push("IT checklist must be 100% completed");
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot archive termination",
          details: validationErrors,
          checklistCompletion: Math.round(checklistCompletion)
        },
        { status: 400 }
      );
    }

    // Archive the termination
    const result = await pool
      .request()
      .input("terminationId", sql.Int, terminationId).query(`
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

    console.log(
      `✅ Successfully archived termination ${terminationId} for ${employeeName}`
    );

    return NextResponse.json({
      success: true,
      message: `Termination for ${employeeName} archived successfully`,
      termination: archivedTermination,
    });
  } catch (error: any) {
    console.error("❌ Error archiving termination:", error);
    return NextResponse.json(
      { error: "Failed to archive termination", details: error.message },
      { status: 500 }
    );
  }
}