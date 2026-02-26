import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import sql from "mssql";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const terminationId = parseInt(id);
    const { trackingNumber, equipmentDisposition, completedByUserId } = await request.json();
    
    console.log(`🔄 Marking equipment returned for termination ${terminationId}`, {
      trackingNumber,
      equipmentDisposition,
      completedByUserId
    });

    // Validate input
    if (isNaN(terminationId)) {
      return NextResponse.json(
        { error: "Invalid termination ID" },
        { status: 400 }
      );
    }

    if (!equipmentDisposition) {
      return NextResponse.json(
        { error: "Equipment disposition is required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Update termination status using OUTPUT to return the updated record
    const result = await pool.request()
      .input('id', sql.Int, terminationId)
      .input('status', sql.NVarChar, 'equipment_returned')
      .input('trackingNumber', sql.NVarChar, trackingNumber || null)
      .input('equipmentDisposition', sql.NVarChar, equipmentDisposition)
      .input('completedByUserId', sql.Int, completedByUserId || null)
      .query(`
        UPDATE Terminations 
        SET status = @status, 
            trackingNumber = @trackingNumber,
            equipmentDisposition = @equipmentDisposition,
            completedByUserId = @completedByUserId,
            timestamp = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    const updatedTermination = result.recordset[0];
    
    console.log(`✅ Equipment marked returned for termination ${terminationId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Equipment return recorded successfully",
      termination: updatedTermination
    });
    
  } catch (error: any) {
    console.error(`❌ Error marking equipment returned:`, error);
    return NextResponse.json(
      { 
        error: "Failed to mark equipment returned",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}