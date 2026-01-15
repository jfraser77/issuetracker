"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcrypt";

export async function signup(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const requestedRole = (formData.get("role") as string) || "User";
  const assignedRole = "User";

  console.log("Signup attempt:", { name, email, assignedRole });

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

  console.log("🔐 Signin attempt:", {
    email,
    hasPassword: !!password,
    has2FA: !!twoFactorCode,
  });

  try {
    // If 2FA code is provided, we're in the second step
    if (twoFactorCode) {
      console.log("🔄 Processing 2FA session creation...");

      // Get user info to set the session
      const pool = await connectToDatabase();
      const userResult = await pool
        .request()
        .input("email", sql.NVarChar, email)
        .query("SELECT id, name, email, role FROM Users WHERE email = @email");

      if (userResult.recordset.length === 0) {
        console.log("❌ User not found during session creation:", email);
        return { error: "User not found" };
      }

      const user = userResult.recordset[0];
      console.log("✅ User found for session:", user);

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set("auth-user", user.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      console.log("✅ Session cookie set");

      return {
        success: true,
        message: "Login successful",
      };
    }

    // If we get here, this is the first step (email/password verification)
    if (!email || !password) {
      console.log("❌ Email and password required for first step");
      return { error: "Email and password are required" };
    }

    console.log("🔄 Step 1: Verifying credentials...");

    //  verify credentials
    const verifyResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/auth/verify-credentials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.log("❌ Credential verification failed:", errorData);
      return { error: errorData.error || "Invalid email or password" };
    }

    const verifyData = await verifyResponse.json();
    console.log("✅ Credentials valid:", verifyData);

    // If 2FA is required, send code and show 2FA form
    if (verifyData.requires2FA) {
      console.log("🔄 2FA required, sending code...");

      const twoFactorResponse = await fetch(
        `${process.env.NEXTAUTH_URL}/api/auth/send-2fa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (twoFactorResponse.ok) {
        console.log("✅ 2FA code sent");
        return { requires2FA: true, email };
      } else {
        console.log("❌ Failed to send 2FA code");
        return { error: "Failed to send verification code" };
      }
    }

    // If no 2FA required, set session and redirect
    console.log("🔄 No 2FA required, setting session...");

    const cookieStore = await cookies();
    cookieStore.set("auth-user", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    console.log("✅ Signin successful");

    return {
      success: true,
      message: "Login successful",
      redirectTo: "/management-portal/dashboard",
    };
  } catch (error: any) {
    console.error("🚨 Signin error:", error);
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
      console.log("No auth-user cookie found");
      return null;
    }

    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, userEmail)
      .query("SELECT id, name, email, role FROM Users WHERE email = @email");

    const user = result.recordset[0] || null;
    console.log("getCurrentUser found:", user ? user.email : "no user");

    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}
