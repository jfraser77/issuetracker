"use client";

/**
 * useChecklist
 *
 * Manages checklist state and API persistence for a single termination.
 * Extracted from the inline ChecklistSection component so it can live at
 * module level without causing remounts on every parent render.
 */

import { useCallback } from "react";
import type { ChecklistItem, Termination } from "@/types/termination";

interface UseChecklistOptions {
  termination: Termination;
  currentUserName?: string;
  onUpdate: (id: number, updates: Partial<Termination>) => Promise<void>;
}

interface UseChecklistReturn {
  /** Toggle a single item's completed state. */
  toggleItem: (itemId: string, checked: boolean) => void;
  /** Mark every item in the checklist as complete. */
  checkAll: () => void;
  /** Mark every item in the checklist as incomplete. */
  uncheckAll: () => void;
  /** Mark all items in a specific category as complete. */
  checkCategory: (category: string) => void;
  /** Mark all items in a specific category as incomplete. */
  uncheckCategory: (category: string) => void;
  /** Append a new item and persist it. */
  addItem: (category: string, description: string) => Promise<void>;
  /** Remove an item and persist the change. */
  removeItem: (itemId: string) => void;
  /** Group the checklist items by category. */
  groupByCategory: (items: ChecklistItem[]) => Record<string, ChecklistItem[]>;
}

export function useChecklist({
  termination,
  currentUserName,
  onUpdate,
}: UseChecklistOptions): UseChecklistReturn {
  const now = () => new Date().toISOString();
  const checklist = termination.checklist ?? [];

  /** Persist a mutated checklist and update parent state. */
  const persist = useCallback(
    (updated: ChecklistItem[]) => {
      onUpdate(termination.id, { checklist: updated });
    },
    [termination.id, onUpdate]
  );

  const toggleItem = useCallback(
    (itemId: string, checked: boolean) => {
      const updated = checklist.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: checked,
              completedBy: checked ? currentUserName : undefined,
              completedDate: checked ? now() : undefined,
            }
          : item
      );
      persist(updated);
    },
    [checklist, currentUserName, persist] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const checkAll = useCallback(() => {
    const updated = checklist.map((item) => ({
      ...item,
      completed: true,
      completedBy: currentUserName,
      completedDate: now(),
    }));
    persist(updated);
  }, [checklist, currentUserName, persist]); // eslint-disable-line react-hooks/exhaustive-deps

  const uncheckAll = useCallback(() => {
    const updated = checklist.map((item) => ({
      ...item,
      completed: false,
      completedBy: undefined,
      completedDate: undefined,
    }));
    persist(updated);
  }, [checklist, persist]);

  const checkCategory = useCallback(
    (category: string) => {
      const updated = checklist.map((item) =>
        item.category === category
          ? {
              ...item,
              completed: true,
              completedBy: currentUserName,
              completedDate: now(),
            }
          : item
      );
      persist(updated);
    },
    [checklist, currentUserName, persist] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const uncheckCategory = useCallback(
    (category: string) => {
      const updated = checklist.map((item) =>
        item.category === category
          ? { ...item, completed: false, completedBy: undefined, completedDate: undefined }
          : item
      );
      persist(updated);
    },
    [checklist, persist]
  );

  const addItem = useCallback(
    async (category: string, description: string) => {
      const newItem: ChecklistItem = {
        id: `custom-${Date.now()}`,
        category: category.trim(),
        description: description.trim(),
        completed: false,
      };
      await onUpdate(termination.id, {
        checklist: [...checklist, newItem],
      });
    },
    [checklist, termination.id, onUpdate]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const updated = checklist.filter((item) => item.id !== itemId);
      persist(updated);
    },
    [checklist, persist]
  );

  const groupByCategory = useCallback(
    (items: ChecklistItem[]): Record<string, ChecklistItem[]> => {
      return items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
    },
    []
  );

  return {
    toggleItem,
    checkAll,
    uncheckAll,
    checkCategory,
    uncheckCategory,
    addItem,
    removeItem,
    groupByCategory,
  };
}
