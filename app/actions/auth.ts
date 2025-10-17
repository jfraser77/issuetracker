"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";

export async function signup(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "HR";

  console.log("Signup attempt:", { name, email, role });

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  try {
    const pool = await connectToDatabase();
    console.log("Database connected for signup");

    // Check if user already exists
    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      console.log("User already exists:", email);
      return { error: "User already exists with this email" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log("Password hashed successfully");

    // Create user and get the new user ID
    const userResult = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, role).query(`
        INSERT INTO Users (name, email, password, role, createdAt, updatedAt) 
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.name
        VALUES (@name, @email, @password, @role, GETDATE(), GETDATE())
      `);

    const newUser = userResult.recordset[0];
    console.log("New user created:", newUser);

    // Initialize user inventory
    try {
      await pool.request().input("userId", sql.Int, newUser.id).query(`
          INSERT INTO ITStaffInventory (userId, availableLaptops) 
          VALUES (@userId, 0)
        `);
      console.log("Inventory record created for user:", newUser.id);
    } catch (inventoryError: any) {
      console.error("Could not create inventory record:", inventoryError);
      // Continue anyway - inventory can be created later
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", newUser.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    console.log("Signup completed successfully for:", newUser.email);

    // Redirect after successful signup
    redirect("/management-portal/dashboard");
  } catch (error: any) {
    console.error("Signup error:", error);
    return { error: "Failed to create account: " + error.message };
  }
}

export async function signin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  console.log("Signin attempt:", { email });

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const pool = await connectToDatabase();
    console.log("Database connected for signin");

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      console.log("No user found with email:", email);
      return { error: "Invalid email or password" };
    }

    const user = result.recordset[0];
    console.log("User found:", { id: user.id, email: user.email });

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("Invalid password for user:", email);
      return { error: "Invalid email or password" };
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

        console.log("✅ Cookie set successfully");
    console.log("🔄 Attempting redirect to /management-portal/dashboard");

    // Add a small delay to ensure cookie is set
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log("Signin successful, redirecting to dashboard");

    // Redirect after successful signin
    redirect("/management-portal/dashboard");
  } catch (error: any) {
    console.error("Signin error:", error);
    return { error: "Failed to sign in: " + error.message };
  }
}

export async function signout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth-user");
    console.log("User signed out");
  } catch (error) {
    console.error("Signout error:", error);
  }
  redirect("/signin");
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get("auth-user")?.value;

    if (!userEmail) {
      return null;
    }

    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, userEmail)
      .query("SELECT id, name, email, role FROM Users WHERE email = @email");

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}
