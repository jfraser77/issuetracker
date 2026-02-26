import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";

// Known hash for "TempPass123!"
const TEMP_HASH =
  "$2a$12$X7VX5C8q9TqBwRkLpQwR3uKzJ8hNvM2QwP7rS9tUyVzA1bC3dE5fG7hJ9l";
const TEMP_PASSWORD = "TempPass123!";

export async function POST(request: NextRequest) {
  console.log("🚀 SIGNIN API CALLED");

  try {
    const { email, password } = await request.json();

    console.log("📧 Email:", email);
    console.log("🔐 Password provided:", password ? "***" : "missing");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const pool = await connectToDatabase();
    const cleanEmail = email.trim().toLowerCase();

    // Find user with ALL columns to debug
    const result = await pool.request().input("email", sql.NVarChar, cleanEmail)
      .query(`
        SELECT id, email, name, password, role, createdAt, updatedAt
        FROM Users WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      console.log("❌ No user found for email:", cleanEmail);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = result.recordset[0];

    console.log("👤 User found:", {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      passwordLength: user.password?.length,
      passwordPreview: user.password?.substring(0, 50) + "...",
    });

    if (!user.password) {
      console.error("❌ User has no password field");
      return NextResponse.json(
        { error: "Account configuration error" },
        { status: 500 },
      );
    }

    let isValid = false;
    let authMethod = "";

    // METHOD 1: Check for temporary password (for users with placeholder hashes)
    if (user.password === TEMP_HASH) {
      console.log("🔑 Checking temporary password...");
      if (password === TEMP_PASSWORD) {
        isValid = true;
        authMethod = "temp_password";
        console.log("✅ Temporary password accepted");
      } else {
        console.log("❌ Temporary password mismatch");
      }
    }
    // METHOD 2: Normal bcrypt verification
    else {
      console.log("🔐 Attempting bcrypt verification...");
      console.log(
        "Stored hash type:",
        user.password.startsWith("$2a$") ? "bcrypt" : "unknown",
      );
      console.log("Hash preview:", user.password.substring(0, 30) + "...");

      try {
        // bcrypt.compare handles both $2a$ and $2b$ formats
        isValid = await bcrypt.compare(password, user.password);
        authMethod = "bcrypt";
        console.log("✅ Bcrypt verification result:", isValid);
      } catch (bcryptError) {
        console.error("❌ Bcrypt comparison error:", bcryptError);
        isValid = false;
      }
    }

    // METHOD 3: Direct comparison (fallback for debugging)
    if (!isValid && process.env.NODE_ENV === "development") {
      console.log("🔄 Trying direct comparison for debugging...");
      if (user.password === password) {
        isValid = true;
        authMethod = "direct_match";
        console.log("⚠️ WARNING: Password stored in plain text!");
      }
    }

    if (!isValid) {
      console.log("❌ All authentication methods failed");
      console.log("Auth methods tried:", authMethod || "none");

      // For debugging: Show what we're comparing
      if (process.env.NODE_ENV === "development") {
        console.log("User's stored password:", user.password);
        console.log("Provided password:", password);
      }

      return NextResponse.json(
        {
          error: "Invalid email or password",
          hint: authMethod ? `Tried: ${authMethod}` : undefined,
        },
        { status: 401 },
      );
    }

    console.log(`✅✅✅ SIGNIN SUCCESSFUL (${authMethod})`);

    // Update last login time
    try {
      await pool.request().input("id", sql.Int, user.id).query(`
          UPDATE Users 
          SET lastLogin = GETDATE(), 
              updatedAt = GETDATE()
          WHERE id = @id
        `);
      console.log("📝 Updated last login time");
    } catch (updateError) {
      console.warn("⚠️ Could not update last login:", updateError);
      // Continue even if this fails
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      message: "Signin successful",
      method: authMethod,
    });

    // Set the authentication cookie
    response.cookies.set({
      name: "auth-user",
      value: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timestamp: Date.now(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "strict",
    });

    console.log("✅ Cookie 'auth-user' set successfully");
    return response;
  } catch (error: any) {
    console.error("❌ SIGNIN ERROR:", error.message);
    console.error("Stack:", error.stack);

    return NextResponse.json(
      {
        error: "Failed to sign in",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

// Keep the GET method for debugging
export async function GET() {
  return NextResponse.json({
    status: "Signin endpoint active",
    timestamp: new Date().toISOString(),
    note: "Use POST with {email, password}",
    methods: [
      "Temporary password: TempPass123!",
      "Bcrypt verification for regular users",
      "Direct comparison (development only)",
    ],
  });
}
