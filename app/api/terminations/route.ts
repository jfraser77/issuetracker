import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/db";
import sql from "mssql";

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
    
    // Parse checklist JSON if it exists, otherwise use default
    const terminations = result.recordset.map(termination => {
      let checklist = defaultChecklist; // Default to full checklist
      
      try {
        if (termination.checklist) {
          const parsedChecklist = JSON.parse(termination.checklist);
          // Only use parsed checklist if it has items, otherwise use default
          if (Array.isArray(parsedChecklist) && parsedChecklist.length > 0) {
            checklist = parsedChecklist;
          }
        }
      } catch (error) {
        console.error("Error parsing checklist for termination", termination.id, error);
        // Keep default checklist if parsing fails
      }

      return {
        ...termination,
        checklist
      };
    });

    return NextResponse.json(terminations);
  } catch (error) {
    console.error("Error fetching terminations:", error);
    return NextResponse.json({ error: "Failed to fetch terminations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const terminationData = await request.json();
    const pool = await connectToDatabase();
    
    // Use provided checklist or default to full checklist
    const checklistToSave = terminationData.checklist && terminationData.checklist.length > 0 
      ? terminationData.checklist 
      : defaultChecklist;

    console.log("Creating termination with checklist items:", checklistToSave.length);

    const result = await pool.request()
      .input('employeeName', terminationData.employeeName)
      .input('employeeEmail', terminationData.employeeEmail)
      .input('jobTitle', terminationData.jobTitle)
      .input('department', terminationData.department)
      .input('terminationDate', terminationData.terminationDate)
      .input('terminationReason', terminationData.terminationReason)
      .input('initiatedBy', terminationData.initiatedBy)
      .input('equipmentDisposition', terminationData.equipmentDisposition)
      .input('checklist', sql.NVarChar, JSON.stringify(checklistToSave))
      .query(`
        INSERT INTO Terminations (
          employeeName, employeeEmail, jobTitle, department, terminationDate, 
          terminationReason, initiatedBy, equipmentDisposition, licensesRemoved, checklist
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @employeeName, @employeeEmail, @jobTitle, @department, @terminationDate,
          @terminationReason, @initiatedBy, @equipmentDisposition,
          '{"automateLicense":false,"screenConnect":false,"office365":false,"adobeAcrobat":false,"phone":false,"fax":false}',
          @checklist
        )
      `);

    const createdTermination = result.recordset[0];
    
    // Always return the full checklist in response
    const responseTermination = {
      ...createdTermination,
      checklist: checklistToSave
    };

    console.log("Termination created successfully with", checklistToSave.length, "checklist items");
    return NextResponse.json(responseTermination);
  } catch (error: any) {
    console.error("Error creating termination:", error);
    return NextResponse.json({ 
      error: "Failed to create termination", 
      details: error.message 
    }, { status: 500 });
  }
}