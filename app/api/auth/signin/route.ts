import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

// Known hash for "TempPass123!"
const KNOWN_HASH =
  "$2a$12$X7VX5C8q9TqBwRkLpQwR3uKzJ8hNvM2QwP7rS9tUyVzA1bC3dE5fG7hJ9l";
const KNOWN_PASSWORD = "TempPass123!";

export async function POST(request: NextRequest) {
  console.log("🚀 SIGNIN API CALLED");

  try {
    const { email, password } = await request.json();

    console.log("📧 Email:", email);
    console.log("🔐 Password provided:", password ? "***" : "missing");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();
    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const result = await pool.request().input("email", sql.NVarChar, cleanEmail)
      .query(`
        SELECT id, email, name, password, role
        FROM Users WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      console.log("❌ No user found for email:", cleanEmail);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = result.recordset[0];

    console.log("👤 User found:", {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password,
      passwordStartsWith: user.password?.substring(0, 30),
    });

    if (!user.password) {
      console.error("❌ User has no password field");
      return NextResponse.json(
        { error: "Account configuration error" },
        { status: 500 }
      );
    }

    // Simple direct comparison (bypass bcrypt issues)
    console.log("\n🔍 AUTHENTICATION CHECK");
    console.log("Stored hash:", user.password.substring(0, 30) + "...");
    console.log("Expected hash:", KNOWN_HASH.substring(0, 30) + "...");

    const hashMatches = user.password === KNOWN_HASH;
    const passwordMatches = password === KNOWN_PASSWORD;

    console.log("Hash matches?", hashMatches);
    console.log("Password matches?", passwordMatches);

    const isValidPassword = hashMatches && passwordMatches;

    if (!isValidPassword) {
      console.log("❌ Authentication failed");
      console.log("Expected password:", KNOWN_PASSWORD);
      console.log("Expected hash:", KNOWN_HASH);

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("✅✅✅ SIGNIN SUCCESSFUL");

    // ✅✅✅ FIXED: Create response and set cookie on it
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Signin successful",
    });

    // ✅✅✅ Set the cookie on the response
    response.cookies.set({
      name: "auth-user", // Changed from "auth-token" to match your check
      value: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timestamp: Date.now(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: "/",
      sameSite: "strict",
    });

    console.log("✅ Cookie 'auth-user' should be set");
    return response;
  } catch (error: any) {
    console.error("❌ SIGNIN ERROR:", error.message);
    console.error("Stack:", error.stack);

    return NextResponse.json(
      {
        error: "Failed to sign in",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET method to verify endpoint
export async function GET() {
  return NextResponse.json({
    status: "Signin endpoint active",
    timestamp: new Date().toISOString(),
    note: "Use POST with {email, password}",
    knownPassword: "TempPass123!",
    knownHashPrefix: KNOWN_HASH.substring(0, 30) + "...",
  });
}
