export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import * as nodemailer from "nodemailer";

// Configure Exchange Online transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
} as nodemailer.TransportOptions);

// GET - Fetch pending approvals
export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    const result = await pool.request().query(`
      SELECT 
        pa.id as approvalId,
        pa.requestedRole,
        pa.status,
        pa.createdAt,
        u.id as userId,
        u.name,
        u.email,
        u.role as currentRole
      FROM PendingApprovals pa
      INNER JOIN Users u ON pa.userId = u.id
      WHERE pa.status = 'pending'
      ORDER BY pa.createdAt DESC
    `);

    return NextResponse.json({ approvals: result.recordset });
  } catch (error: any) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 },
    );
  }
}

// POST - Update approval status
export async function POST(request: NextRequest) {
  try {
    const { approvalId, action, userId, requestedRole, userEmail, userName } =
      await request.json();

    if (!approvalId || !action || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const pool = await connectToDatabase();

    if (action === "approve") {
      // Update user role
      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("newRole", sql.NVarChar, requestedRole)
        .query("UPDATE Users SET role = @newRole WHERE id = @userId");

      // Update approval status
      await pool
        .request()
        .input("approvalId", sql.Int, approvalId)
        .query(
          "UPDATE PendingApprovals SET status = 'approved', updatedAt = GETDATE() WHERE id = @approvalId",
        );

      // Send approval notification email to user
      await sendApprovalNotification(userEmail, userName, requestedRole, true);

      console.log(`Role approved: User ${userId} upgraded to ${requestedRole}`);
    } else if (action === "reject") {
      // Update approval status to rejected
      await pool
        .request()
        .input("approvalId", sql.Int, approvalId)
        .query(
          "UPDATE PendingApprovals SET status = 'rejected', updatedAt = GETDATE() WHERE id = @approvalId",
        );

      // Send rejection notification email to user
      await sendApprovalNotification(userEmail, userName, requestedRole, false);

      console.log(
        `Role rejected: User ${userId} request for ${requestedRole} rejected`,
      );
    }

    return NextResponse.json({
      success: true,
      message: `Role request ${action}d`,
    });
  } catch (error: any) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      { error: "Failed to update approval" },
      { status: 500 },
    );
  }
}

// Function to send approval/rejection notification
async function sendApprovalNotification(
  userEmail: string,
  userName: string,
  requestedRole: string,
  approved: boolean,
) {
  try {
    const subject = approved
      ? `Role Upgrade Approved - ${requestedRole}`
      : `Role Upgrade Request Declined`;

    const html = approved
      ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Role Upgrade Approved! 🎉</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Great news! Your request for <strong>${requestedRole}</strong> role has been approved.</p>
          
          <div style="background-color: #ecfdf5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46; font-weight: bold;">
              You now have ${requestedRole} level access in the NSN IT Management Portal.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            You can now access all features available to ${requestedRole} users. 
            Please sign out and sign back in to see the updated permissions.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af;">
              NSN IT Department<br>
              This is an automated message - please do not reply to this email
            </p>
          </div>
        </div>
      </div>
    `
      : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Role Request Update</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Your request for <strong>${requestedRole}</strong> role has been reviewed.</p>
          
          <div style="background-color: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">
              Your role upgrade request has been declined at this time.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            You will continue to have User level access. If you believe this was a mistake, 
            please contact the IT department for more information.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af;">
              NSN IT Department<br>
              This is an automated message - please do not reply to this email
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `NSN IT Portal <${process.env.SMTP_FROM}>`,
      to: userEmail,
      subject: subject,
      html: html,
      text: approved
        ? `Your ${requestedRole} role request has been approved. You now have ${requestedRole} level access.`
        : `Your ${requestedRole} role request has been declined. You will maintain User level access.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Approval notification sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending approval notification:", error);
  }
}
