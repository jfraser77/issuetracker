import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Check if user exists - FIXED parameter binding
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email) // Add sql.NVarChar type
      .query('SELECT id, name FROM Users WHERE email = @email');

    // Always return success to prevent email enumeration
    if (userResult.recordset.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json(
        { message: "If an account with that email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    const user = userResult.recordset[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in database - FIXED parameter binding
    await pool.request()
      .input('userId', sql.Int, user.id) // Add sql.Int type
      .input('resetToken', sql.NVarChar, resetToken) // Add sql.NVarChar type
      .input('resetTokenExpiry', sql.DateTime, resetTokenExpiry) // Add sql.DateTime type
      .query(`
        UPDATE Users 
        SET resetToken = @resetToken, resetTokenExpiry = @resetTokenExpiry 
        WHERE id = @userId
      `);

    // Create reset link
    const baseUrl = process.env.NEXTAUTH_URL || 'https://cbo-inventory.azurewebsites.net';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    // Log the reset link
    console.log(`Password reset link for ${email}: ${resetLink}`);

    return NextResponse.json(
      { 
        message: "If an account with that email exists, a reset link has been sent.",
        demoResetLink: resetLink // Remove this in production
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}