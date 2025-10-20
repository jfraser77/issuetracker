import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import sql from "mssql";

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
    // Parse checklist JSON
    const responseTermination = {
      ...termination,
      checklist: termination.checklist ? JSON.parse(termination.checklist) : []
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
    const updates = await request.json();
    const pool = await connectToDatabase();

    // Build dynamic update query
    const updateFields = [];
    const requestObj = pool.request();

    // Add all possible fields
    const fieldMappings = {
      employeeName: 'employeeName',
      employeeEmail: 'employeeEmail', 
      jobTitle: 'jobTitle',
      department: 'department',
      terminationDate: 'terminationDate',
      terminationReason: 'terminationReason',
      status: 'status',
      trackingNumber: 'trackingNumber',
      equipmentDisposition: 'equipmentDisposition',
      completedByUserId: 'completedByUserId'
    };

    Object.entries(fieldMappings).forEach(([key, dbField]) => {
      if (updates[key] !== undefined) {
        updateFields.push(`${dbField} = @${key}`);
        requestObj.input(key, updates[key]);
      }
    });

    // Handle checklist separately since it needs JSON stringification
    if (updates.checklist !== undefined) {
      updateFields.push("checklist = @checklist");
      requestObj.input("checklist", sql.NVarChar, JSON.stringify(updates.checklist));
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    requestObj.input("id", sql.Int, parseInt(id));

    const query = `
      UPDATE Terminations 
      SET ${updateFields.join(", ")}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await requestObj.query(query);
    
    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Termination not found" },
        { status: 404 }
      );
    }

    const updatedTermination = result.recordset[0];
    // Parse checklist back to JSON
    const responseTermination = {
      ...updatedTermination,
      checklist: updatedTermination.checklist ? JSON.parse(updatedTermination.checklist) : []
    };

    return NextResponse.json({ 
      success: true, 
      message: "Termination updated successfully",
      termination: responseTermination
    });
  } catch (error: any) {
    console.error("Error updating termination:", error);
    return NextResponse.json(
      { error: "Failed to update termination: " + error.message },
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