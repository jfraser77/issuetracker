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

    // Validate required fields - now including intendedRecipientId
    if (!orderData.quantity || !orderData.orderedByUserId || !orderData.intendedRecipientId) {
      return NextResponse.json(
        { error: "Quantity, orderedByUserId, and intendedRecipientId are required" },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create order with intended recipient
    const result = await pool
      .request()
      .input("orderNumber", sql.NVarChar, orderNumber)
      .input("trackingNumber", sql.NVarChar, orderData.trackingNumber || null)
      .input("orderedByUserId", sql.Int, orderData.orderedByUserId)
      .input("intendedRecipientId", sql.Int, orderData.intendedRecipientId)
      .input("quantity", sql.Int, orderData.quantity)
      .input("status", sql.NVarChar, "ordered")
      .input("notes", sql.NVarChar, orderData.notes || "").query(`
        INSERT INTO LaptopOrders (orderNumber, trackingNumber, orderedByUserId, intendedRecipientId, quantity, status, notes)
        OUTPUT INSERTED.*
        VALUES (@orderNumber, @trackingNumber, @orderedByUserId, @intendedRecipientId, @quantity, @status, @notes)
      `);

    return NextResponse.json(result.recordset[0], { status: 201 });
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
    const includeArchived = searchParams.get("includeArchived") === "true";

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

    const conditions = [];
    if (activeOnly) {
      conditions.push(`lo.isArchived = 0`);
    }
    if (includeArchived) {
      // No filter needed, include all
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY lo.orderDate DESC`;

    const result = await pool.request().query(query);

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
      intendedRecipient: {
        id: order.intendedRecipientId,
        name: order.intendedRecipientName,
        email: order.intendedRecipientEmail,
        role: order.intendedRecipientRole,
      },
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