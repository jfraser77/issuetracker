"use client";

/**
 * ChecklistSection
 *
 * Module-level component (NOT defined inside a parent component) so React
 * never remounts it on parent re-renders. Defining it inside the parent was
 * causing `localNewItem` state to reset every time the parent re-rendered.
 */

import { useState, ChangeEvent } from "react";
import {
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useChecklist } from "@/hooks/useChecklist";
import type { Termination } from "@/types/termination";
import { getChecklistCompletion } from "@/types/termination";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistSectionProps {
  termination: Termination;
  currentUserName?: string;
  itUsers: { id: number; name: string; role: string }[];
  onUpdate: (id: number, updates: Partial<Termination>) => Promise<void>;
  onCompletedByChange: (terminationId: number, value: string) => void;
  onComputerSerialChange: (terminationId: number, value: string) => void;
  onComputerModelChange: (terminationId: number, value: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChecklistSection({
  termination,
  currentUserName,
  itUsers,
  onUpdate,
  onCompletedByChange,
  onComputerSerialChange,
  onComputerModelChange,
}: ChecklistSectionProps) {
  const [newItem, setNewItem] = useState({ category: "", description: "" });

  const {
    toggleItem,
    checkAll,
    uncheckAll,
    checkCategory,
    uncheckCategory,
    addItem,
    removeItem,
    groupByCategory,
  } = useChecklist({ termination, currentUserName, onUpdate });

  const handleAddItem = async () => {
    if (!newItem.category.trim() || !newItem.description.trim()) {
      alert("Please enter both category and description");
      return;
    }
    await addItem(newItem.category, newItem.description);
    setNewItem({ category: "", description: "" });
  };

  const { completed, total, percent } = getChecklistCompletion(
    termination.checklist
  );

  const grouped = groupByCategory(termination.checklist ?? []);

  return (
    <div className="border-t pt-4">
      {/* Completed By */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Completed By
        </label>
        <select
          value={termination.completedByUserId ?? ""}
          onChange={(e) => onCompletedByChange(termination.id, e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select IT Staff</option>
          {itUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
      </div>

      <h3 className="font-medium text-gray-900 mb-3">IT Access Removal Checklist</h3>

      {/* Computer Info */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Computer Serial #
          </label>
          <input
            type="text"
            value={termination.computerSerial ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onComputerSerialChange(termination.id, e.target.value)
            }
            placeholder="Enter serial number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Computer Model
          </label>
          <input
            type="text"
            value={termination.computerModel ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onComputerModelChange(termination.id, e.target.value)
            }
            placeholder="Enter computer model"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Global Check/Uncheck */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={checkAll}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Check All
        </button>
        <button
          onClick={uncheckAll}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <MinusIcon className="h-4 w-4 mr-1" />
          Uncheck All
        </button>
      </div>

      {/* Checklist by Category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800">{category}</h4>
            <div className="flex gap-1">
              <button
                onClick={() => checkCategory(category)}
                className="text-green-600 hover:text-green-800 text-xs flex items-center"
              >
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Check All
              </button>
              <button
                onClick={() => uncheckCategory(category)}
                className="text-gray-600 hover:text-gray-800 text-xs flex items-center"
              >
                <MinusIcon className="h-3 w-3 mr-1" />
                Uncheck All
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start space-x-3 p-2 bg-gray-50 rounded"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => toggleItem(item.id, e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label
                    className={`text-sm ${
                      item.completed ? "text-gray-500 line-through" : "text-gray-700"
                    }`}
                  >
                    {item.description}
                  </label>
                  {item.completed && item.completedBy && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed by {item.completedBy} on{" "}
                      {item.completedDate
                        ? new Date(item.completedDate).toLocaleDateString()
                        : "unknown date"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove item"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Progress */}
      {total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">Checklist Progress</span>
            <span className="text-sm text-blue-700">
              {completed} of {total} completed
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Add New Item */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-800 mb-2">Add New Checklist Item</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
          <input
            type="text"
            placeholder="Category (e.g., Software Access)"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <button
          onClick={handleAddItem}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Item
        </button>
      </div>
    </div>
  );
}
