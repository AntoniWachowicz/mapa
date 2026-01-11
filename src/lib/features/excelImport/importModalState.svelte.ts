/**
 * Import Modal State Manager
 * Manages state for Excel import workflow in PinManager.
 * Uses Svelte 5 runes for reactive state management.
 */

/**
 * Creates and manages import modal state
 */
export function createImportModalState() {
  // Modal visibility
  let showImportModal = $state(false);
  let showColumnMappingModal = $state(false);
  let showCreateFieldModal = $state(false);

  // Import data
  let importedData = $state<any[]>([]);
  let selectedImportRows = $state<Set<number>>(new Set());

  // Import progress
  let isImporting = $state(false);
  let importProgress = $state({ current: 0, total: 0, message: '' });
  let importController = $state<AbortController | null>(null);

  // Excel file analysis
  let excelHeaders = $state<string[]>([]);
  let excelSampleData = $state<Record<string, any>[]>([]);
  let columnMapping = $state<Record<string, string>>({});
  let currentTempId = $state<string | null>(null);

  /**
   * Reset import modal state
   */
  function resetImportState(): void {
    showImportModal = false;
    importedData = [];
    selectedImportRows = new Set();
  }

  /**
   * Reset column mapping state
   */
  function resetColumnMappingState(): void {
    showColumnMappingModal = false;
    excelHeaders = [];
    excelSampleData = [];
    columnMapping = {};
    currentTempId = null;
  }

  /**
   * Reset all state
   */
  function resetAll(): void {
    resetImportState();
    resetColumnMappingState();
    showCreateFieldModal = false;
    isImporting = false;
    importProgress = { current: 0, total: 0, message: '' };
    importController = null;
  }

  /**
   * Toggle row selection
   */
  function toggleRowSelection(rowIndex: number): void {
    const newSelection = new Set(selectedImportRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    selectedImportRows = newSelection;
  }

  /**
   * Select all rows
   */
  function selectAllRows(): void {
    selectedImportRows = new Set(importedData.map((_, index) => index));
  }

  /**
   * Deselect all rows
   */
  function deselectAllRows(): void {
    selectedImportRows = new Set();
  }

  /**
   * Start an import operation with consistent state initialization
   */
  function startImportOperation(message: string): AbortController {
    isImporting = true;
    importProgress = { current: 0, total: 0, message };
    importController = new AbortController();
    return importController;
  }

  /**
   * Complete an import operation and clean up state
   */
  function completeImportOperation(): void {
    isImporting = false;
    importController = null;
  }

  /**
   * Update import progress
   */
  function updateImportProgress(current: number, total: number, message?: string): void {
    importProgress = {
      current,
      total,
      message: message || importProgress.message
    };
  }

  return {
    // Modal visibility
    get showImportModal() { return showImportModal; },
    set showImportModal(value: boolean) { showImportModal = value; },

    get showColumnMappingModal() { return showColumnMappingModal; },
    set showColumnMappingModal(value: boolean) { showColumnMappingModal = value; },

    get showCreateFieldModal() { return showCreateFieldModal; },
    set showCreateFieldModal(value: boolean) { showCreateFieldModal = value; },

    // Import data
    get importedData() { return importedData; },
    set importedData(value: any[]) { importedData = value; },

    get selectedImportRows() { return selectedImportRows; },
    set selectedImportRows(value: Set<number>) { selectedImportRows = value; },

    // Import progress
    get isImporting() { return isImporting; },
    set isImporting(value: boolean) { isImporting = value; },

    get importProgress() { return importProgress; },
    set importProgress(value: { current: number; total: number; message: string }) {
      importProgress = value;
    },

    get importController() { return importController; },
    set importController(value: AbortController | null) { importController = value; },

    // Excel file analysis
    get excelHeaders() { return excelHeaders; },
    set excelHeaders(value: string[]) { excelHeaders = value; },

    get excelSampleData() { return excelSampleData; },
    set excelSampleData(value: Record<string, any>[]) { excelSampleData = value; },

    get columnMapping() { return columnMapping; },
    set columnMapping(value: Record<string, string>) { columnMapping = value; },

    get currentTempId() { return currentTempId; },
    set currentTempId(value: string | null) { currentTempId = value; },

    // Methods
    resetImportState,
    resetColumnMappingState,
    resetAll,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
    startImportOperation,
    completeImportOperation,
    updateImportProgress
  };
}

export type ImportModalState = ReturnType<typeof createImportModalState>;
