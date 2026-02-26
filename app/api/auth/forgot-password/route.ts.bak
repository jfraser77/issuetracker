import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import crypto from "crypto";

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

    // TODO: Send email
    console.log("Reset URL (for testing):", resetUrl);
    console.log("IMPORTANT: Configure email sending in production");

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
