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

// Function to update IT staff inventory when order is received
async function updateInventoryOnOrderReceived(orderId: number, pool: sql.ConnectionPool) {
  try {
    // Get order details including intended recipient and quantity
    const orderResult = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        SELECT intendedRecipientId, quantity 
        FROM LaptopOrders 
        WHERE id = @orderId
      `);

    if (orderResult.recordset.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.recordset[0];
    const intendedRecipientId = order.intendedRecipientId;
    const quantity = order.quantity;

    // Check if inventory record exists for the intended recipient
    const inventoryResult = await pool.request()
      .input("userId", sql.Int, intendedRecipientId)
      .query("SELECT * FROM ITStaffInventory WHERE userId = @userId");

    if (inventoryResult.recordset.length === 0) {
      // Create new inventory record
      await pool.request()
        .input("userId", sql.Int, intendedRecipientId)
        .input("availableLaptops", sql.Int, quantity)
        .query(`
          INSERT INTO ITStaffInventory (userId, availableLaptops)
          VALUES (@userId, @availableLaptops)
        `);
    } else {
      // Update existing inventory record
      const currentLaptops = inventoryResult.recordset[0].availableLaptops;
      await pool.request()
        .input("userId", sql.Int, intendedRecipientId)
        .input("availableLaptops", sql.Int, currentLaptops + quantity)
        .query(`
          UPDATE ITStaffInventory 
          SET availableLaptops = @availableLaptops 
          WHERE userId = @userId
        `);
    }

    console.log(`Updated inventory for user ${intendedRecipientId}: +${quantity} laptops`);
    return true;
  } catch (error) {
    console.error("Error updating inventory on order received:", error);
    return false;
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
      
      // Update inventory when order is marked as received
      const inventoryUpdated = await updateInventoryOnOrderReceived(parseInt(params.id), pool);
      if (!inventoryUpdated) {
        console.warn("Inventory update failed for order:", params.id);
      }
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
          u.role as orderedByRole,
          ir.name as intendedRecipientName,
          ir.email as intendedRecipientEmail,
          ir.role as intendedRecipientRole
        FROM LaptopOrders lo
        LEFT JOIN Users u ON lo.orderedByUserId = u.id
        LEFT JOIN Users ir ON lo.intendedRecipientId = ir.id
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
      intendedRecipientId: result.recordset[0].intendedRecipientId,
      quantity: result.recordset[0].quantity,
      status: result.recordset[0].status,
      orderDate: result.recordset[0].orderDate,
      receivedDate: result.recordset[0].receivedDate,
      notes: result.recordset[0].notes,
      isArchived: result.recordset[0].isArchived,
      canUnarchive: result.recordset[0].canUnarchive,
      orderedBy: {
        id: result.recordset[0].orderedByUserId,
        name: result.recordset[0].orderedByName,
        email: result.recordset[0].orderedByEmail,
        role: result.recordset[0].orderedByRole,
      },
      intendedRecipient: {
        id: result.recordset[0].intendedRecipientId,
        name: result.recordset[0].intendedRecipientName,
        email: result.recordset[0].intendedRecipientEmail,
        role: result.recordset[0].intendedRecipientRole,
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





