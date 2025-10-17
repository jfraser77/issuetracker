import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    
    const pool = await connectToDatabase();
    
    let query = `
      SELECT 
        t.*,
        DATEDIFF(day, t.terminationDate, GETDATE()) as daysPassed,
        CASE 
          WHEN DATEDIFF(day, t.terminationDate, GETDATE()) > 30 AND t.status = 'pending' THEN 1
          ELSE 0
        END as isOverdue,
        30 - DATEDIFF(day, t.terminationDate, GETDATE()) as daysRemaining
      FROM Terminations t
      WHERE t.status != 'archived'
    `;

    if (filter === 'overdue') {
      query += ` AND DATEDIFF(day, t.terminationDate, GETDATE()) > 30 AND t.status = 'pending'`;
    }

    query += " ORDER BY t.terminationDate DESC";

    const result = await pool.request().query(query);
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error("Error fetching terminations:", error);
    return NextResponse.json({ error: "Failed to fetch terminations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const terminationData = await request.json();
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('employeeName', terminationData.employeeName)
      .input('employeeEmail', terminationData.employeeEmail)
      .input('jobTitle', terminationData.jobTitle)
      .input('department', terminationData.department)
      .input('terminationDate', terminationData.terminationDate)
      .input('terminationReason', terminationData.terminationReason)
      .input('initiatedBy', terminationData.initiatedBy)
      .input('equipmentDisposition', terminationData.equipmentDisposition)
      .query(`
        INSERT INTO Terminations (
          employeeName, employeeEmail, jobTitle, department, terminationDate, 
          terminationReason, initiatedBy, equipmentDisposition, licensesRemoved
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @employeeName, @employeeEmail, @jobTitle, @department, @terminationDate,
          @terminationReason, @initiatedBy, @equipmentDisposition,
          '{"automateLicense":false,"screenConnect":false,"office365":false,"adobeAcrobat":false,"phone":false,"fax":false}'
        )
      `);

    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error("Error creating termination:", error);
    return NextResponse.json({ error: "Failed to create termination" }, { status: 500 });
  }
}