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
