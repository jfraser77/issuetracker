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

// Core email sending function
export async function sendEmail(emailData: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    console.log("📧 Attempting to send email to:", emailData.to);
    
    const mailOptions = {
      from: `NSN IT Portal <${process.env.SMTP_FROM}>`,
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, ""),
    };

    // Verify connection first
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const emailResult = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully! Message ID:", emailResult.messageId);
    return emailResult;
    
  } catch (emailError: any) {
    console.error("❌ Email sending failed:", emailError);
    console.error("Email error code:", emailError.code);
    console.error("Email error response:", emailError.response);
    throw emailError;
  }
}

// Generate password reset email HTML
export function getPasswordResetEmail(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">NSN IT Management Portal</h2>
        <p>You requested to reset your password.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from NSN IT Management Portal.</p>
      </div>
    </body>
    </html>
  `;
}

// SINGLE password reset function - uses resetUrl (not token)
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  console.log("📧 Sending password reset email to:", email);
  console.log("🔗 Reset URL:", resetUrl);
  
  return await sendEmail({
    to: email,
    subject: "Reset Your Password - NSN IT Management Portal",
    html: getPasswordResetEmail(resetUrl)
  });
}