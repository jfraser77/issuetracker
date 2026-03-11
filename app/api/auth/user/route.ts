import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "../../../../lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get("auth-user")?.value;

    if (!cookieValue) {
      return NextResponse.json(null);
    }

    // Cookie is stored as JSON: { id, email, name, role, timestamp }
    let userEmail: string;
    try {
      const parsed = JSON.parse(cookieValue);
      userEmail = parsed.email;
    } catch {
      userEmail = cookieValue; // fallback for old plain-email cookies
    }

    if (!userEmail) return NextResponse.json(null);

    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, userEmail)
      .query("SELECT id, name, email, role FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(null);
  }
}