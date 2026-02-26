import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import * as nodemailer from "nodemailer";

// Configure Exchange Online transporter (same as your 2FA setup)
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

// Function to send role approval notification
async function sendRoleApprovalNotification(
  userName: string,
  userEmail: string,
  requestedRole: string
) {
  try {
    const adminEmail = "jfraser@nsnrevenue.com";

    const mailOptions = {
      from: `NSN IT Portal <${process.env.SMTP_FROM}>`,
      to: adminEmail,
      subject: `Role Approval Request - ${userName} (${userEmail})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">NSN IT Management Portal - Role Approval</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello <strong>Joe</strong>,</p>
            <p style="font-size: 16px; color: #374151;">A new user has requested elevated role access:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">User Name:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Requested Role:</td>
                  <td style="padding: 8px 0; color: #6b7280;">
                    <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                      ${requestedRole}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Assigned Role:</td>
                  <td style="padding: 8px 0; color: #6b7280;">
                    <span style="background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                      User (Default)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #374151;">Request Date:</td>
                  <td style="padding: 8px 0; color: #6b7280;">${new Date().toLocaleDateString()}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 16px; color: #374151;">
              The user has been assigned the default <strong>User</strong> role. Please review this request in the admin panel and upgrade their role if appropriate.
            </p>
            
            <div style="margin-top: 25px; padding: 15px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #d97706;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Note:</strong> User will remain with basic "User" access until role is approved in the admin panel.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated notification from the NSN IT Management Portal.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Role Approval Request - ${userName} (${userEmail})

A new user has requested elevated role access:

User Name: ${userName}
Email: ${userEmail}
Requested Role: ${requestedRole}
Assigned Role: User (Default)
Request Date: ${new Date().toLocaleDateString()}

The user has been assigned the default User role. Please review this request in the admin panel and upgrade their role if appropriate.

Note: User will remain with basic "User" access until role is approved.
      `,
    };

    console.log("📤 Sending role approval notification to:", adminEmail);

    await transporter.verify();
    const emailResult = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Role approval notification sent! Message ID:",
      emailResult.messageId
    );

    return true;
  } catch (emailError: any) {
    console.error("❌ Failed to send role approval notification:", emailError);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = "User" } = await request.json();

    console.log("Signup request:", {
      name,
      email,
      requestedRole: role,
      password: password ? "***" : "missing",
    });

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Check if user already exists
    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Always assign "User" role initially, regardless of request
    const assignedRole = "User";

    // Create user with assigned role (not requested role)
    const userResult = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, assignedRole).query(`
        INSERT INTO Users (name, email, password, role) 
        OUTPUT INSERTED.id
        VALUES (@name, @email, @password, @role)
      `);

    const newUserId = userResult.recordset[0].id;
    console.log(
      "User created with ID:",
      newUserId,
      "Assigned role:",
      assignedRole
    );

    // Store pending approval if user requested a higher role
    if (role !== "User") {
      try {
        await pool
          .request()
          .input("userId", sql.Int, newUserId)
          .input("requestedRole", sql.NVarChar, role).query(`
            INSERT INTO PendingApprovals (userId, requestedRole, status, createdAt) 
            VALUES (@userId, @requestedRole, 'pending', GETDATE())
          `);
        console.log("Pending approval stored for requested role:", role);

        // Send email notification to admin for role approval
        await sendRoleApprovalNotification(name, email, role);
      } catch (approvalError) {
        console.warn("Could not store pending approval:", approvalError);
        // Continue even if approval storage fails
      }
    }

    // Initialize user inventory
    try {
      await pool
        .request()
        .input("userId", sql.Int, newUserId)
        .query(
          "INSERT INTO ITStaffInventory (userId, availableLaptops) VALUES (@userId, 0)"
        );
      console.log("Inventory record created");
    } catch (inventoryError) {
      console.warn("Could not create inventory record:", inventoryError);
      // Continue even if inventory creation fails
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    console.log("Session cookie set, returning success");

    return NextResponse.json({
      success: true,
      message:
        "Account created successfully. Role upgrade requests require admin approval.",
    });
  } catch (error: any) {
    console.error("Signup error:", error);

    // More specific error messages
    if (
      error.message?.includes("Users") ||
      error.message?.includes("ITStaffInventory") ||
      error.message?.includes("PendingApprovals")
    ) {
      return NextResponse.json(
        {
          error: "Database configuration error. Please check if tables exist.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create account: " + error.message,
      },
      { status: 500 }
    );
  }
}
