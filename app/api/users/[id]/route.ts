import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("id", sql.Int, params.id)
      .query("SELECT id, name, email FROM Users WHERE id = @id");

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
