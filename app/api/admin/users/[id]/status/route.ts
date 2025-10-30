import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { isActive } = await request.json();

    const pool = await connectToDatabase();

    // Prevent disabling last admin
    if (!isActive) {
      const adminCount = await pool.request()
        .query("SELECT COUNT(*) as count FROM Users WHERE role = 'Admin' AND isActive = 1");

      const userToDisable = await pool.request()
        .input("id", sql.Int, parseInt(id))
        .query("SELECT role FROM Users WHERE id = @id");

      if (userToDisable.recordset[0]?.role === 'Admin' && adminCount.recordset[0]?.count <= 1) {
        return NextResponse.json(
          { error: "Cannot disable the last active administrator" },
          { status: 400 }
        );
      }
    }

    const result = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .input("isActive", sql.Bit, isActive)
      .query(`
        UPDATE Users 
        SET isActive = @isActive, updatedAt = GETDATE()
        WHERE id = @id
        SELECT id, name, email, role, isActive 
        FROM Users WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.recordset[0],
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error: any) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}