import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import sql from "mssql";
import { sendEmail } from "../../../lib/email";

const hrEmails = [
  "aogden@uspi.com",
  "aevans@nsnrevenue.com",
  "anwaters@uspi.com",
  "eolson@nsnrevenue.com",
];

// Default IT checklist items - ADD THIS CONSTANT
const defaultChecklist = [
  {
    id: "1",
    category: "Active Directory",
    description: "Disable Windows/AD account",
    completed: false
  },
  {
    id: "2",
    category: "Active Directory",
    description: 'Enter "disabled" and your initials and date in the Description field',
    completed: false
  },
  {
    id: "3",
    category: "Active Directory",
    description: "Remove all groups from Member Of tab",
    completed: false
  },
  {
    id: "4",
    category: "Active Directory",
    description: "Run Powershell script: Start-ADSyncSyncCycle -PolicyType Delta",
    completed: false
  },
  {
    id: "5",
    category: "Active Directory",
    description: "ScreenConnect and remove the computer from the domain",
    completed: false
  },
  {
    id: "6",
    category: "Active Directory",
    description: "ScreenConnect - General button > Machine Product/Serial#",
    completed: false
  },
  {
    id: "7",
    category: "Microsoft 365",
    description: "Active Users > (NOTE: do not remove license for 30 days)",
    completed: false
  },
  {
    id: "8",
    category: "Microsoft 365",
    description: "Account tab > Groups > Manage Groups – remove all groups",
    completed: false
  },
  {
    id: "9",
    category: "Software Access",
    description: "Navigator",
    completed: false
  },
  {
    id: "10",
    category: "Software Access",
    description: "SourceMed Analytics USPI",
    completed: false
  },
  {
    id: "11",
    category: "Software Access",
    description: "SourceMed Analytics NSN",
    completed: false
  },
  {
    id: "12",
    category: "Software Access",
    description: "SonicWall VPN Connect",
    completed: false
  },
  {
    id: "13",
    category: "Software Access",
    description: "Viirtue – Numbers and Devices. Change drop down to Available Number",
    completed: false
  },
  {
    id: "14",
    category: "Phone/Fax",
    description: "Phone #",
    completed: false
  },
  {
    id: "15",
    category: "Phone/Fax",
    description: "Fax #",
    completed: false
  },
  {
    id: "16",
    category: "Software Access",
    description: "Adobe – permanently delete",
    completed: false
  },
  {
    id: "17",
    category: "Software Access",
    description: "Set Ticket type = Access > Termination. Then Angie gets a notice and will disable Availity and Waystar",
    completed: false
  },
  {
    id: "18",
    category: "Software Access",
    description: "Automate - removed automate license",
    completed: false
  }
];



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    
    const pool = await connectToDatabase();
    
    let query = `
      SELECT 
        t.*,
        CASE 
          WHEN DATEDIFF(day, t.terminationDate, GETDATE()) > 30 AND t.status = 'pending' THEN 1
          ELSE 0
        END as isOverdue,
        CASE 
          WHEN DATEDIFF(day, t.terminationDate, GETDATE()) > 30 THEN 0
          ELSE GREATEST(0, 30 - DATEDIFF(day, t.terminationDate, GETDATE()))
        END as daysRemaining
      FROM Terminations t
      WHERE 1=1
    `;

    if (filter === 'overdue') {
      query += ` AND DATEDIFF(day, t.terminationDate, GETDATE()) > 30 AND t.status = 'pending'`;
    } else if (filter === 'archived') {
      query += ` AND t.status = 'archived'`;
    } else {
      query += ` AND t.status != 'archived'`;
    }

    query += " ORDER BY t.terminationDate DESC";

    const result = await pool.request().query(query);
    
    // Parse checklist JSON if it exists, otherwise use default
    const terminations = result.recordset.map(termination => {
      let checklist = defaultChecklist;
      
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
      : defaultChecklist;

    console.log("💾 Preparing to insert termination with checklist items:", checklistToSave.length);

    
    const insertQuery = `
  INSERT INTO Terminations (
    employeeName, employeeEmail, jobTitle, department, terminationDate, 
    terminationReason, initiatedBy, equipmentDisposition, licensesRemoved, checklist, status
  ) 
  VALUES (
    @employeeName, @employeeEmail, @jobTitle, @department, @terminationDate,
    @terminationReason, @initiatedBy, @equipmentDisposition,
    '{"automateLicense":false,"screenConnect":false,"office365":false,"adobeAcrobat":false,"phone":false,"fax":false}',
    @checklist, 'pending'
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

    // Send initiation email to HR team
    const equipmentDeadline = new Date(terminationDate);
    equipmentDeadline.setDate(equipmentDeadline.getDate() + 30);
    const deadlineStr = equipmentDeadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const terminationDateStr = terminationDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    sendEmail({
      to: hrEmails,
      subject: `Termination Initiated: ${terminationData.employeeName} – Equipment Return Required`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1d4ed8, #1e40af); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Termination Initiated</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Dear HR Team,</p>
            <p style="font-size: 16px; color: #374151;">
              A new termination has been initiated in the Employee Management Portal. Please review the details below and complete the required action.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold; width: 40%;">Employee Name:</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${terminationData.employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Employee Email:</td>
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
                HR Team, please log in to the Employee Management Portal and enter the shipping tracking number for the returned equipment on this termination record. This is required to complete the termination process.
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
    }).catch((err) => console.error("❌ Failed to send termination initiation email:", err));

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