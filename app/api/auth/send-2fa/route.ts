import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pool = await connectToDatabase();
    
    // Check if user exists
    const userResult = await pool.request()
      .input('email', email)
      .query('SELECT id FROM Users WHERE email = @email');
    
    if (userResult.recordset.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult.recordset[0].id;
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store code in database
    await pool.request()
      .input('userId', userId)
      .input('email', email)
      .input('code', code)
      .input('expiresAt', expiresAt)
      .query(`
        INSERT INTO TwoFactorAuth (userId, email, code, expiresAt)
        VALUES (@userId, @email, @code, @expiresAt)
      `);

    // TODO: In production, integrate with your email service (SendGrid, AWS SES, etc.)
    console.log(`2FA Code for ${email}: ${code}`);
    
    // For demo purposes, we'll just return the code
    // In production, remove this and actually send the email
    return NextResponse.json({ 
      message: "2FA code sent successfully",
      demoCode: code // Remove this in production
    });
    
  } catch (error) {
    console.error("Error sending 2FA code:", error);
    return NextResponse.json({ error: "Failed to send 2FA code" }, { status: 500 });
  }
}