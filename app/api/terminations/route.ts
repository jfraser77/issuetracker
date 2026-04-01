import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import sql from "mssql";
import { sendEmail } from "../../../lib/email";
import { HR_EMAILS, DEFAULT_CHECKLIST } from "../../../lib/terminationConstants";



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    
    const pool = await connectToDatabase();
    
    let query = `
      SELECT
        t.*,
        CASE
          WHEN t.equipmentReturnDeadline IS NOT NULL
            THEN CASE WHEN GETDATE() > t.equipmentReturnDeadline AND t.status = 'pending' THEN 1 ELSE 0 END
          ELSE CASE WHEN DATEDIFF(day, t.terminationDate, GETDATE()) > 14 AND t.status = 'pending' THEN 1 ELSE 0 END
        END as isOverdue,
        CASE
          WHEN t.equipmentReturnDeadline IS NOT NULL
            THEN GREATEST(0, DATEDIFF(day, GETDATE(), t.equipmentReturnDeadline))
          ELSE GREATEST(0, 30 - DATEDIFF(day, t.terminationDate, GETDATE()))
        END as daysRemaining
      FROM Terminations t
      WHERE 1=1
    `;

    if (filter === 'overdue') {
      query += `
        AND t.status = 'pending'
        AND (
          (t.equipmentReturnDeadline IS NOT NULL AND GETDATE() > t.equipmentReturnDeadline)
          OR (t.equipmentReturnDeadline IS NULL AND DATEDIFF(day, t.terminationDate, GETDATE()) > 14)
        )`;
    } else if (filter === 'archived') {
      query += ` AND t.status = 'archived'`;
    } else {
      query += ` AND t.status != 'archived'`;
    }

    query += " ORDER BY t.terminationDate DESC";

    const result = await pool.request().query(query);
    
    // Parse checklist JSON if it exists, otherwise use default
    const terminations = result.recordset.map(termination => {
      let checklist = DEFAULT_CHECKLIST;
      
      try {
        if (termination.checklist) {
          const parsedChecklist = JSON.parse(termination.checklist);
          if (Array.isArray(parsedChecklist) && parsedChecklist.length > 0) {
            checklist = parsedChecklist;
          }
        }
      } catch (error) {
        console.error("Error parsing checklist for termination", termination.id, error);
      }

      return {
        ...termination,
        checklist,
        // Ensure daysRemaining is never negative
        daysRemaining: Math.max(0, termination.daysRemaining || 0)
      };
    });

    return NextResponse.json(terminations);
  } catch (error) {
    console.error("Error fetching terminations:", error);
    return NextResponse.json({ error: "Failed to fetch terminations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("🔵 POST /api/terminations called");
  
  try {
    // Parse request body
    const terminationData = await request.json();
    console.log("📦 Received termination data:", terminationData);

    // Validate required fields
    if (!terminationData.employeeName || !terminationData.employeeEmail || !terminationData.terminationDate) {
      console.error("❌ Missing required fields");
      return NextResponse.json({ 
        error: "Missing required fields",
        received: terminationData 
      }, { status: 400 });
    }

    // Connect to database
    console.log("🔗 Connecting to database...");
    const pool = await connectToDatabase();
    
    // Test connection
    const testResult = await pool.request().query('SELECT @@VERSION as version');
    console.log("✅ Database connection successful");

        const terminationDate = new Date(terminationData.terminationDate);
    // Set to noon to avoid timezone issues
    terminationDate.setHours(12, 0, 0, 0);

    // Use provided checklist or default to full checklist
    const checklistToSave = terminationData.checklist && terminationData.checklist.length > 0 
      ? terminationData.checklist 
      : DEFAULT_CHECKLIST;

    console.log("💾 Preparing to insert termination with checklist items:", checklistToSave.length);

    
    const insertQuery = `
  INSERT INTO Terminations (
    employeeName, employeeEmail, jobTitle, department, terminationDate,
    terminationReason, initiatedBy, equipmentDisposition, licensesRemoved, checklist, status, equipmentReturnDeadline
  )
  VALUES (
    @employeeName, @employeeEmail, @jobTitle, @department, @terminationDate,
    @terminationReason, @initiatedBy, @equipmentDisposition,
    '{"automateLicense":false,"screenConnect":false,"office365":false,"adobeAcrobat":false,"phone":false,"fax":false}',
    @checklist, 'pending', @equipmentReturnDeadline
  );

  -- Get the inserted record using SCOPE_IDENTITY()
  SELECT * FROM Terminations WHERE id = SCOPE_IDENTITY();
`;

    console.log("📝 Executing SQL query (without OUTPUT clause)");

    // Execute the query
   const result = await pool.request()
  .input('employeeName', sql.NVarChar, terminationData.employeeName)
  .input('employeeEmail', sql.NVarChar, terminationData.employeeEmail)
  .input('jobTitle', sql.NVarChar, '')
  .input('department', sql.NVarChar, '')
  .input('terminationDate', sql.Date, terminationData.terminationDate)
  .input('terminationReason', sql.NVarChar, terminationData.terminationReason || 'Termination process initiated')
  .input('initiatedBy', sql.NVarChar, terminationData.initiatedBy || 'System')
  .input('equipmentDisposition', sql.NVarChar, 'pending_assessment')
  .input('checklist', sql.NVarChar, JSON.stringify(checklistToSave))
  .input('equipmentReturnDeadline', sql.Date, terminationData.equipmentReturnDeadline || null)
  .query(insertQuery);

    console.log("✅ SQL query executed successfully");
    console.log("📊 Result recordset:", result.recordset);

    if (result.recordset.length === 0) {
      console.error("❌ No record returned after INSERT");
      return NextResponse.json({ 
        error: "No record created or could not retrieve created record" 
      }, { status: 500 });
    }

    const createdTermination = result.recordset[0];
    console.log("🎉 Termination created successfully with ID:", createdTermination.id);

    // Parse the checklist back from JSON for response
    let parsedChecklist = checklistToSave;
    try {
      if (createdTermination.checklist) {
        parsedChecklist = JSON.parse(createdTermination.checklist);
      }
    } catch (error) {
      console.error("Error parsing checklist in response:", error);
    }

    const responseTermination = {
      ...createdTermination,
      terminationDate: terminationDate.toISOString().split('T')[0], // Return as YYYY-MM-DD
      checklist: checklistToSave
    };

    // Compute the equipment return deadline — use the custom date if provided, otherwise +14 days
    const equipmentDeadline = terminationData.equipmentReturnDeadline
      ? new Date(terminationData.equipmentReturnDeadline + "T12:00:00")
      : (() => { const d = new Date(terminationDate); d.setDate(d.getDate() + 14); return d; })();
    const deadlineStr = equipmentDeadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const terminationDateStr = terminationDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Send initiation email to HR team AND employee's personal email
    const initiationRecipients = [...HR_EMAILS, terminationData.employeeEmail];

    sendEmail({
      to: initiationRecipients,
      subject: `Termination Initiated: ${terminationData.employeeName} – Equipment Return Required by ${deadlineStr}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1d4ed8, #1e40af); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Termination Initiated</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Dear HR Team,</p>
            <p style="font-size: 16px; color: #374151;">
              A new termination has been initiated in the Employee Management Portal. Please review the details below and ensure equipment is returned by the deadline.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; width: 40%;">Employee Name:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${terminationData.employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Personal Email:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${terminationData.employeeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Termination Date:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${terminationDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Initiated By:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${terminationData.initiatedBy || "System"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Equipment Return Deadline:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${deadlineStr}</td>
              </tr>
            </table>

            <div style="background-color: #eff6ff; padding: 20px; margin: 25px 0; border: 2px solid #bfdbfe; border-radius: 8px;">
              <p style="font-size: 15px; color: #1d4ed8; font-weight: bold; margin: 0 0 8px 0;">Action Required: Equipment Return Tracking</p>
              <p style="font-size: 14px; color: #374151; margin: 0;">
                HR Team, please log in to the Employee Management Portal and enter the shipping tracking number once equipment has been returned. This is required to complete the termination process.
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af;">
                NSN Revenue Resources IT Department – Automated Notification<br>
                This alert was generated by the Employee Management System
              </p>
            </div>
          </div>
        </div>
      `,
    }).catch((err) => console.error("Failed to send termination initiation email:", err));

    console.log("📤 Sending success response");
    return NextResponse.json(responseTermination);
    
  } catch (error: any) {
    console.error("❌ CRITICAL ERROR creating termination:", error);
    
    // Detailed error information
    const errorInfo = {
      message: error.message,
      name: error.name,
      number: error.number,
      state: error.state,
      class: error.class,
      server: error.server,
      procedure: error.procedure,
      lineNumber: error.lineNumber,
      originalError: error.originalError?.message
    };

    console.error("📋 Error details:", errorInfo);

    return NextResponse.json({ 
      error: "Failed to create termination",
      details: errorInfo
    }, { status: 500 });
  }
}