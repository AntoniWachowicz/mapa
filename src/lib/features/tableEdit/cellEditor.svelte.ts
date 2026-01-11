/**
 * Cell Editor Manager
 * Manages inline cell editing state and operations for table cells.
 * Uses Svelte 5 runes for reactive state management.
 */

import type { SavedObject } from '$lib/types.js';

/**
 * Creates and manages cell editing state and actions.
 */
export function createCellEditor() {
  // Cell editing state
  let editingCell = $state<{objectId: string, fieldKey: string} | null>(null);
  let editingValue = $state<any>(null);
  let originalValue = $state<any>(null);

  /**
   * Start editing a cell
   */
  function startEditing(objectId: string, fieldKey: string, currentValue: any): void {
    editingCell = { objectId, fieldKey };
    // Deep copy for objects and arrays to avoid mutating original data
    if (typeof currentValue === 'object' && currentValue !== null) {
      editingValue = JSON.parse(JSON.stringify(currentValue));
      originalValue = JSON.parse(JSON.stringify(currentValue));
    } else {
      editingValue = currentValue;
      originalValue = currentValue;
    }
  }

  /**
   * Cancel editing and restore original value
   */
  function cancelEdit(): void {
    editingCell = null;
    editingValue = null;
    originalValue = null;
  }

  /**
   * Save edited cell value
   */
  async function saveEdit(
    filteredObjects: SavedObject[],
    onUpdate: (updatedObjects: SavedObject[]) => void
  ): Promise<void> {
    if (!editingCell) return;

    try {
      const response = await fetch(`/api/objects/${editingCell.objectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldKey: editingCell.fieldKey,
          value: editingValue
        })
      });

      if (response.ok) {
        // Update local state
        const currentEditingCell = editingCell;
        if (currentEditingCell) {
          const objIndex = filteredObjects.findIndex(obj => obj.id === currentEditingCell.objectId);
          if (objIndex !== -1) {
            filteredObjects[objIndex].data[currentEditingCell.fieldKey] = editingValue;
            onUpdate([...filteredObjects]);
          }
        }
        cancelEdit();
      } else {
        alert('Błąd podczas zapisywania zmian');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Błąd podczas zapisywania zmian');
    }
  }

  /**
   * Handle keyboard shortcuts (Ctrl+Enter to save)
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      // Note: saveEdit needs to be called with proper arguments from the parent
      // This just prevents default behavior
    }
  }

  /**
   * Focus action for inputs (auto-select text)
   */
  function focus(element: HTMLElement): void {
    element.focus();
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.select();
    }
  }

  // Return reactive state and methods
  return {
    // State
    get editingCell() { return editingCell; },
    get editingValue() { return editingValue; },
    set editingValue(value: any) { editingValue = value; },
    get originalValue() { return originalValue; },

    // Methods
    startEditing,
    cancelEdit,
    saveEdit,
    handleKeydown,
    focus
  };
}

export type CellEditor = ReturnType<typeof createCellEditor>;
