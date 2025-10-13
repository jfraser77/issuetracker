import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/db";
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const pool = await connectToDatabase();

    // Check if order exists
    const checkResult = await pool
      .request()
      .input("id", orderId)
      .query("SELECT id FROM LaptopOrders WHERE id = @id");

    if (checkResult.recordset.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Delete the order
    await pool
      .request()
      .input("id", orderId)
      .query("DELETE FROM LaptopOrders WHERE id = @id");

    return NextResponse.json(
      { message: "Order deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !["ordered", "received", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status is required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    let query = "";
    if (status === "received") {
      query = `
        UPDATE LaptopOrders 
        SET status = @status, receivedDate = GETDATE() 
        WHERE id = @id
      `;
    } else {
      query = `
        UPDATE LaptopOrders 
        SET status = @status 
        WHERE id = @id
      `;
    }

    await pool
      .request()
      .input("id", sql.Int, params.id)
      .input("status", sql.NVarChar, status)
      .query(query);

    // Return updated order
    const result = await pool.request().input("id", sql.Int, params.id).query(`
        SELECT 
          lo.*,
          u.name as orderedByName,
          u.email as orderedByEmail,
          u.role as orderedByRole
        FROM LaptopOrders lo
        LEFT JOIN Users u ON lo.orderedByUserId = u.id
        WHERE lo.id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedOrder = {
      id: result.recordset[0].id,
      orderNumber: result.recordset[0].orderNumber,
      trackingNumber: result.recordset[0].trackingNumber,
      orderedByUserId: result.recordset[0].orderedByUserId,
      quantity: result.recordset[0].quantity,
      status: result.recordset[0].status,
      orderDate: result.recordset[0].orderDate,
      receivedDate: result.recordset[0].receivedDate,
      notes: result.recordset[0].notes,
      orderedBy: {
        id: result.recordset[0].orderedByUserId,
        name: result.recordset[0].orderedByName,
        email: result.recordset[0].orderedByEmail,
        role: result.recordset[0].orderedByRole,
      },
    };

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order", details: error.message },
      { status: 500 }
    );
  }
}
