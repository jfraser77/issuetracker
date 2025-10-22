import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json(); // 'archive' or 'unarchive'
    const pool = await connectToDatabase();

    let query = "";
    let successMessage = "";

    if (action === "unarchive") {
      // Unarchive the order
      query = `
        UPDATE LaptopOrders 
        SET isArchived = 0, canUnarchive = 1
        WHERE id = @id
      `;
      successMessage = "Order unarchived successfully";
    } else {
      // Archive the order (default action)
      query = `
        UPDATE LaptopOrders 
        SET isArchived = 1, canUnarchive = 1
        WHERE id = @id
      `;
      successMessage = "Order archived successfully";
    }

    const result = await pool.request().input("id", sql.Int, params.id).query(query);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
    });
  } catch (error: any) {
    console.error("Error archiving/unarchiving order:", error);
    return NextResponse.json(
      { error: "Failed to process order", details: error.message },
      { status: 500 }
    );
  }
}