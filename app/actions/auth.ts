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
  const twoFactorCode = formData.get("twoFactorCode") as string;

  console.log("Signin attempt:", { email, has2FA: !!twoFactorCode });

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    // If 2FA code is provided, verify it
    if (twoFactorCode) {
      const twoFactorResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: twoFactorCode }),
      });

      if (!twoFactorResponse.ok) {
        const errorData = await twoFactorResponse.json();
        return { error: errorData.error || "Invalid verification code" };
      }

      const twoFactorData = await twoFactorResponse.json();
      
      // Set session cookie after successful 2FA verification
      const cookieStore = await cookies();
      cookieStore.set("auth-user", twoFactorData.user.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      console.log("2FA signin successful, redirecting to dashboard");
      redirect("/management-portal/dashboard");
    }

    // First verify credentials
    const verifyResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/verify-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      return { error: errorData.error || "Invalid email or password" };
    }

    const verifyData = await verifyResponse.json();

    // If 2FA is required, send code and show 2FA form
    if (verifyData.requires2FA) {
      const twoFactorResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/send-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (twoFactorResponse.ok) {
        return { requires2FA: true, email };
      } else {
        return { error: "Failed to send verification code" };
      }
    }

    // If no 2FA required, set session and redirect
    const cookieStore = await cookies();
    cookieStore.set("auth-user", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    console.log("Signin successful, redirecting to dashboard");
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
