import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Find user with valid reset token
    const userResult = await pool.request()
      .input('resetToken', sql.NVarChar, token)
      .query('SELECT id, resetTokenExpiry FROM Users WHERE resetToken = @resetToken AND resetTokenExpiry > GETDATE()');

    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const user = userResult.recordset[0];
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('hashedPassword', sql.NVarChar, hashedPassword)
      .query(`
        UPDATE Users 
        SET password = @hashedPassword, resetToken = NULL, resetTokenExpiry = NULL 
        WHERE id = @userId
      `);

    return NextResponse.json({ 
      message: "Password reset successfully! You can now sign in with your new password." 
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}