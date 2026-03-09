export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import sql from "mssql";
import { DEFAULT_CHECKLIST } from "../../../../lib/terminationConstants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query("SELECT * FROM Terminations WHERE id = @id");

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    const termination = result.recordset[0];
    
    // Parse checklist JSON if it exists, otherwise use default
    let checklist = DEFAULT_CHECKLIST;
    try {
      if (termination.checklist) {
        const parsedChecklist = JSON.parse(termination.checklist);
        if (Array.isArray(parsedChecklist) && parsedChecklist.length > 0) {
          checklist = parsedChecklist;
        }
      }
    } catch (error) {
      console.error("Error parsing checklist:", error);
    }

    const responseTermination = {
      ...termination,
      checklist
    };

    return NextResponse.json(responseTermination);
  } catch (error) {
    console.error("Error fetching termination:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const terminationId = parseInt(id);
    const updates = await request.json();
    
    console.log(`🔄 Updating termination ${terminationId}:`, updates);

    if (isNaN(terminationId)) {
      return NextResponse.json(
        { error: "Invalid termination ID" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Build dynamic update query
    const updateFields = [];
    const requestObj = pool.request();

    // Add all possible fields with proper SQL types
    const fieldMappings = {
      employeeName: { field: 'employeeName', type: sql.NVarChar },
      employeeEmail: { field: 'employeeEmail', type: sql.NVarChar },
      jobTitle: { field: 'jobTitle', type: sql.NVarChar },
      department: { field: 'department', type: sql.NVarChar },
      terminationDate: { field: 'terminationDate', type: sql.Date },
      terminationReason: { field: 'terminationReason', type: sql.NVarChar },
      status: { field: 'status', type: sql.NVarChar },
      trackingNumber: { field: 'trackingNumber', type: sql.NVarChar },
      equipmentDisposition: { field: 'equipmentDisposition', type: sql.NVarChar },
      completedByUserId: { field: 'completedByUserId', type: sql.Int },
      computerSerial: { field: 'computerSerial', type: sql.NVarChar },
      computerModel: { field: 'computerModel', type: sql.NVarChar }
    };

    Object.entries(fieldMappings).forEach(([key, config]) => {
      if (updates[key] !== undefined) {
        updateFields.push(`${config.field} = @${key}`);
        // Handle null/undefined values properly
        if (updates[key] === null || updates[key] === undefined || updates[key] === '') {
          requestObj.input(key, config.type, null);
        } else {
          requestObj.input(key, config.type, updates[key]);
        }
      }
    });

    // Handle checklist separately since it needs JSON stringification
    if (updates.checklist !== undefined) {
      updateFields.push("checklist = @checklist");
      requestObj.input("checklist", sql.NVarChar, 
        updates.checklist && updates.checklist.length > 0 
          ? JSON.stringify(updates.checklist) 
          : JSON.stringify(DEFAULT_CHECKLIST)
      );
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Always update timestamp
    updateFields.push("timestamp = GETDATE()");

    requestObj.input("id", sql.Int, terminationId);

    const query = `
      UPDATE Terminations 
      SET ${updateFields.join(", ")}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    console.log(`📝 Executing update query for termination ${terminationId}`);

    const result = await requestObj.query(query);
    
    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    const updatedTermination = result.recordset[0];
    
    // Parse checklist back to JSON for response
    let checklist = DEFAULT_CHECKLIST;
    try {
      if (updatedTermination.checklist) {
        const parsedChecklist = JSON.parse(updatedTermination.checklist);
        if (Array.isArray(parsedChecklist) && parsedChecklist.length > 0) {
          checklist = parsedChecklist;
        }
      }
    } catch (error) {
      console.error("Error parsing checklist:", error);
    }

    const responseTermination = {
      ...updatedTermination,
      checklist
    };

    console.log(`✅ Termination ${terminationId} updated successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Termination updated successfully",
      termination: responseTermination
    });
    
  } catch (error: any) {
    console.error("❌ Error updating termination:", error);
    return NextResponse.json(
      { 
        error: "Failed to update termination",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const terminationId = parseInt(id);
    
    if (isNaN(terminationId)) {
      return NextResponse.json(
        { error: "Invalid termination ID" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Check if termination exists
    const checkResult = await pool
      .request()
      .input("id", sql.Int, terminationId)
      .query("SELECT id FROM Terminations WHERE id = @id");

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    // Delete the termination
    await pool
      .request()
      .input("id", sql.Int, terminationId)
      .query("DELETE FROM Terminations WHERE id = @id");

    return NextResponse.json({ 
      success: true, 
      message: "Termination deleted successfully" 
    });

  } catch (error: any) {
    console.error("Error deleting termination:", error);
    return NextResponse.json(
      { error: "Failed to delete termination: " + error.message },
      { status: 500 }
    );
  }
}