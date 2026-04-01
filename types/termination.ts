/**
 * Shared TypeScript types for the termination management system.
 * Used by both API routes (server) and React components (client).
 */

// ---------------------------------------------------------------------------
// Primitive unions
// ---------------------------------------------------------------------------

export type EquipmentDisposition =
  | "return_to_pool"
  | "retire"
  | "pending_assessment"
  | "malicious_damage";

export type TerminationStatus =
  | "pending"
  | "equipment_returned"
  | "archived"
  | "overdue";

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedDate?: string;
  notes?: string;
}

export interface LicensesRemoved {
  automateLicense: boolean;
  screenConnect: boolean;
  office365: boolean;
  adobeAcrobat: boolean;
  phone: boolean;
  fax: boolean;
  additionalRemovals?: string;
}

export interface PortalUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Full termination record as returned from the API.
 * `isExpanded` is a UI-only field added by the frontend.
 */
export interface Termination {
  id: number;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  /** ISO date string: YYYY-MM-DD */
  terminationDate: string;
  /** ISO date string: YYYY-MM-DD. Custom equipment return deadline set at creation. */
  equipmentReturnDeadline?: string;
  terminationReason: string;
  initiatedBy: string;
  status: TerminationStatus;
  trackingNumber?: string;
  equipmentDisposition: EquipmentDisposition;
  /** Calculated: days until return deadline. 0 when overdue. */
  daysRemaining: number;
  /** Calculated: true when status=pending and past the return deadline */
  isOverdue: boolean;
  licensesRemoved: LicensesRemoved;
  checklist?: ChecklistItem[];
  completedByUserId?: number;
  completedByUser?: PortalUser;
  computerSerial?: string;
  computerModel?: string;
  timestamp: string;
  /** UI-only — not persisted to DB */
  isExpanded?: boolean;
}

// ---------------------------------------------------------------------------
// API payload types
// ---------------------------------------------------------------------------

export interface CreateTerminationPayload {
  employeeName: string;
  employeeEmail: string;
  terminationDate: string;
  /** Custom equipment return deadline. Defaults to terminationDate + 14 days. */
  equipmentReturnDeadline?: string;
  initiatedBy?: string;
  checklist?: ChecklistItem[];
  /** Defaults to "To be determined" */
  jobTitle?: string;
  /** Defaults to "To be determined" */
  department?: string;
  /** Defaults to "Termination process initiated" */
  terminationReason?: string;
}

export interface MarkEquipmentReturnedPayload {
  trackingNumber: string;
  equipmentDisposition: EquipmentDisposition;
  completedByUserId?: number;
}

export interface UpdateTerminationPayload {
  employeeName?: string;
  employeeEmail?: string;
  jobTitle?: string;
  department?: string;
  terminationDate?: string;
  terminationReason?: string;
  status?: TerminationStatus;
  trackingNumber?: string;
  equipmentDisposition?: EquipmentDisposition;
  completedByUserId?: number | null;
  computerSerial?: string;
  computerModel?: string;
  checklist?: ChecklistItem[];
}

// ---------------------------------------------------------------------------
// Form state types (frontend only)
// ---------------------------------------------------------------------------

export interface TerminationFormState {
  employeeName: string;
  employeeEmail: string;
  terminationDate: string;
  /** ISO date string: YYYY-MM-DD. Defaults to terminationDate + 14 days if omitted. */
  equipmentReturnDeadline: string;
}

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

export const EMPTY_TERMINATION_FORM: TerminationFormState = {
  employeeName: "",
  employeeEmail: "",
  terminationDate: new Date().toISOString().split("T")[0],
  equipmentReturnDeadline: defaultDeadline(),
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the termination is overdue (pending + >14 days elapsed).
 * Use only when equipmentReturnDeadline is not available from the API response.
 */
export function isTerminationOverdue(
  terminationDate: string,
  status: TerminationStatus
): boolean {
  if (status !== "pending") return false;
  const daysSince = Math.floor(
    (Date.now() - new Date(terminationDate).getTime()) / 86_400_000
  );
  return daysSince > 14;
}

/**
 * Returns the number of days remaining before the 14-day return deadline.
 * Returns 0 when overdue or when status is not pending.
 * Use only when equipmentReturnDeadline is not available from the API response.
 */
export function daysRemainingUntilOverdue(
  terminationDate: string,
  status: TerminationStatus
): number {
  if (status !== "pending") return 0;
  const daysSince = Math.floor(
    (Date.now() - new Date(terminationDate).getTime()) / 86_400_000
  );
  return Math.max(0, 14 - daysSince);
}

/**
 * Returns checklist completion as { completed, total, percent }.
 */
export function getChecklistCompletion(checklist: ChecklistItem[] = []): {
  completed: number;
  total: number;
  percent: number;
} {
  const completed = checklist.filter((i) => i.completed).length;
  const total = checklist.length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Returns true when all archive requirements are satisfied.
 */
export function canArchive(termination: Termination): boolean {
  if (termination.status !== "equipment_returned") return false;
  if (!termination.trackingNumber) return false;
  if (!termination.completedByUserId) return false;
  return getChecklistCompletion(termination.checklist).percent === 100;
}
