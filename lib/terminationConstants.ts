/**
 * Single source of truth for shared termination constants.
 * Import from here instead of duplicating across API routes and components.
 */

import type { ChecklistItem } from "@/types/termination";

// ---------------------------------------------------------------------------
// HR notification recipients
// ---------------------------------------------------------------------------

export const HR_EMAILS: string[] = [
  "aogden@uspi.com",
  "aevans@nsnrevenue.com",
  "anwaters@uspi.com",
  "eolson@nsnrevenue.com",
];

// ---------------------------------------------------------------------------
// Default IT offboarding checklist
// ---------------------------------------------------------------------------

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // --- Active Directory NSN-Tampa-DC ---
  {
    id: "1",
    category: "Active Directory",
    description: "Disable Windows/AD account",
    completed: false,
  },
  {
    id: "2",
    category: "Active Directory",
    description:
      'Enter "disabled" and your initials and date in the Description field',
    completed: false,
  },
  {
    id: "3",
    category: "Active Directory",
    description:
      "Run Powershell script: Start-ADSyncSyncCycle -PolicyType Delta",
    completed: false,
  },
  // --- SonicWall ---
  {
    id: "4",
    category: "SonicWall",
    description:
      "Delete user: System Configuration > Authentication Servers > TOTP Service > Users",
    completed: false,
  },
  // --- Computer Inventory ---
  {
    id: "5",
    category: "Computer Inventory",
    description:
      "Enter the computer information into the IT Mgmt Portal > Employee Terminations > Managed Terminations > Initiate Termination",
    completed: false,
  },
  {
    id: "6",
    category: "Computer Inventory",
    description: "Automate app – right-click > Retire > Confirm Retire",
    completed: false,
  },
  // --- Microsoft 365 Email Account ---
  {
    id: "7",
    category: "Microsoft 365",
    description: "Active Users > (NOTE: do not remove license for 30 days)",
    completed: false,
  },
  {
    id: "8",
    category: "Microsoft 365",
    description: "Account tab > Groups > Manage Groups – remove all groups",
    completed: false,
  },
  // --- Delete Software Access ---
  {
    id: "9",
    category: "Delete Software Access",
    description: "Navigator",
    completed: false,
  },
  {
    id: "10",
    category: "Delete Software Access",
    description: "SourceMed Analytics USPI",
    completed: false,
  },
  {
    id: "11",
    category: "Delete Software Access",
    description: "SourceMed Analytics NSN",
    completed: false,
  },
  {
    id: "12",
    category: "Delete Software Access",
    description: "Adobe – permanently delete",
    completed: false,
  },
  {
    id: "13",
    category: "Delete Software Access",
    description:
      "Viirtue > Numbers and Devices. Change drop down to Available Number",
    completed: false,
  },
  {
    id: "14",
    category: "Delete Software Access",
    description: "Phone #",
    completed: false,
  },
  {
    id: "15",
    category: "Delete Software Access",
    description: "Viirtue Fax > Toolbox > Users > ... Delete Users",
    completed: false,
  },
  {
    id: "16",
    category: "Delete Software Access",
    description: "Fax #",
    completed: false,
  },
  // --- Equipment Return (checked off once equipment is received) ---
  {
    id: "17",
    category: "Equipment Return",
    description: "ScreenConnect and remove the computer from the domain",
    completed: false,
  },
  {
    id: "18",
    category: "Equipment Return",
    description: "ScreenConnect - General button > Machine Product/Serial#",
    completed: false,
  },
];
