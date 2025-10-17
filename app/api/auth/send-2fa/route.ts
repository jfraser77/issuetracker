import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import * as nodemailer from "nodemailer";

// Configure Exchange Online transporter with your dedicated account
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
} as nodemailer.TransportOptions);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    console.log("📧 Send-2FA request for:", email);
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pool = await connectToDatabase();
    
    // Check if user exists
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, name FROM Users WHERE email = @email');
    
    if (userResult.recordset.length === 0) {
      console.log("❌ User not found for 2FA:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult.recordset[0].id;
    const userName = userResult.recordset[0].name;
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log("🔢 Generated 2FA code for", email, ":", code);
    
    // Store code in database
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('email', sql.NVarChar, email)
      .input('code', sql.NVarChar, code)
      .input('expiresAt', sql.DateTime, expiresAt)
      .query(`
        INSERT INTO TwoFactorAuth (userId, email, code, expiresAt, used)
        VALUES (@userId, @email, @code, @expiresAt, 0)
      `);

    // Send email via Exchange Online
    try {
      const mailOptions = {
        from: `NSN IT Portal <${process.env.SMTP_FROM}>`,
        to: email,
        subject: 'Your NSN IT Management Portal Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
              <h1 style="margin: 0; font-size: 24px;">NSN IT Management Portal</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">Hello <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Your verification code for the NSN IT Management Portal is:</p>
              
              <div style="background-color: #f8fafc; padding: 25px; text-align: center; margin: 25px 0; border: 2px dashed #d1d5db; border-radius: 8px;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                This code will expire in <strong>10 minutes</strong>
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af;">
                  If you didn't request this code, please ignore this email or contact the IT department if you have concerns.
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
                  NSN Revenue Resources IT Department<br>
                  This is an automated message - please do not reply to this email
                </p>
              </div>
            </div>
          </div>
        `,
        text: `Your NSN IT Management Portal verification code is: ${code}. This code will expire in 10 minutes. If you didn't request this code, please ignore this email.`
      };

      console.log("📤 Attempting to send email from:", process.env.SMTP_FROM);
      console.log("📤 Sending to:", email);
      
      // Verify connection first
      await transporter.verify();
      console.log("✅ SMTP connection verified");
      
      const emailResult = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully! Message ID:", emailResult.messageId);
      console.log("✅ Email accepted by:", emailResult.accepted);
      
      return NextResponse.json({ 
        message: "Verification code has been sent to your email",
        demoCode: code // Still return for testing
      });
      
    } catch (emailError: any) {
      console.error("❌ Email sending failed:", emailError);
      console.error("Email error code:", emailError.code);
      console.error("Email error response:", emailError.response);
      
      // Still return success with demo code
      return NextResponse.json({ 
        message: "Verification code generated (email may not have been sent)",
        demoCode: code,
        emailError: emailError.message
      });
    }
    
  } catch (error: any) {
    console.error("❌ Error in send-2fa:", error);
    return NextResponse.json({ 
      error: "Failed to process verification request" 
    }, { status: 500 });
  }
}