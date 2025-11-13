import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let pool;
  try {
    console.log("🔄 PUT /api/admin/users/[id] started");
    const { id } = params;
    const body = await request.json();
    const { name, email, role } = body;

    console.log("📦 Request details:", {
      id,
      name,
      email,
      role,
      fullBody: body
    });

    // Basic validation
    if (!name || !email || !role) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["Admin", "I.T.", "HR", "Trainer"];
    if (!validRoles.includes(role)) {
      console.log("❌ Invalid role:", role);
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    console.log("🔗 Connecting to database...");
    pool = await connectToDatabase();
    console.log("✅ Database connected successfully");

    // Test connection with a simple query first
    console.log("🧪 Testing database connection...");
    const testResult = await pool.request().query("SELECT @@VERSION as version");
    console.log("✅ Database test query successful");

    // Check if user exists
    console.log(`🔍 Checking if user ${id} exists...`);
    const userCheck = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .query("SELECT id, name, email, role FROM Users WHERE id = @id");

    console.log("📊 User check result:", userCheck.recordset);

    if (userCheck.recordset.length === 0) {
      console.log("❌ User not found");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is already taken by another user
    console.log("📧 Checking email uniqueness...");
    const emailCheck = await pool.request()
      .input("email", sql.NVarChar, email)
      .input("id", sql.Int, parseInt(id))
      .query("SELECT id FROM Users WHERE email = @email AND id != @id");

    console.log("📊 Email check result:", emailCheck.recordset);

    if (emailCheck.recordset.length > 0) {
      console.log("❌ Email already taken");
      return NextResponse.json(
        { error: "Email is already taken by another user" },
        { status: 400 }
      );
    }

    // Perform the update - SIMPLIFIED without OUTPUT clause
    console.log("📝 Executing UPDATE query...");
    const updateQuery = `
      UPDATE Users 
      SET name = @name, email = @email, role = @role
      WHERE id = @id
    `;
    
    console.log("📋 SQL Query:", updateQuery);
    console.log("📦 Parameters:", { id: parseInt(id), name, email, role });

    const updateResult = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query(updateQuery);

    console.log("✅ UPDATE successful, rows affected:", updateResult.rowsAffected);

    if (updateResult.rowsAffected[0] === 0) {
      console.log("❌ No rows affected by UPDATE");
      return NextResponse.json(
        { error: "User not found or no changes made" },
        { status: 404 }
      );
    }

    // Fetch the updated user
    console.log("🔍 Fetching updated user data...");
    const updatedUser = await pool.request()
      .input("id", sql.Int, parseInt(id))
      .query(`
        SELECT id, name, email, role, createdAt, lastLogin, isActive 
        FROM Users 
        WHERE id = @id
      `);

    console.log("📊 Updated user data:", updatedUser.recordset[0]);

    const responseData = {
      success: true,
      user: updatedUser.recordset[0],
      message: "User updated successfully"
    };

    console.log("📤 Sending success response:", responseData);
    
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR in PUT /api/admin/users/[id]:", error);
    
    // Detailed error information
    const errorDetails = {
      message: error.message,
      name: error.name,
      number: error.number,
      state: error.state,
      class: error.class,
      server: error.server,
      procedure: error.procedure,
      lineNumber: error.lineNumber,
    };

    console.error("📋 Full error details:", errorDetails);
    console.error("🔍 Error stack:", error.stack);

    // Check if it's a SQL connection error
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return NextResponse.json(
        { 
          error: "Database connection failed",
          details: "Unable to connect to the database"
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to update user",
        details: error.message,
        sqlError: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  } finally {
    // Close connection if it exists
    if (pool) {
      try {
        await pool.close();
        console.log("🔒 Database connection closed");
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
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