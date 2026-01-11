/**
 * Bulk Operations Manager
 * Manages bulk selection, editing, and deletion of table rows.
 * Uses Svelte 5 runes for reactive state management.
 */

import type { SavedObject, Template } from '$lib/types.js';

/**
 * Creates and manages bulk operations state and actions.
 */
export function createBulkOperationsManager() {
  // Selection state
  let selectedRows = $state<Set<string>>(new Set());
  let lastSelectedIndex = $state<number>(-1);

  // Bulk edit modal state
  let showBulkEditModal = $state(false);
  let bulkEditField = $state<string>('');
  let bulkEditValue = $state<any>('');

  /**
   * Handle row selection with shift-click for range selection
   */
  function handleRowSelection(
    objectId: string,
    index: number,
    event: MouseEvent,
    filteredObjects: SavedObject[]
  ): void {
    if (event.shiftKey && lastSelectedIndex !== -1) {
      // Shift-click: select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelection = new Set(selectedRows);

      for (let i = start; i <= end; i++) {
        if (filteredObjects[i]) {
          newSelection.add(filteredObjects[i].id);
        }
      }
      selectedRows = newSelection;
    } else {
      // Normal click: toggle single selection
      const newSelection = new Set(selectedRows);
      if (newSelection.has(objectId)) {
        newSelection.delete(objectId);
      } else {
        newSelection.add(objectId);
      }
      selectedRows = newSelection;
      lastSelectedIndex = index;
    }
  }

  /**
   * Toggle select all rows
   */
  function toggleSelectAll(filteredObjects: SavedObject[]): void {
    if (selectedRows.size === filteredObjects.length) {
      selectedRows = new Set();
    } else {
      selectedRows = new Set(filteredObjects.map(obj => obj.id));
    }
  }

  /**
   * Open bulk edit modal
   */
  function openBulkEditModal(template?: Template): void {
    if (selectedRows.size === 0) return;
    if (!template) return;

    // Default to first visible field
    const firstField = template.fields.find(f => f.visible);
    if (firstField) {
      bulkEditField = firstField.key;
    }
    showBulkEditModal = true;
  }

  /**
   * Close bulk edit modal
   */
  function closeBulkEditModal(): void {
    showBulkEditModal = false;
    bulkEditField = '';
    bulkEditValue = '';
  }

  /**
   * Delete selected rows
   */
  async function deleteSelected(
    filteredObjects: SavedObject[],
    onUpdate: (updatedObjects: SavedObject[]) => void
  ): Promise<void> {
    if (selectedRows.size === 0) return;

    const count = selectedRows.size;
    const confirmed = confirm(
      `Czy na pewno chcesz usunąć ${count} zaznaczonych wierszy? Ta operacja jest nieodwracalna.`
    );

    if (!confirmed) return;

    try {
      const selectedIds = Array.from(selectedRows);
      let successCount = 0;
      let errorCount = 0;

      // Delete each object
      for (const id of selectedIds) {
        try {
          const response = await fetch(`/api/objects/${id}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      // Update the filtered objects list
      const updatedObjects = filteredObjects.filter(obj => !selectedIds.includes(obj.id));
      onUpdate(updatedObjects);
      selectedRows = new Set();

      if (errorCount > 0) {
        alert(`Usunięto ${successCount} wierszy. Błędy: ${errorCount}`);
      } else {
        alert(`Pomyślnie usunięto ${successCount} wierszy`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Wystąpił błąd podczas usuwania wierszy');
    }
  }

  /**
   * Apply bulk edit to selected rows
   */
  async function applyBulkEdit(
    filteredObjects: SavedObject[],
    onUpdate: (updatedObjects: SavedObject[]) => void
  ): Promise<void> {
    if (!bulkEditField || selectedRows.size === 0) return;

    try {
      const selectedIds = Array.from(selectedRows);

      // Send bulk update request
      const response = await fetch('/api/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectIds: selectedIds,
          fieldKey: bulkEditField,
          value: bulkEditValue
        })
      });

      if (response.ok) {
        // Update local state
        const updatedObjects = filteredObjects.map(obj => {
          if (selectedIds.includes(obj.id)) {
            return {
              ...obj,
              data: {
                ...obj.data,
                [bulkEditField]: bulkEditValue
              }
            };
          }
          return obj;
        });

        onUpdate(updatedObjects);
        selectedRows = new Set();
        closeBulkEditModal();
        alert(`Zaktualizowano ${selectedIds.length} wierszy`);
      } else {
        alert('Błąd podczas aktualizacji');
      }
    } catch (error) {
      console.error('Bulk edit error:', error);
      alert('Błąd podczas aktualizacji');
    }
  }

  /**
   * Clear all selections
   */
  function clearSelection(): void {
    selectedRows = new Set();
    lastSelectedIndex = -1;
  }

  // Return reactive state and methods
  return {
    // Selection state
    get selectedRows() { return selectedRows; },
    get lastSelectedIndex() { return lastSelectedIndex; },

    // Modal state
    get showBulkEditModal() { return showBulkEditModal; },
    get bulkEditField() { return bulkEditField; },
    set bulkEditField(value: string) { bulkEditField = value; },
    get bulkEditValue() { return bulkEditValue; },
    set bulkEditValue(value: any) { bulkEditValue = value; },

    // Methods
    handleRowSelection,
    toggleSelectAll,
    openBulkEditModal,
    closeBulkEditModal,
    deleteSelected,
    applyBulkEdit,
    clearSelection
  };
}

export type BulkOperationsManager = ReturnType<typeof createBulkOperationsManager>;
