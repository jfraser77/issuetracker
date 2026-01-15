import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcrypt";

export async function GET() {
  try {
    const pool = await connectToDatabase();

    const result = await pool.request().query(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        createdAt,
        lastLogin,
        isActive
      FROM Users 
      ORDER BY name
    `);

    return NextResponse.json(result.recordset);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, role, password } = await request.json();

    if (!name || !email || !role || !password) {
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
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .input("password", sql.NVarChar, hashedPassword).query(`
        INSERT INTO Users (name, email, role, password, createdAt, isActive)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.createdAt
        VALUES (@name, @email, @role, @password, GETDATE(), 1)
      `);

    return NextResponse.json({
      success: true,
      user: result.recordset[0],
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
