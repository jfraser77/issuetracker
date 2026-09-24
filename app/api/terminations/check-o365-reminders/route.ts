// app/api/terminations/check-o365-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, sql } from "@/lib/db";
import { sendEmail, getO365LicenseReminderEmail } from "@/lib/email";
import { IT_EMAILS } from "@/lib/terminationConstants";

export async function POST(_request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    // Find all terminations that hit the 30-day mark and have not yet been reminded.
    // Non-archived records only — archived ones have had their checklist completed.
    const result = await pool.request().query(`
      SELECT id, employeeName, employeeEmail, terminationDate
      FROM   Terminations
      WHERE  DATEDIFF(day, terminationDate, GETDATE()) >= 30
        AND  o365ReminderSentAt IS NULL
        AND  status != 'archived'
    `);

    const dueTerminations = result.recordset;

    if (dueTerminations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No terminations due for O365 reminder",
        reminded: 0,
      });
    }

    console.log(
      `📧 ${dueTerminations.length} termination(s) due for O365 license reminder`
    );

    try {
      await sendEmail({
        to: IT_EMAILS,
        subject: `Action Required: Remove O365 Licenses – ${dueTerminations.length} Terminated Employee${dueTerminations.length > 1 ? "s" : ""}`,
        html: getO365LicenseReminderEmail(dueTerminations),
      });
      console.log("✅ O365 license reminder email sent");
    } catch (emailError) {
      console.error("❌ Failed to send O365 license reminder email:", emailError);
      throw emailError;
    }

    // Stamp each row so we never re-send.
    for (const termination of dueTerminations) {
      await pool
        .request()
        .input("id", sql.Int, termination.id)
        .query(
          "UPDATE Terminations SET o365ReminderSentAt = GETDATE() WHERE id = @id"
        );
    }

    return NextResponse.json({
      success: true,
      message: `Sent O365 license reminder for ${dueTerminations.length} termination(s)`,
      reminded: dueTerminations.length,
    });
  } catch (error: any) {
    console.error("❌ Error in check-o365-reminders:", error);
    return NextResponse.json(
      { error: "Failed to check O365 license reminders" },
      { status: 500 }
    );
  }
}
