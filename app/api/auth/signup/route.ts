import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    console.log("Signup request:", {
      name,
      email,
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

    // Create user
    const userResult = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword).query(`
        INSERT INTO Users (name, email, password) 
        OUTPUT INSERTED.id
        VALUES (@name, @email, @password)
      `);

    const newUserId = userResult.recordset[0].id;
    console.log("User created with ID:", newUserId);

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Signup error:", error);

    // More specific error messages
    if (
      error.message?.includes("Users") ||
      error.message?.includes("ITStaffInventory")
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
