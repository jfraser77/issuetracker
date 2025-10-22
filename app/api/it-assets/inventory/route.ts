import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import sql from "mssql";
import { cookies } from "next/headers";

// Helper function to get current user from cookies
async function getCurrentUser() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("auth-user")?.value;

  if (!userEmail) {
    return null;
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, userEmail)
      .query("SELECT id, name, email, role FROM Users WHERE email = @email");

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    const result = await pool.request().query(`
      SELECT 
        i.*,
        u.name as userName,
        u.email as userEmail,
        u.role as userRole
      FROM ITStaffInventory i
      LEFT JOIN Users u ON i.userId = u.id
      WHERE u.role IN ('Admin', 'I.T.')  -- Only include Admin and I.T. roles
      ORDER BY u.name
    `);

    // Transform the data to match the frontend interface
    const inventory = result.recordset.map((item) => ({
      id: item.id,
      userId: item.userId,
      availableLaptops: item.availableLaptops,
      user: {
        id: item.userId,
        name: item.userName,
        email: item.userEmail,
        role: item.userRole,
      },
    }));

    return NextResponse.json(inventory);
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only allow Admin and I.T. roles to modify inventory
    if (user.role !== "Admin" && user.role !== "I.T.") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { userId, change } = await request.json();

    if (!userId || change === undefined) {
      return NextResponse.json(
        { error: "userId and change are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Check if inventory record exists
    const existingRecord = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM ITStaffInventory WHERE userId = @userId");

    if (existingRecord.recordset.length === 0) {
      // Create new record with initial value
      const initialValue = Math.max(change, 0); // Ensure non-negative
      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("availableLaptops", sql.Int, initialValue).query(`
          INSERT INTO ITStaffInventory (userId, availableLaptops)
          VALUES (@userId, @availableLaptops)
        `);
    } else {
      // Update existing record
      const currentValue = existingRecord.recordset[0].availableLaptops;
      const newValue = Math.max(currentValue + change, 0); // Ensure non-negative

      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("availableLaptops", sql.Int, newValue).query(`
          UPDATE ITStaffInventory 
          SET availableLaptops = @availableLaptops 
          WHERE userId = @userId
        `);
    }

    // Return updated inventory
    const updatedResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        SELECT 
          i.*,
          u.name as userName,
          u.email as userEmail,
          u.role as userRole
        FROM ITStaffInventory i
        LEFT JOIN Users u ON i.userId = u.id
        WHERE i.userId = @userId
      `);

    const updatedItem = {
      id: updatedResult.recordset[0].id,
      userId: updatedResult.recordset[0].userId,
      availableLaptops: updatedResult.recordset[0].availableLaptops,
      user: {
        id: updatedResult.recordset[0].userId,
        name: updatedResult.recordset[0].userName,
        email: updatedResult.recordset[0].userEmail,
        role: updatedResult.recordset[0].userRole,
      },
    };

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error("Error updating inventory:", error);
    return NextResponse.json(
      { error: "Failed to update inventory", details: error.message },
      { status: 500 }
    );
  }
}
