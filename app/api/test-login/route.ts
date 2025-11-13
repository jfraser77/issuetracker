import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("🧪 Test login for:", email);

    // Test bcrypt directly
    const testHash = await bcrypt.hash("password123", 12);
    const testCompare = await bcrypt.compare("password123", testHash);

    console.log("🧪 Bcrypt test:", { testCompare });

    const pool = await connectToDatabase();

    // Test database connection and user lookup
    const userResult = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query(
        "SELECT id, email, role, LEN(password) as pwd_len FROM Users WHERE email = @email"
      );

    return NextResponse.json({
      bcryptWorking: testCompare,
      userExists: userResult.recordset.length > 0,
      user: userResult.recordset[0] || null,
      message: "Test completed",
    });
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        error: error.message,
        bcryptWorking: false,
        userExists: false,
      },
      { status: 500 }
    );
  }
}
