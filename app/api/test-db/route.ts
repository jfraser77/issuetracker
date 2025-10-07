import { connectToDatabase } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Testing database connection...");
    const pool = await connectToDatabase();
    const result = await pool.request().query("SELECT @@VERSION as version");

    console.log("✅ Database connection successful!");
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: result.recordset,
    });
  } catch (error: any) {
    console.error("❌ Database connection failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error,
      },
      { status: 500 }
    );
  }
}
