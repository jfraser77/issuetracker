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
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
} as nodemailer.TransportOptions);

export async function sendEmail(emailData: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    console.log("📧 Attempting to send email to:", emailData.to);
    if (emailData.cc) {
      console.log("📧 CC recipients:", emailData.cc);
    }

    const mailOptions = {
      from: `NSN IT Portal <${process.env.SMTP_FROM}>`,
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, ""),
    };

    console.log("📤 Attempting to send email from:", process.env.SMTP_FROM);

    // Verify connection first
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const emailResult = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Email sent successfully! Message ID:",
      emailResult.messageId
    );
    console.log("✅ Email accepted by:", emailResult.accepted);
    if (emailResult.accepted && emailResult.accepted.length > 0) {
      console.log("✅ CC recipients accepted:", emailResult.accepted);
    }

    return emailResult;
  } catch (emailError: any) {
    console.error("❌ Email sending failed:", emailError);
    console.error("Email error code:", emailError.code);
    console.error("Email error response:", emailError.response);
    throw emailError;
  }
}

export async function sendPasswordResetEmail(userEmail: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
  
  const emailHtml = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return await sendEmail({
    to: userEmail,
    subject: "Password Reset Request",
    html: emailHtml
  });
}

// Add this to your existing email.ts file:

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
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from NSN IT Management Portal. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
}


export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  return await sendEmail({
    to: email,
    subject: "Reset Your Password - NSN IT Management Portal",
    html: getPasswordResetEmail(resetUrl)
  });
}