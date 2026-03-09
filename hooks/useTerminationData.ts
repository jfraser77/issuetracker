"use client";

/**
 * useTerminationData
 *
 * Encapsulates all data-fetching and mutation logic for the terminations page:
 *   - fetching the termination list (with optional filter)
 *   - creating a new termination
 *   - updating a termination field(s)
 *   - marking equipment as returned
 *   - archiving a termination
 *   - checking overdue status
 *
 * Returns stable callbacks so consumers don't need to manage fetch state
 * or worry about the `isExpanded` UI field being lost on re-fetch.
 */

import { useState, useCallback, useEffect } from "react";
import type { Termination, TerminationFormState } from "@/types/termination";
import { isTerminationOverdue, daysRemainingUntilOverdue } from "@/types/termination";
import { DEFAULT_CHECKLIST } from "@/lib/terminationConstants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface UseTerminationDataOptions {
  /** Optional filter passed in the query string: "overdue" | "archived" */
  filter: string | null;
}

interface UseTerminationDataReturn {
  terminations: Termination[];
  loading: boolean;
  currentUser: User | null;
  itUsers: User[];
  /** Re-fetches the list (collapses all rows — use sparingly) */
  fetchTerminations: () => Promise<void>;
  createTermination: (
    form: TerminationFormState,
    initiatedBy?: string
  ) => Promise<boolean>;
  updateTermination: (
    id: number,
    updates: Partial<Termination>
  ) => Promise<void>;
  markEquipmentReturned: (
    id: number,
    trackingNumber: string,
    equipmentDisposition: string,
    completedByUserId?: number
  ) => Promise<void>;
  archiveTermination: (id: number) => Promise<void>;
  toggleExpanded: (id: number) => void;
  checkOverdueTerminations: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTerminationData({
  filter,
}: UseTerminationDataOptions): UseTerminationDataReturn {
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [itUsers, setItUsers] = useState<User[]>([]);

  // ---- helpers ----

  /** Merges server data with client-only `isExpanded` flags. */
  function mergeWithExpanded(
    incoming: Termination[],
    existing: Termination[]
  ): Termination[] {
    const expandedMap = new Map(existing.map((t) => [t.id, t.isExpanded]));
    return incoming.map((t) => ({
      ...t,
      isOverdue: isTerminationOverdue(t.terminationDate, t.status),
      daysRemaining: daysRemainingUntilOverdue(t.terminationDate, t.status),
      isExpanded: expandedMap.get(t.id) ?? false,
      checklist:
        t.checklist && t.checklist.length > 0 ? t.checklist : [...DEFAULT_CHECKLIST],
    }));
  }

  // ---- fetches ----

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user");
      if (res.ok) setCurrentUser(await res.json());
    } catch {
      // Non-fatal — user will just be null
    }
  }, []);

  const fetchITUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?role=IT,Admin");
      if (res.ok) setItUsers(await res.json());
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchTerminations = useCallback(async () => {
    try {
      const url = filter
        ? `/api/terminations?filter=${filter}`
        : "/api/terminations";
      const res = await fetch(url);
      if (res.ok) {
        const data: Termination[] = await res.json();
        setTerminations((prev) => mergeWithExpanded(data, prev));
      } else {
        console.error("Failed to fetch terminations:", res.status);
      }
    } catch (error) {
      console.error("Error fetching terminations:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- mutations ----

  /**
   * Creates a new termination.
   * Returns `true` on success so callers can reset their form state.
   */
  const createTermination = useCallback(
    async (form: TerminationFormState, initiatedBy?: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/terminations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            initiatedBy,
            checklist: DEFAULT_CHECKLIST,
            jobTitle: "To be determined",
            department: "To be determined",
            terminationReason: "Termination process initiated",
          }),
        });

        if (res.ok) {
          await fetchTerminations();
          return true;
        }

        const err = await res.json();
        alert(`Failed to initiate termination: ${err.error ?? "Unknown error"}`);
        return false;
      } catch (error) {
        console.error("Error creating termination:", error);
        alert("Failed to initiate termination process.");
        return false;
      }
    },
    [fetchTerminations]
  );

  /**
   * Updates one or more fields of a termination.
   * On success it patches local state in-place, preserving `isExpanded`.
   * On failure it falls back to a full re-fetch.
   */
  const updateTermination = useCallback(
    async (id: number, updates: Partial<Termination>) => {
      try {
        const res = await fetch(`/api/terminations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(`Update failed (${res.status}):`, text);
          throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        if (!result.success) throw new Error(result.error ?? "Update failed");

        if (result.termination) {
          setTerminations((prev) =>
            prev.map((t) =>
              t.id === id
                ? { ...result.termination, isExpanded: t.isExpanded }
                : t
            )
          );
        }
      } catch (error) {
        console.error("Error updating termination:", error);
        alert("Failed to update termination. Please try again.");
        await fetchTerminations();
      }
    },
    [fetchTerminations]
  );

  const markEquipmentReturned = useCallback(
    async (
      id: number,
      trackingNumber: string,
      equipmentDisposition: string,
      completedByUserId?: number
    ) => {
      try {
        const res = await fetch(`/api/terminations/${id}/return`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumber, equipmentDisposition, completedByUserId }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to mark equipment returned");
        }

        const { termination: updated } = await res.json();
        setTerminations((prev) =>
          prev.map((t) =>
            t.id === id ? { ...updated, isExpanded: t.isExpanded } : t
          )
        );

        if (equipmentDisposition === "return_to_pool" && completedByUserId) {
          fetch("/api/it-assets/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: completedByUserId, change: 1 }),
          }).catch((err) =>
            console.error("Error updating IT Staff inventory:", err)
          );
        }

        alert("Equipment return recorded successfully and inventory updated.");
      } catch (error) {
        console.error("Error marking equipment returned:", error);
        alert(
          `Failed to record equipment return: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        await fetchTerminations();
      }
    },
    [fetchTerminations]
  );

  const archiveTermination = useCallback(
    async (id: number) => {
      try {
        const res = await fetch(`/api/terminations/${id}/archive`, {
          method: "POST",
        });

        if (res.ok) {
          await fetchTerminations();
          alert("Termination archived successfully!");
        } else {
          const err = await res.json();
          alert(`Failed to archive termination: ${err.error}`);
        }
      } catch (error) {
        console.error("Error archiving termination:", error);
      }
    },
    [fetchTerminations]
  );

  const checkOverdueTerminations = useCallback(async () => {
    try {
      await fetch("/api/terminations/check-overdue", { method: "POST" });
    } catch (error) {
      console.error("Error checking overdue terminations:", error);
    }
  }, []);

  // ---- UI helpers ----

  const toggleExpanded = useCallback((id: number) => {
    setTerminations((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExpanded: !t.isExpanded } : t))
    );
  }, []);

  // ---- initial load ----

  useEffect(() => {
    fetchCurrentUser();
    fetchTerminations();
    fetchITUsers();

    const interval = setInterval(
      checkOverdueTerminations,
      24 * 60 * 60 * 1000
    );
    return () => clearInterval(interval);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    terminations,
    loading,
    currentUser,
    itUsers,
    fetchTerminations,
    createTermination,
    updateTermination,
    markEquipmentReturned,
    archiveTermination,
    toggleExpanded,
    checkOverdueTerminations,
  };
}
