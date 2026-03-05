export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
import sql from "mssql";
import { sendEmail } from "../../../../../lib/email";

const hrEmails = [
  "aogden@uspi.com",
  "aevans@nsnrevenue.com",
  "anwaters@uspi.com",
  "eolson@nsnrevenue.com",
];

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

    // Send completion email to HR team
    const terminationDateStr = new Date(updatedTermination.terminationDate).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // Pre-compute disposition label to avoid nested template literal issues
    const dispositionLabel =
      equipmentDisposition === "malicious_damage" ? "Malicious Damage by Employee" :
      equipmentDisposition === "return_to_pool" ? "Return to Available Pool" :
      equipmentDisposition === "retire" ? "Retire Equipment" :
      equipmentDisposition;

    const dispositionCell = equipmentDisposition === "malicious_damage"
      ? '<strong style="color: #dc2626; font-size: 15px;">⚠ Malicious Damage by Employee</strong>'
      : dispositionLabel;

    sendEmail({
      to: hrEmails,
      subject: `Equipment Return Satisfied: ${updatedTermination.employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #15803d, #166534); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Equipment Return Satisfied</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Dear HR Team,</p>
            <p style="font-size: 16px; color: #374151;">
              The equipment return has been confirmed and the termination record has been completed for the following employee.
            </p>

            <div style="background-color: #f0fdf4; padding: 20px; margin: 25px 0; border: 2px solid #bbf7d0; border-radius: 8px;">
              <p style="font-size: 16px; color: #15803d; font-weight: bold; text-align: center; margin: 0;">
                ✅ Equipment Return Successfully Recorded
              </p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; width: 40%;">Employee Name:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${updatedTermination.employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Employee Email:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${updatedTermination.employeeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Termination Date:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${terminationDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Equipment Disposition:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${dispositionCell}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Tracking Number:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${trackingNumber || "Not provided"}</td>
              </tr>
            </table>

            <p style="font-size: 16px; color: #374151;">
              No further action is required for this termination. The record has been updated to <strong>Equipment Returned</strong> status in the system.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                NSN Revenue Resources IT Department – Automated Notification<br>
                This alert was generated by the Employee Management System
              </p>
            </div>
          </div>
        </div>
      `,
    }).catch((err) => console.error("❌ Failed to send equipment return completion email:", err));

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