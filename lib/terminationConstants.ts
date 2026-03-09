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
    description: "Remove all groups from Member Of tab",
    completed: false,
  },
  {
    id: "4",
    category: "Active Directory",
    description:
      "Run Powershell script: Start-ADSyncSyncCycle -PolicyType Delta",
    completed: false,
  },
  {
    id: "5",
    category: "Active Directory",
    description: "ScreenConnect and remove the computer from the domain",
    completed: false,
  },
  {
    id: "6",
    category: "Active Directory",
    description: "ScreenConnect - General button > Machine Product/Serial#",
    completed: false,
  },
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
  {
    id: "9",
    category: "Software Access",
    description: "Navigator",
    completed: false,
  },
  {
    id: "10",
    category: "Software Access",
    description: "SourceMed Analytics USPI",
    completed: false,
  },
  {
    id: "11",
    category: "Software Access",
    description: "SourceMed Analytics NSN",
    completed: false,
  },
  {
    id: "12",
    category: "Software Access",
    description: "SonicWall VPN Connect",
    completed: false,
  },
  {
    id: "13",
    category: "Software Access",
    description:
      "Viirtue – Numbers and Devices. Change drop down to Available Number",
    completed: false,
  },
  {
    id: "14",
    category: "Phone/Fax",
    description: "Phone #",
    completed: false,
  },
  {
    id: "15",
    category: "Phone/Fax",
    description: "Fax #",
    completed: false,
  },
  {
    id: "16",
    category: "Software Access",
    description: "Adobe – permanently delete",
    completed: false,
  },
  {
    id: "17",
    category: "Software Access",
    description:
      "Set Ticket type = Access > Termination. Then Angie gets a notice and will disable Availity and Waystar",
    completed: false,
  },
  {
    id: "18",
    category: "Software Access",
    description: "Automate - removed automate license",
    completed: false,
  },
];
