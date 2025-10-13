import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../lib/db";
import sql from "mssql";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await connectToDatabase();

    // Archive the specific order
    const result = await pool.request().input("id", sql.Int, params.id).query(`
        UPDATE LaptopOrders 
        SET isArchived = 1
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Order archived successfully",
    });
  } catch (error: any) {
    console.error("Error archiving order:", error);
    return NextResponse.json(
      { error: "Failed to archive order", details: error.message },
      { status: 500 }
    );
  }
}
