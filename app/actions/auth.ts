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
  const role = (formData.get("role") as string) || "HR"; // Default to HR if not provided

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  try {
    const pool = await connectToDatabase();

    // Check if user already exists
    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      return { error: "User already exists with this email" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and get the new user ID
    const userResult = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, role).query(`
        INSERT INTO Users (name, email, password, role) 
        OUTPUT INSERTED.id
        VALUES (@name, @email, @password, @role)
      `);

    const newUserId = userResult.recordset[0].id;
    console.log("New user created with ID:", newUserId);

    // ✅ STEP 3: Initialize user inventory - PLACE THIS RIGHT AFTER USER CREATION
    try {
      const inventoryResult = await pool
        .request()
        .input("userId", sql.Int, newUserId).query(`
          INSERT INTO ITStaffInventory (userId, availableLaptops) 
          OUTPUT INSERTED.*
          VALUES (@userId, 0)
        `);
      console.log("Inventory record created:", inventoryResult.recordset[0]);
    } catch (inventoryError: any) {
      console.error("Could not create inventory record:", inventoryError);
      // Don't fail the signup if inventory creation fails
      // The auto-creation in the GET endpoint will handle it
    }

    // Set session cookie and redirect
    const cookieStore = await cookies();
    cookieStore.set("auth-user", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    console.log("Signup completed successfully for:", email);
  } catch (error) {
    console.error("Signup error:", error);
    return { error: "Failed to create account" };
  }

  redirect("/management-portal/dashboard");
}

export async function signin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      return { error: "Invalid email or password" };
    }

    const user = result.recordset[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return { error: "Invalid email or password" };
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-user", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
  } catch (error) {
    console.error("Signin error:", error);
    return { error: "Failed to sign in" };
  }

  redirect("/management-portal/dashboard");
}

export async function signout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-user");
  redirect("/signin");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("auth-user")?.value;

  if (!userEmail) {
    return null;
  }

  try {
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
