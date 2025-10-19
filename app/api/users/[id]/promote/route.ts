import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { promotedBy } = await request.json(); // Admin who is promoting

    const pool = await connectToDatabase();

    // Verify the promoting user has Admin rights
    const promoterResult = await pool
      .request()
      .input("id", sql.Int, parseInt(promotedBy))
      .query("SELECT role FROM Users WHERE id = @id");

    if (promoterResult.recordset[0]?.role !== "Admin") {
      return NextResponse.json(
        { error: "Only administrators can promote users to Admin role" },
        { status: 403 }
      );
    }

    // Update user role to Admin
    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(id))
      .query(`
        UPDATE Users 
        SET role = 'Admin', updatedAt = GETDATE()
        WHERE id = @id
        SELECT id, name, email, role FROM Users WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`User ${id} promoted to Admin by user ${promotedBy}`);

    return NextResponse.json({
      success: true,
      user: result.recordset[0],
      message: "User successfully promoted to Admin"
    });

  } catch (error: any) {
    console.error("Error promoting user:", error);
    return NextResponse.json(
      { error: "Failed to promote user: " + error.message },
      { status: 500 }
    );
  }
}