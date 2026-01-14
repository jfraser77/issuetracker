import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Find user - FIXED: Select specific columns
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email.trim().toLowerCase()) // Added trim and lowercase
      .query(`
        SELECT 
          id, 
          email, 
          name, 
          password, 
          role,
          createdAt,
          updatedAt
        FROM Users 
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      console.log("No user found for email:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = result.recordset[0];

    // Debug logging
    console.log("User found:", {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      passwordStartsWith: user.password?.substring(0, 30),
    });

    if (!user.password) {
      console.error("User has no password field:", user);
      return NextResponse.json(
        { error: "Account configuration error" },
        { status: 500 }
      );
    }

    // Verify password
    console.log("Comparing password...");
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", isValidPassword);

    if (!isValidPassword) {
      console.log("Password mismatch for user:", user.email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    console.log("Login successful for:", user.email);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Signin API error:", error);
    return NextResponse.json(
      {
        error: "Failed to sign in",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
