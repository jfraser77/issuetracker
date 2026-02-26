import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import sql from "mssql";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    // Get all active employees with their start dates, tasks, and portals
    const employeesResult = await pool.request().query(`
      SELECT 
        e.id, 
        e.firstName, 
        e.lastName, 
        e.jobTitle, 
        e.startDate,
        e.department,
        et.onboardingTasks,
        ep.portals
      FROM Employees e
      LEFT JOIN EmployeeOnboardingTasks et ON e.id = et.employeeId
      LEFT JOIN EmployeePortals ep ON e.id = ep.employeeId
      WHERE e.status = 'active'
      ORDER BY e.startDate DESC
    `);

    const employees = employeesResult.recordset;
    const today = new Date();
    const trainingEmail = "training@nsnrevenue.com";

    console.log(`🔍 Checking ${employees.length} employees for incomplete tasks and portals`);

    let notificationsSent = 0;

    for (const employee of employees) {
      const startDate = new Date(employee.startDate);
      const daysSinceStart = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(
        `📅 Employee ${employee.firstName} ${employee.lastName}: ${daysSinceStart} days since start`
      );

      // Check if it's exactly 3 days after start date
      if (daysSinceStart === 3) {
        console.log(`🔔 Sending notification for ${employee.firstName} ${employee.lastName}`);

        // Parse onboarding tasks
        let onboardingTasks = [];
        try {
          onboardingTasks = employee.onboardingTasks 
            ? JSON.parse(employee.onboardingTasks)
            : [];
        } catch (error) {
          console.warn(`Failed to parse tasks for employee ${employee.id}:`, error);
          onboardingTasks = [];
        }

        // Parse portals
        let portals = [];
        try {
          portals = employee.portals 
            ? JSON.parse(employee.portals)
            : [];
        } catch (error) {
          console.warn(`Failed to parse portals for employee ${employee.id}:`, error);
          portals = [];
        }

        // Filter incomplete tasks
        const incompleteTasks = onboardingTasks.filter(
          (task: any) => task.status !== "completed" && task.status !== "not applicable"
        );

        // Filter incomplete portals
        const incompletePortals = portals.filter(
          (portal: any) => portal.status !== "completed" && portal.status !== "not applicable"
        );

        // Only send notification if there are incomplete tasks OR incomplete portals
        if (incompleteTasks.length > 0 || incompletePortals.length > 0) {
          try {
            await sendEmail({
              to: trainingEmail,
              subject: `Onboarding Alert: Incomplete Items for ${employee.firstName} ${employee.lastName}`,
              html: generateIncompleteItemsEmail(employee, incompleteTasks, incompletePortals),
            });

            console.log(`✅ Notification sent for ${employee.firstName} ${employee.lastName}`);
            notificationsSent++;
          } catch (emailError) {
            console.error(
              `❌ Failed to send notification for ${employee.firstName} ${employee.lastName}:`,
              emailError
            );
          }
        } else {
          console.log(`✅ No incomplete items for ${employee.firstName} ${employee.lastName}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${notificationsSent} notifications for incomplete items`,
      checked: employees.length,
      notificationsSent,
    });
  } catch (error: any) {
    console.error("❌ Error in check-incomplete-tasks:", error);
    return NextResponse.json(
      {
        error: "Failed to check incomplete items",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function generateIncompleteItemsEmail(employee: any, incompleteTasks: any[], incompletePortals: any[]) {
  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const startDate = new Date(employee.startDate).toLocaleDateString();
  const daysSinceStart = Math.floor(
    (new Date().getTime() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const hasIncompleteTasks = incompleteTasks.length > 0;
  const hasIncompletePortals = incompletePortals.length > 0;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Onboarding Alert - Incomplete Items</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151;">Dear Training Team,</p>
        
        <div style="background-color: #fef3f2; padding: 20px; margin: 25px 0; border: 2px solid #fecaca; border-radius: 8px;">
          <p style="font-size: 16px; color: #dc2626; font-weight: bold; text-align: center;">
            ⚠️ INCOMPLETE ONBOARDING ITEMS - ACTION REQUIRED
          </p>
        </div>
        
        <p style="font-size: 16px; color: #374151;">
          The following employee started <strong>${daysSinceStart} days ago</strong> 
          (on ${startDate}) and has incomplete onboarding items that require attention:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Employee Name:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Job Title:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${employee.jobTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Department:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${employee.department}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Start Date:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${startDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-weight: bold;">Days Since Start:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${daysSinceStart} days</td>
          </tr>
        </table>

        ${hasIncompleteTasks ? `
        <h3 style="color: #374151; margin-top: 25px; margin-bottom: 15px;">Incomplete Tasks (${incompleteTasks.length}):</h3>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          ${incompleteTasks.map((task: any, index: number) => `
            <div style="padding: 8px 0; border-bottom: ${index < incompleteTasks.length - 1 ? '1px solid #e5e7eb' : 'none'};">
              <div style="display: flex; align-items: center;">
                <span style="color: #dc2626; font-weight: bold; margin-right: 8px;">•</span>
                <span style="font-weight: 500;">${task.name}</span>
                <span style="margin-left: auto; font-size: 12px; color: #6b7280; background: #e5e7eb; padding: 2px 8px; border-radius: 12px;">
                  ${task.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              ${task.notes && task.notes.length > 0 ? `
                <div style="font-size: 12px; color: #6b7280; margin-left: 16px; margin-top: 4px;">
                  Notes: ${task.notes[task.notes.length - 1]?.content || 'No notes'}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${hasIncompletePortals ? `
        <h3 style="color: #374151; margin-top: 25px; margin-bottom: 15px;">Incomplete Portals (${incompletePortals.length}):</h3>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #bae6fd;">
          ${incompletePortals.map((portal: any, index: number) => `
            <div style="padding: 8px 0; border-bottom: ${index < incompletePortals.length - 1 ? '1px solid #bae6fd' : 'none'};">
              <div style="display: flex; align-items: center;">
                <span style="color: #0369a1; font-weight: bold; margin-right: 8px;">•</span>
                <span style="font-weight: 500;">${portal.name}</span>
                <span style="margin-left: auto; font-size: 12px; color: #0369a1; background: #bae6fd; padding: 2px 8px; border-radius: 12px;">
                  ${portal.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              ${portal.notes && portal.notes.length > 0 ? `
                <div style="font-size: 12px; color: #0369a1; margin-left: 16px; margin-top: 4px;">
                  Notes: ${portal.notes[portal.notes.length - 1]?.content || 'No notes'}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div style="background-color: #f0f9ff; padding: 15px; margin: 20px 0; border-left: 4px solid #0ea5e9; border-radius: 4px;">
          <p style="font-size: 14px; color: #0369a1; margin: 0;">
            <strong>Action Required:</strong> Please review and complete these outstanding items in the 
            <a href="${process.env.NEXTAUTH_URL}/management-portal/onboarding" style="color: #0ea5e9; text-decoration: underline;">
              Employee Onboarding Portal
            </a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af;">
            NSN Revenue Resources - Training Department<br>
            This is an automated alert generated by the Employee Onboarding System<br>
            Employee ID: ${employee.id} | Alert Date: ${new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  `;
}