export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email"; 

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pool = await connectToDatabase();

    // Find user
    const result = await pool
      .request()
      .input("email", email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      // Don't reveal if user exists
      return NextResponse.json({
        message:
          "If an account exists with this email, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await pool
      .request()
      .input("email", email)
      .input("resetToken", resetToken)
      .input("resetTokenExpiry", resetTokenExpiry).query(`
        UPDATE Users 
        SET resetToken = @resetToken, 
            resetTokenExpiry = @resetTokenExpiry,
            updatedAt = GETDATE()
        WHERE email = @email
      `);

    console.log("Reset token generated for:", email);

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    // ✅ SEND ACTUAL EMAIL using the dedicated function
    try {
      const emailResult = await sendPasswordResetEmail(email, resetUrl);
      
      // sendEmail returns the result directly, not a { success } object
      console.log("✅ Password reset email sent to:", email);
      console.log("Message ID:", emailResult.messageId);
      
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
      // Log the URL as fallback
      console.log("🔗 Reset URL (fallback):", resetUrl);
    }

    return NextResponse.json({
      message:
        "If an account exists with this email, a reset link has been sent",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}