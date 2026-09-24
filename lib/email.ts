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

// ---------------------------------------------------------------------------
// O365 License Removal Reminder (30-day post-termination)
// Consumed by POST /api/terminations/check-o365-reminders.
// ---------------------------------------------------------------------------

export function getO365LicenseReminderEmail(
  employees: Array<{ employeeName: string; employeeEmail: string; terminationDate: string }>
): string {
  const rows = employees
    .map(
      (e) => `
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;">${e.employeeName}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${e.employeeEmail}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${new Date(e.terminationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
      </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>O365 License Removal Reminder</title></head>
    <body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;">
      <div style="max-width:650px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:24px;border-radius:10px 10px 0 0;color:white;">
          <h1 style="margin:0;font-size:22px;">Office 365 License Removal Reminder</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">30-Day Post-Termination Notice</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
          <p style="color:#374151;">The following employee(s) reached their 30-day post-termination mark. Per IT policy, their Office 365 licenses should now be removed from the Microsoft 365 Admin Center.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;color:#374151;">Employee Name</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;color:#374151;">Work Email</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;color:#374151;">Termination Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="background:#fef2f2;padding:16px;border:1px solid #fecaca;border-radius:8px;margin:20px 0;">
            <p style="margin:0;color:#991b1b;font-weight:bold;font-size:14px;">Action Required</p>
            <p style="margin:8px 0 0;color:#374151;font-size:14px;">
              Remove the Office 365 licenses for the above employee(s) immediately:<br>
              <strong>Microsoft 365 Admin Center → Active Users → [employee] → Licenses and Apps → Unassign license</strong>
            </p>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            NSN Revenue Resources IT Department – Automated Reminder<br>
            This alert was generated by the Employee Management System
          </p>
        </div>
      </div>
    </body>
    </html>`;
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