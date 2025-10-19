// app/api/users/[id]/promote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import { getCurrentUser } from "@/app/actions/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Get current user (the one making the promotion)
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== "Admin") {
      return NextResponse.json(
        { error: "Only administrators can promote users to Admin role" },
        { status: 403 }
      );
    }

    const pool = await connectToDatabase();

    // Check if target user exists
    const userCheck = await pool
      .request()
      .input("id", sql.Int, userId)
      .query("SELECT id, name, email, role FROM Users WHERE id = @id");

    if (userCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetUser = userCheck.recordset[0];

    // Update user role to Admin
    const result = await pool
      .request()
      .input("id", sql.Int, userId)
      .query(`
        UPDATE Users 
        SET role = 'Admin', updatedAt = GETDATE()
        WHERE id = @id
        SELECT id, name, email, role FROM Users WHERE id = @id
      `);

    console.log(`User ${targetUser.email} promoted to Admin by ${currentUser.email}`);

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