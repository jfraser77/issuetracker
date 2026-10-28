import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";
import {
  PENDING_COOKIE,
  createPendingToken,
  normalizeEmail,
  pendingCookieOptions,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("email", sql.NVarChar, normalizeEmail(email))
      .query(
        "SELECT id, name, email, role, password, isActive FROM Users WHERE email = @email"
      );

    const user = result.recordset[0];
    const valid =
      !!user?.password &&
      user.isActive !== false &&
      (await bcrypt.compare(password, user.password));

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Credentials only prove step one; a session is created after 2FA.
    // The pending cookie is what lets send-2fa and the signin action run.
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      requires2FA: true,
    });
    response.cookies.set(
      PENDING_COOKIE,
      await createPendingToken(user.email),
      pendingCookieOptions
    );
    return response;
  } catch (error) {
    console.error("verify-credentials error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
