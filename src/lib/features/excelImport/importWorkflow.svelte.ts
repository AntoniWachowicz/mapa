/**
 * Excel Import Workflow Manager
 * Manages the multi-step Excel import process with header selection and column mapping.
 * Uses Svelte 5 runes for reactive state management.
 */

import type { Template } from '$lib/types.js';
import {
  buildFieldTypeMap,
  processExcelHeaders,
  mapExcelRowToObject,
  buildImportPayload
} from './index.js';

/**
 * Creates and manages Excel import workflow state and actions.
 */
export function createImportWorkflow() {
  // Modal state
  let showHeaderSelectionModal = $state(false);
  let showMappingModal = $state(false);

  // Excel data state
  let excelRawData = $state<any[][]>([]);
  let selectedHeaderRow = $state(0);
  let excelHeaders = $state<string[]>([]);
  let excelSampleData = $state<Record<string, any>[]>([]);
  let excelAllData = $state<any[]>([]);
  let columnMapping = $state<Record<string, string>>({});

  // Import progress
  let importInProgress = $state(false);

  // New field creation
  let showNewFieldModal = $state(false);
  let newFieldForColumn = $state<string>('');

  /**
   * Handle Excel file upload and parsing
   */
  async function handleExcelImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 1: Parse the Excel file
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        alert('Błąd podczas importu pliku Excel');
        input.value = '';
        return;
      }

      const result = await response.json();
      if (!result.success) {
        alert(`Błąd importu: ${result.error || 'Nieznany błąd'}`);
        input.value = '';
        return;
      }

      // Step 2: Store raw data and show header selection modal
      if (!result.rawData || result.rawData.length === 0) {
        alert('Plik Excel nie zawiera danych do importu');
        input.value = '';
        return;
      }

      excelRawData = result.rawData;
      selectedHeaderRow = 0; // Default to first row
      showHeaderSelectionModal = true;

    } catch (error) {
      console.error('Excel import error:', error);
      alert('Błąd podczas importu pliku Excel');
    }

    // Reset input
    input.value = '';
  }

  /**
   * Close header selection modal
   */
  function closeHeaderSelectionModal(): void {
    showHeaderSelectionModal = false;
    excelRawData = [];
    selectedHeaderRow = 0;
  }

  /**
   * Confirm header selection and proceed to column mapping
   */
  function confirmHeaderSelection(): void {
    if (excelRawData.length === 0 || selectedHeaderRow >= excelRawData.length) {
      alert('Nieprawidłowy wybór wiersza nagłówka');
      return;
    }

    // Use extracted header processing function
    const processed = processExcelHeaders(excelRawData, selectedHeaderRow);
    excelHeaders = processed.headers;
    excelAllData = processed.allData;
    excelSampleData = processed.sampleData;

    // Initialize column mapping
    columnMapping = {};

    // Close header selection and show mapping modal
    showHeaderSelectionModal = false;
    showMappingModal = true;
  }

  /**
   * Open new field creation modal
   */
  function openNewFieldModal(columnName: string): void {
    newFieldForColumn = columnName;
    showNewFieldModal = true;
  }

  /**
   * Close new field creation modal
   */
  function closeNewFieldModal(): void {
    showNewFieldModal = false;
    newFieldForColumn = '';
  }

  /**
   * Handle field created event
   */
  function handleFieldCreated(fieldKey: string, onTemplateUpdate: (updater: (template: Template) => Template) => void): void {
    // Map the column to the new field
    columnMapping = { ...columnMapping, [newFieldForColumn]: fieldKey };

    // Close modal
    closeNewFieldModal();
  }

  /**
   * Close column mapping modal
   */
  function closeMappingModal(): void {
    showMappingModal = false;
    excelHeaders = [];
    excelSampleData = [];
    excelAllData = [];
    columnMapping = {};
  }

  /**
   * Execute import with column mapping
   */
  async function executeImportWithMapping(template: Template): Promise<void> {
    if (!template) return;

    importInProgress = true;

    let savedCount = 0;
    let incompleteCount = 0;
    let errorCount = 0;

    // Create a map of field key to field type for type conversion
    const fieldTypeMap = buildFieldTypeMap(template);

    for (const row of excelAllData) {
      try {
        const originalData = row.originalData || {};

        // Map Excel row to schema fields with type conversion
        const mappedResult = mapExcelRowToObject(originalData, columnMapping, fieldTypeMap);

        // Build the save payload
        const payload = buildImportPayload(mappedResult);

        const saveResponse = await fetch('/api/objects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (saveResponse.ok) {
          savedCount++;
          if (payload.hasIncompleteData) {
            incompleteCount++;
          }
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    importInProgress = false;
    closeMappingModal();

    // Show result and refresh
    if (savedCount > 0) {
      let message = `Zaimportowano ${savedCount} rekordów`;
      if (incompleteCount > 0) {
        message += ` (${incompleteCount} bez współrzędnych - oznaczone jako niekompletne)`;
      }
      if (errorCount > 0) {
        message += ` (${errorCount} błędów)`;
      }
      alert(message);
      window.location.reload();
    } else {
      alert(`Nie udało się zaimportować żadnych rekordów. ${errorCount} błędów.`);
    }
  }

  // Return reactive state and methods
  return {
    // Modal state
    get showHeaderSelectionModal() { return showHeaderSelectionModal; },
    get showMappingModal() { return showMappingModal; },
    get showNewFieldModal() { return showNewFieldModal; },

    // Data state
    get excelRawData() { return excelRawData; },
    get selectedHeaderRow() { return selectedHeaderRow; },
    set selectedHeaderRow(value: number) { selectedHeaderRow = value; },
    get excelHeaders() { return excelHeaders; },
    get excelSampleData() { return excelSampleData; },
    get excelAllData() { return excelAllData; },
    get columnMapping() { return columnMapping; },
    set columnMapping(value: Record<string, string>) { columnMapping = value; },
    get newFieldForColumn() { return newFieldForColumn; },

    // Progress state
    get importInProgress() { return importInProgress; },

    // Methods
    handleExcelImport,
    closeHeaderSelectionModal,
    confirmHeaderSelection,
    openNewFieldModal,
    closeNewFieldModal,
    handleFieldCreated,
    closeMappingModal,
    executeImportWithMapping
  };
}

export type ImportWorkflow = ReturnType<typeof createImportWorkflow>;
