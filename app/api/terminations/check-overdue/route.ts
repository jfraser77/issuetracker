// app/api/terminations/check-overdue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    // Get all pending terminations
    const result = await pool.request().query(`
        SELECT * FROM Terminations 
        WHERE status IN ('pending', 'overdue')
      `);

    const terminations = result.recordset;
    const now = new Date();
    const hrEmails = [
      "aogden@nsnrevenue.com",
      "aevans@nsnrevenue.com",
      "anwaters@uspi.com",
    ];
    // CC recipients for employee emails
    const ccRecipients = [
      "aogden@nsnrevenue.com",
      "aevans@nsnrevenue.com",
      "anwaters@uspi.com",
    ];

    console.log(
      `🔍 Checking ${terminations.length} terminations for overdue status`
    );

    for (const termination of terminations) {
      const terminationDate = new Date(termination.terminationDate);
      const daysSinceTermination = Math.floor(
        (now.getTime() - terminationDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(
        `📅 Termination ${termination.id}: ${daysSinceTermination} days since termination`
      );

      // Check if 30 days have passed and equipment not returned
      if (daysSinceTermination >= 30 && termination.status === "pending") {
        console.log(`🚨 Marking termination ${termination.id} as overdue`);

        // Mark as overdue
        await pool
          .request()
          .input("id", sql.Int, termination.id)
          .input("status", sql.NVarChar, "overdue")
          .input("isOverdue", sql.Bit, true)
          .input("daysRemaining", sql.Int, 0).query(`
            UPDATE Terminations 
            SET status = @status, isOverdue = @isOverdue, daysRemaining = @daysRemaining
            WHERE id = @id
          `);

        try {
          // Send reminder email to terminated employee WITH CC to HR team
          console.log(
            `📧 Sending reminder to ${termination.employeeEmail} with CC to HR`
          );
          await sendEmail({
            to: termination.employeeEmail,
            cc: ccRecipients, // CC Amy, Amanda, and Andrew
            subject: "Reminder: Return Company Equipment",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
                  <h1 style="margin: 0; font-size: 24px;">NSN Equipment Return Reminder</h1>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #374151;">Hello <strong>${
                    termination.employeeName
                  }</strong>,</p>
                  <p style="font-size: 16px; color: #374151;">
                    This is a reminder that it has been 30 days since your termination date of 
                    <strong>${new Date(
                      termination.terminationDate
                    ).toLocaleDateString()}</strong>.
                  </p>
                  
                  <div style="background-color: #fef2f2; padding: 20px; margin: 25px 0; border: 2px solid #fecaca; border-radius: 8px;">
                    <p style="font-size: 16px; color: #dc2626; font-weight: bold; text-align: center;">
                      ⚠️ Please return all company equipment immediately
                    </p>
                  </div>
                  
                  <p style="font-size: 16px; color: #374151;">
                    If you have already returned the equipment, please contact HR to update your records.
                    If you have any questions about the return process, please reach out to the HR department.
                  </p>
                  
                  <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 4px;">
                    <p style="font-size: 14px; color: #374151; margin: 0;">
                      <strong>HR Contact:</strong><br>
                      HR@nsnrevenue.com
                    </p>
                  </div>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #9ca3af;">
                      NSN Revenue Resources HR Department<br>
                      This is an automated message - please do not reply to this email
                    </p>
                  </div>
                </div>
              </div>
            `,
          });
          console.log(
            `✅ Reminder sent to ${termination.employeeEmail} with CC to HR team`
          );
        } catch (emailError) {
          console.error(
            `❌ Failed to send reminder to ${termination.employeeEmail}:`,
            emailError
          );
        }

        try {
          // Send separate notification to HR team (as primary recipients)
          console.log(`📧 Notifying HR team about ${termination.employeeName}`);
          await sendEmail({
            to: hrEmails,
            subject: `URGENT: Equipment Not Returned - ${termination.employeeName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
                  <h1 style="margin: 0; font-size: 24px;">Equipment Return Alert</h1>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #374151;">Dear HR Team,</p>
                  
                  <div style="background-color: #fef2f2; padding: 20px; margin: 25px 0; border: 2px solid #fecaca; border-radius: 8px;">
                    <p style="font-size: 18px; color: #dc2626; font-weight: bold; text-align: center;">
                      🚨 EQUIPMENT NOT RETURNED AFTER 30 DAYS
                    </p>
                  </div>
                  
                  <p style="font-size: 16px; color: #374151;">
                    The following terminated employee has not returned company equipment after 30 days.
                    A reminder email has been sent to the employee with this team CC'd.
                  </p>
                  
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Employee Name:</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${
                        termination.employeeName
                      }</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Email:</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${
                        termination.employeeEmail
                      }</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Termination Date:</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(
                        termination.terminationDate
                      ).toLocaleDateString()}</td>
                    </tr>
                 git pull
                 
                  </table>
                  
                  <p style="font-size: 16px; color: #374151;">
                    <strong>Action Required:</strong> Please follow up with the employee regarding equipment return.
                    This termination has been automatically marked as <span style="color: #dc2626; font-weight: bold;">OVERDUE</span> in the system.
                  </p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #9ca3af;">
                      NSN Revenue Resources IT Department - Automated Notification<br>
                      This alert was generated by the Employee Management System
                    </p>
                  </div>
                </div>
              </div>
            `,
          });
          console.log(
            `✅ HR notification sent for ${termination.employeeName}`
          );
        } catch (hrEmailError) {
          console.error(`❌ Failed to send HR notification:`, hrEmailError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${terminations.length} terminations for overdue status`,
      checked: terminations.length,
    });
  } catch (error: any) {
    console.error("❌ Error in check-overdue:", error);
    return NextResponse.json(
      {
        error: "Failed to check overdue terminations",
      },
      { status: 500 }
    );
  }
}
