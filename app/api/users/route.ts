import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/app/actions/auth";

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "Admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("Creating user:", { name, email, role });
    console.log(
      "Password hash (first 30 chars):",
      hashedPassword.substring(0, 30) + "...",
    );

    const pool = await connectToDatabase();

    // Check if user already exists
    const checkResult = await pool
      .request()
      .input("email", email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (checkResult.recordset.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    // Insert new user with hashed password
    const result = await pool
      .request()
      .input("name", name)
      .input("email", email)
      .input("password", hashedPassword) // Store HASHED password
      .input("role", role).query(`
        INSERT INTO Users (name, email, password, role, createdAt, updatedAt)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.createdAt
        VALUES (@name, @email, @password, @role, GETDATE(), GETDATE())
      `);

    console.log("User created successfully:", result.recordset[0]);

    return NextResponse.json(
      {
        message: "User created successfully",
        user: result.recordset[0],
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle duplicate email error
    if (error.number === 2627 || error.message?.includes("duplicate key")) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create user", details: error.message },
      { status: 500 },
    );
  }
}
