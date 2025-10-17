import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('searchQuery', `%${query}%`)
      .query(`
        SELECT 
          id,
          firstName,
          lastName,
          email,
          jobTitle,
          department,
          status,
          startDate,
          currentManager
        FROM Employees 
        WHERE 
          (firstName LIKE @searchQuery OR 
           lastName LIKE @searchQuery OR 
           email LIKE @searchQuery OR
           jobTitle LIKE @searchQuery OR
           department LIKE @searchQuery OR
           CONCAT(firstName, ' ', lastName) LIKE @searchQuery)
        AND status != 'archived'
        ORDER BY 
          CASE 
            WHEN firstName LIKE @searchQuery OR lastName LIKE @searchQuery THEN 1
            WHEN email LIKE @searchQuery THEN 2
            ELSE 3
          END,
          firstName,
          lastName
        LIMIT 20
      `);

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error searching employees:", error);
    return NextResponse.json({ error: "Failed to search employees" }, { status: 500 });
  }
}