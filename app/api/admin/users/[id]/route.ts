import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, email, role } = await request.json();

    console.log(`🔄 Updating user ${id} with:`, { name, email, role });

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();
    console.log("✅ Database connected");

    // Check if email is already taken by another user
    const existingUser = await pool.request()
      .input("email", sql.NVarChar, email)
      .input("id", sql.Int, parseInt(id))
      .query("SELECT id FROM Users WHERE email = @email AND id != @id");

    if (existingUser.recordset.length > 0) {
      return NextResponse.json(
        { error: "Email is already taken by another user" },
        { status: 400 }
      );
    }

    // Update user with better error handling
    console.log(`📝 Executing UPDATE for user ${id}`);
    
    const result = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query(`
        UPDATE Users 
        SET name = @name, email = @email, role = @role, updatedAt = GETDATE()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.createdAt, INSERTED.lastLogin, INSERTED.isActive 
        WHERE id = @id
      `);

    console.log(`📊 Update result:`, result);

    if (result.recordset.length === 0) {
      console.log(`❌ User ${id} not found`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`✅ User ${id} updated successfully`);
    
    return NextResponse.json({
      success: true,
      user: result.recordset[0],
      message: "User updated successfully"
    });

  } catch (error: any) {
    console.error("❌ Error updating user:", error);
    
    // More detailed error information
    const errorDetails = {
      message: error.message,
      number: error.number,
      state: error.state,
      class: error.class,
      server: error.server,
      procedure: error.procedure,
      lineNumber: error.lineNumber,
    };
    
    console.error("📋 SQL Error details:", errorDetails);

    return NextResponse.json(
      { 
        error: "Failed to update user",
        details: error.message,
        sqlError: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const pool = await connectToDatabase();

    // Prevent deletion of last admin
    const adminCount = await pool.request()
      .query("SELECT COUNT(*) as count FROM Users WHERE role = 'Admin' AND isActive = 1");

    const userToDelete = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .query("SELECT role FROM Users WHERE id = @id");

    if (userToDelete.recordset[0]?.role === 'Admin' && adminCount.recordset[0]?.count <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last active administrator" },
        { status: 400 }
      );
    }

    const result = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .query("DELETE FROM Users WHERE id = @id");

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}