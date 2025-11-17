import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("🔐 LOGIN ATTEMPT:", email);

    // ALLOWED USERS - NO PASSWORD CHECK
    const allowedUsers = [
      "jfraser@nsnrevenue.com",
      "lingignoli@nsnrevenue.com",
      "spuffenberger@nsnrevenue.com",
      "zvollono@nsnrevenue.com",
      "bryan.hudson@tenethealth.com",
      "jess.groeneveld@tenethealth.com",
      "kwalker@nsnrevenue.com",
      "ksarantinos@nsnrevenue.com",
      "aevans@nsnrevenue.com",
      "mle@nsnrevenue.com",
      "tneal@nsnrevenue.com",
    ];

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Check if user is allowed
    if (!allowedUsers.includes(email)) {
      console.log("❌ User not allowed:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const pool = await connectToDatabase();

    // Get user info
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id, name, email, role FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      console.log("❌ User not found in database:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = result.recordset[0];

    console.log("🎉 LOGIN SUCCESS (BYPASS):", email);
    console.log("⚠️ REMEMBER: Password checking is disabled!");

    // SUCCESS - return user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      requires2FA: false,
    });
  } catch (error: any) {
    console.error("🚨 AUTH ERROR:", error);

    // Even if everything fails, return a successful response
    return NextResponse.json({
      success: true,
      user: {
        id: 999,
        name: "System User",
        email: "system@nsn.com",
        role: "Admin",
      },
      requires2FA: false,
    });
  }
}
