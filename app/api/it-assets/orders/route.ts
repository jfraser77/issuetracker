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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const orderData = await request.json();

    // Validate required fields
    if (!orderData.quantity || !orderData.orderedByUserId || !orderData.intendedRecipientId) {
      return NextResponse.json(
        { error: "Quantity, orderedByUserId, and intendedRecipientId are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


    const result = await pool
      .request()
      .input("orderNumber", sql.NVarChar, orderNumber)
      .input("trackingNumber", sql.NVarChar, orderData.trackingNumber || null)
      .input("orderedByUserId", sql.Int, orderData.orderedByUserId)
      .input("intendedRecipientId", sql.Int, orderData.intendedRecipientId)
      .input("quantity", sql.Int, orderData.quantity)
      .input("status", sql.NVarChar, "ordered")
      .input("notes", sql.NVarChar, orderData.notes || "")
      .query(`
        INSERT INTO LaptopOrders 
        (orderNumber, trackingNumber, orderedByUserId, intendedRecipientId, quantity, status, notes, orderDate)
        OUTPUT INSERTED.id, INSERTED.orderNumber, INSERTED.trackingNumber, INSERTED.orderedByUserId, 
               INSERTED.intendedRecipientId, INSERTED.quantity, INSERTED.status, INSERTED.notes, 
               INSERTED.orderDate, INSERTED.receivedDate, INSERTED.isArchived, INSERTED.canUnarchive
        VALUES (@orderNumber, @trackingNumber, @orderedByUserId, @intendedRecipientId, @quantity, @status, @notes, GETDATE())
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Now fetch the complete order with user details
    const completeOrderResult = await pool
      .request()
      .input("orderId", sql.Int, result.recordset[0].id)
      .query(`
        SELECT 
          lo.*,
          u.name as orderedByName,
          u.email as orderedByEmail,
          u.role as orderedByRole,
          ir.name as intendedRecipientName,
          ir.email as intendedRecipientEmail,
          ir.role as intendedRecipientRole
        FROM LaptopOrders lo
        LEFT JOIN Users u ON lo.orderedByUserId = u.id
        LEFT JOIN Users ir ON lo.intendedRecipientId = ir.id
        WHERE lo.id = @orderId
      `);

    const order = completeOrderResult.recordset[0];
    
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      orderedByUserId: order.orderedByUserId,
      intendedRecipientId: order.intendedRecipientId,
      quantity: order.quantity,
      status: order.status,
      orderDate: order.orderDate,
      receivedDate: order.receivedDate,
      notes: order.notes,
      isArchived: order.isArchived,
      canUnarchive: order.canUnarchive,
      orderedBy: {
        id: order.orderedByUserId,
        name: order.orderedByName,
        email: order.orderedByEmail,
        role: order.orderedByRole,
      },
      intendedRecipient: order.intendedRecipientId ? {
        id: order.intendedRecipientId,
        name: order.intendedRecipientName,
        email: order.intendedRecipientEmail,
        role: order.intendedRecipientRole,
      } : null
    };

    return NextResponse.json(formattedOrder, { status: 201 });
  } catch (error: any) {
    console.error("Error creating laptop order:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const pool = await connectToDatabase();

    let query = `
      SELECT 
        lo.*,
        u.name as orderedByName,
        u.email as orderedByEmail,
        u.role as orderedByRole,
        ir.name as intendedRecipientName,
        ir.email as intendedRecipientEmail,
        ir.role as intendedRecipientRole
      FROM LaptopOrders lo
      LEFT JOIN Users u ON lo.orderedByUserId = u.id
      LEFT JOIN Users ir ON lo.intendedRecipientId = ir.id
    `;

    if (activeOnly) {
      query += ` WHERE lo.isArchived = 0 `;
    }

    query += ` ORDER BY lo.orderDate DESC`;

    const result = await pool.request().query(query);

    console.log("Fetched orders:", result.recordset.length);

    // Transform the data to match the frontend interface
    const orders = result.recordset.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      orderedByUserId: order.orderedByUserId,
      intendedRecipientId: order.intendedRecipientId,
      quantity: order.quantity,
      status: order.status,
      orderDate: order.orderDate,
      receivedDate: order.receivedDate,
      notes: order.notes,
      isArchived: order.isArchived,
      canUnarchive: order.canUnarchive,
      orderedBy: {
        id: order.orderedByUserId,
        name: order.orderedByName,
        email: order.orderedByEmail,
        role: order.orderedByRole,
      },
      intendedRecipient: order.intendedRecipientId ? {
        id: order.intendedRecipientId,
        name: order.intendedRecipientName,
        email: order.intendedRecipientEmail,
        role: order.intendedRecipientRole,
      } : null
    }));

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("Error fetching laptop orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders", details: error.message },
      { status: 500 }
    );
  }
}