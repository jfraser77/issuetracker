import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/app/actions/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Fetching all users...");
    const pool = await connectToDatabase();

    const result = await pool.request().query(`
      SELECT id, name, email, role, createdAt 
      FROM Users 
      ORDER BY name
    `);

    console.log("Users results:", result.recordset);
    return NextResponse.json(result.recordset);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
