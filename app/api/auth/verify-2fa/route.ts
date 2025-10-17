import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const pool = await connectToDatabase();
    
    // Verify code
    const result = await pool.request()
      .input('email', email)
      .input('code', code)
      .query(`
        SELECT tfa.*, u.id as userId, u.name, u.role
        FROM TwoFactorAuth tfa
        INNER JOIN Users u ON tfa.userId = u.id
        WHERE tfa.email = @email 
          AND tfa.code = @code 
          AND tfa.used = 0 
          AND tfa.expiresAt > GETDATE()
      `);
    
    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const twoFactorRecord = result.recordset[0];
    
    // Mark code as used
    await pool.request()
      .input('id', twoFactorRecord.id)
      .query('UPDATE TwoFactorAuth SET used = 1 WHERE id = @id');

    // Return user data (you'd typically create a session here)
    return NextResponse.json({
      success: true,
      user: {
        id: twoFactorRecord.userId,
        name: twoFactorRecord.name,
        email: twoFactorRecord.email,
        role: twoFactorRecord.role
      }
    });
    
  } catch (error) {
    console.error("Error verifying 2FA code:", error);
    return NextResponse.json({ error: "Failed to verify 2FA code" }, { status: 500 });
  }
}