export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

// GET - Fetch archived employees
export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    const result = await pool.request().query(`
      SELECT * FROM ArchivedEmployees 
      ORDER BY archivedAt DESC
    `);

    return NextResponse.json(result.recordset);
  } catch (error: any) {
    console.error("Error fetching archived employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived employees" },
      { status: 500 },
    );
  }
}

// DELETE - Permanently delete archived employee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }

    const pool = await connectToDatabase();

    await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query("DELETE FROM ArchivedEmployees WHERE id = @id");

    return NextResponse.json({
      success: true,
      message: "Archived employee permanently deleted",
    });
  } catch (error: any) {
    console.error("Error deleting archived employee:", error);
    return NextResponse.json(
      { error: "Failed to delete archived employee" },
      { status: 500 },
    );
  }
}
