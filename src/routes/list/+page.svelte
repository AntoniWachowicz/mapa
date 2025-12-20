<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedObject, Template, CategoryFieldData, PriceData } from '$lib/types.js';
  import Icon from '$lib/Icon.svelte';
  import Modal from '$lib/components/modals/Modal.svelte';
  import ColumnMappingModal from '$lib/components/modals/ColumnMappingModal.svelte';
  import HeaderSelectionModal from '$lib/components/modals/HeaderSelectionModal.svelte';
  import BulkEditModal from '$lib/components/modals/BulkEditModal.svelte';
  import DataTable from '$lib/components/table/DataTable.svelte';
  import ListActionsToolbar from '$lib/components/list/ListActionsToolbar.svelte';
  import BulkActionsToolbar from '$lib/components/list/BulkActionsToolbar.svelte';
  import {
    extractAddressFromObject,
    isGeocoding,
    isInQueue,
    addToQueue,
    processQueue,
    getQueueLength
  } from '$lib/features/geocoding';
  import { convertValueByFieldType, buildFieldTypeMap } from '$lib/features/excelImport';
  import {
    calculateInitialWidths,
    initResizeCallbacks,
    startResize as startColumnResize,
    getIsResizing
  } from '$lib/features/tableResize';
  import {
    formatPrice,
    formatTableCellValue,
    getFieldDisplayName,
    getFieldType
  } from '$lib/utils/formatters';

  interface Props {
    data: {
      user?: {
        username: string;
      } | null;
      template?: Template | null;
      objects?: SavedObject[];
    };
  }

  const { data }: Props = $props();

  let sortField = $state<string>('');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let filteredObjects = $state<SavedObject[]>(data.objects || []);
  let columnWidths = $state<Record<string, number>>({});
  let manuallyResizedColumns = $state<Set<string>>(new Set());
  let justFinishedResizing = $state(false);
  let expandedCells = $state<Set<string>>(new Set());
  let tableBodyElement = $state<HTMLElement | null>(null);
  let tableHeaderElement = $state<HTMLElement | null>(null);
  let placeholderRowCount = $state(0);
  let hoverCell = $state<{objectId: string, fieldKey: string} | null>(null);
  let hoverTooltip = $state<{content: any, x: number, y: number, width: number} | null>(null);
  let editingCell = $state<{objectId: string, fieldKey: string} | null>(null);
  let editingValue = $state<any>(null);
  let originalValue = $state<any>(null);

  // Multi-select state
  let selectedRows = $state<Set<string>>(new Set());
  let lastSelectedIndex = $state<number>(-1);
  let showBulkEditModal = $state(false);
  let bulkEditField = $state<string>('');
  let bulkEditValue = $state<any>('');

  // Excel import mapping state
  let showHeaderSelectionModal = $state(false);
  let showMappingModal = $state(false);
  let excelRawData = $state<any[][]>([]); // Raw Excel data before processing
  let selectedHeaderRow = $state(0);
  let excelHeaders = $state<string[]>([]);
  let excelSampleData = $state<Record<string, any>[]>([]);
  let excelAllData = $state<any[]>([]);
  let columnMapping = $state<Record<string, string>>({}); // Excel column -> schema field key
  let importInProgress = $state(false);

  // New field creation state
  let showNewFieldForm = $state(false);
  let newFieldForColumn = $state<string>('');
  let newFieldName = $state<string>('');
  let newFieldType = $state<string>('richtext');
  let creatingField = $state(false);

  // Flag to track if column widths have been initialized
  let columnWidthsInitialized = $state(false);

  // Initialize data
  $effect(() => {
    if (data.objects) {
      filteredObjects = [...data.objects];
    }
  });

  // Initialize column widths only once
  $effect(() => {
    if (data.template && filteredObjects && !columnWidthsInitialized) {
      columnWidths = calculateInitialWidths(
        data.template.fields,
        filteredObjects,
        formatTableCellValue
      );
      columnWidthsInitialized = true;
    }
  });

  // Excel/Template handler functions
  async function handleTemplateDownload() {
    if (!data.template) return;

    try {
      const response = await fetch('/api/excel-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: data.template })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'szablon_excel.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Błąd podczas pobierania szablonu');
      }
    } catch (error) {
      console.error('Template download error:', error);
      alert('Błąd podczas pobierania szablonu');
    }
  }

  async function handleExcelImport(event: Event) {
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

  function closeHeaderSelectionModal() {
    showHeaderSelectionModal = false;
    excelRawData = [];
    selectedHeaderRow = 0;
  }

  function confirmHeaderSelection() {
    if (excelRawData.length === 0 || selectedHeaderRow >= excelRawData.length) {
      alert('Nieprawidłowy wybór wiersza nagłówka');
      return;
    }

    // Extract headers from selected row
    excelHeaders = excelRawData[selectedHeaderRow].map((cell: any) =>
      String(cell || '').trim()
    ).filter((h: string) => h !== '');

    // Extract data rows (everything after the header row)
    const dataRows = excelRawData.slice(selectedHeaderRow + 1);

    // Convert to object format - keep as strings for now, will convert during import
    excelAllData = dataRows.map((row: any[]) => {
      const rowData: Record<string, any> = {};
      excelHeaders.forEach((header, index) => {
        const cellValue = row[index];
        if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
          rowData[header] = String(cellValue).trim();
        }
      });
      return { originalData: rowData };
    }).filter((row: any) => Object.keys(row.originalData).length > 0);

    // Create sample data for preview
    excelSampleData = excelAllData.slice(0, 3).map((row: any) => row.originalData);

    // Initialize column mapping
    columnMapping = {};

    // Close header selection and show mapping modal
    showHeaderSelectionModal = false;
    showMappingModal = true;
  }

  // convertValueByFieldType moved to excelImport module

  function openNewFieldForm(columnName: string) {
    newFieldForColumn = columnName;
    newFieldName = columnName; // Pre-fill with column name
    newFieldType = 'richtext';
    showNewFieldForm = true;
  }

  function closeNewFieldForm() {
    showNewFieldForm = false;
    newFieldForColumn = '';
    newFieldName = '';
    newFieldType = 'richtext';
  }

  async function createNewField() {
    if (!newFieldName.trim() || !data.template) {
      alert('Nazwa pola jest wymagana');
      return;
    }

    creatingField = true;

    try {
      // Create field key from name
      const fieldKey = newFieldName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      // Create new field object
      const newField = {
        id: crypto.randomUUID(),
        key: fieldKey,
        fieldName: newFieldName,
        label: newFieldName,
        displayLabel: newFieldName,
        type: newFieldType,
        fieldType: newFieldType,
        required: false, // Can be toggled later in schema builder
        visible: true,
        adminVisible: true, // Required for schema builder to show the field
        order: (data.template.fields?.length || 0) + 1
      };

      // Update template via schema-builder form action
      const updatedTemplate = {
        ...data.template,
        fields: [...(data.template.fields || []), newField]
      };

      const formData = new FormData();
      formData.set('template', JSON.stringify(updatedTemplate));

      const response = await fetch('/schema-builder?/updateTemplate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create field');
      }

      // Update local template state immediately
      if (data.template) {
        data.template = {
          ...data.template,
          fields: [...(data.template.fields || []), newField]
        };
      }

      // Map the column to the new field
      columnMapping = { ...columnMapping, [newFieldForColumn]: fieldKey };

      closeNewFieldForm();

      // Ask if user wants to configure the field in schema builder
      const configure = confirm(
        `Pole "${newFieldName}" zostało utworzone i zmapowane do kolumny "${newFieldForColumn}".\n\n` +
        `Czy chcesz przejść do konstruktora schematu aby skonfigurować to pole?\n` +
        `(Kliknij "Anuluj" aby kontynuować import)`
      );

      if (configure) {
        window.location.href = '/schema-builder';
      }
    } catch (error) {
      console.error('Error creating field:', error);
      alert('Błąd podczas tworzenia pola');
    } finally {
      creatingField = false;
    }
  }

  function closeMappingModal() {
    showMappingModal = false;
    excelHeaders = [];
    excelSampleData = [];
    excelAllData = [];
    columnMapping = {};
  }

  async function executeImportWithMapping() {
    if (!data.template) return;

    importInProgress = true;

    let savedCount = 0;
    let incompleteCount = 0;
    let errorCount = 0;

    // Find latitude and longitude mappings
    let latColumn: string | null = null;
    let lngColumn: string | null = null;

    for (const [excelCol, schemaField] of Object.entries(columnMapping)) {
      if (schemaField === '_latitude') latColumn = excelCol;
      if (schemaField === '_longitude') lngColumn = excelCol;
    }

    // Create a map of field key to field type for type conversion
    const fieldTypeMap = buildFieldTypeMap(data.template);

    for (const row of excelAllData) {
      try {
        const originalData = row.originalData || {};

        // Map Excel columns to schema fields with type conversion
        const mappedData: Record<string, any> = {};

        for (const [excelCol, schemaField] of Object.entries(columnMapping)) {
          // Skip special coordinate mappings
          if (schemaField === '_latitude' || schemaField === '_longitude' || schemaField === '_skip' || schemaField === '') {
            continue;
          }

          // Get the value from the original Excel data
          const rawValue = originalData[excelCol];
          if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            // Convert value based on field type
            const fieldType = fieldTypeMap[schemaField] || 'text';
            const convertedValue = convertValueByFieldType(rawValue, fieldType);

            if (convertedValue !== null) {
              mappedData[schemaField] = convertedValue;
            }
          }
        }

        // Parse coordinates
        let coordinates: { lat: number; lng: number } | null = null;
        if (latColumn && lngColumn && originalData[latColumn] && originalData[lngColumn]) {
          const lat = parseFloat(originalData[latColumn]);
          const lng = parseFloat(originalData[lngColumn]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = { lat, lng };
          }
        }

        // Build the save payload
        const hasCoordinates = coordinates !== null;
        const payload: any = {
          data: mappedData,
          hasIncompleteData: !hasCoordinates,
          missingFields: hasCoordinates ? [] : ['location']
        };

        if (hasCoordinates) {
          payload.location = {
            type: 'Point',
            coordinates: [coordinates!.lng, coordinates!.lat]
          };
        }

        const saveResponse = await fetch('/api/objects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (saveResponse.ok) {
          savedCount++;
          if (!hasCoordinates) {
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

  async function handleExcelExport() {
    if (!data.template || !filteredObjects.length) {
      alert('Brak danych do eksportu');
      return;
    }

    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: data.template,
          objects: filteredObjects
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Błąd podczas eksportu do Excel');
      }
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Błąd podczas eksportu do Excel');
    }
  }

  function handleSort(fieldKey: string) {
    // Don't sort if we're currently resizing or just finished resizing
    if (getIsResizing() || justFinishedResizing) return;

    if (sortField === fieldKey) {
      // 3-state cycle: asc → desc → reset
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        // Reset sorting
        sortField = '';
        sortDirection = 'asc';
        filteredObjects = data.objects ? [...data.objects] : [];
        return;
      }
    } else {
      sortField = fieldKey;
      sortDirection = 'asc';
    }

    filteredObjects = [...filteredObjects].sort((a, b) => {
      const aValue = a.data[fieldKey] || '';
      const bValue = b.data[fieldKey] || '';

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aString < bString ? -1 : aString > bString ? 1 : 0;
      } else {
        return aString > bString ? -1 : aString < bString ? 1 : 0;
      }
    });
  }

  // Sync horizontal scroll between header and body
  function syncHeaderScroll() {
    if (tableBodyElement && tableHeaderElement) {
      tableHeaderElement.scrollLeft = tableBodyElement.scrollLeft;
    }
  }

  // Hover tooltip functions
  function showTooltip(event: MouseEvent, content: any) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    hoverTooltip = {
      content,
      x: rect.left,
      y: rect.bottom + 4,
      width: rect.width
    };
  }

  function hideTooltip() {
    hoverTooltip = null;
  }

  function getTooltipContent(field: any, fieldValue: any, obj: SavedObject) {
    if (!fieldValue && fieldValue !== 0 && fieldValue !== false) return null;

    // Price field
    if (field.type === 'price' && typeof fieldValue === 'object' && fieldValue !== null) {
      const priceData = fieldValue as PriceData;
      const calculatedTotal = priceData.funding?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
      const totalStr = formatPrice(calculatedTotal);
      const maxLength = totalStr.length;
      return {type: 'price', data: priceData, maxLength, totalStr, calculatedTotal};
    }

    // Multidate field
    if (field.type === 'multidate' && typeof fieldValue === 'object' && fieldValue !== null) {
      const dateEntries = Object.entries(fieldValue);
      return {type: 'multidate', dateEntries};
    }

    // Address field
    if (field.type === 'address' && typeof fieldValue === 'object' && fieldValue !== null) {
      return {type: 'address', addressData: fieldValue};
    }

    // Links field
    if (field.type === 'links' && Array.isArray(fieldValue) && fieldValue.length > 0) {
      return {type: 'links', links: fieldValue};
    }

    // Regular text field
    const formattedValue = formatTableCellValue(field, fieldValue);
    if (formattedValue && formattedValue !== '—') {
      return {type: 'text', text: formattedValue};
    }

    return null;
  }

  // Check if element has visual overflow
  function isElementOverflowing(element: HTMLElement | null): boolean {
    if (!element) return false;

    // Get computed styles to check for line-clamp
    const styles = window.getComputedStyle(element);
    const lineClamp = styles.webkitLineClamp;

    // For line-clamped elements, we need a larger tolerance due to line-height calculations
    const tolerance = lineClamp && lineClamp !== 'none' ? 5 : 2;

    // Check horizontal overflow
    const hasHorizontalOverflow = element.scrollWidth > element.clientWidth + tolerance;

    // Check vertical overflow (for multi-line text)
    const hasVerticalOverflow = element.scrollHeight > element.clientHeight + tolerance;

    return hasHorizontalOverflow || hasVerticalOverflow;
  }

  // Check if compact view is hiding data
  function hasHiddenData(field: any, fieldValue: any): boolean {
    // Price field: >2 funding sources
    if (field.type === 'price' && fieldValue?.funding?.length > 2) return true;

    // Multidate field: >2 dates
    if (field.type === 'multidate' && Object.keys(fieldValue || {}).length > 2) return true;

    // Links field: >2 links
    if (field.type === 'links' && Array.isArray(fieldValue) && fieldValue.length > 2) return true;

    // Address field: Always has full details to show in tooltip
    if (field.type === 'address' && fieldValue) return true;

    return false;
  }

  // Icon function (SyncIcon - no matching static icon file yet)
  function SyncIcon(): string {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17107 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22075 18.8289 5.75463 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 7H18.2454L18 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 17H5.75463L6 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // Column resizing functions moved to tableResize module

  function toggleCellExpansion(objId: string, fieldKey: string) {
    const cellId = `${objId}-${fieldKey}`;
    if (expandedCells.has(cellId)) {
      expandedCells.delete(cellId);
    } else {
      expandedCells.add(cellId);
    }
    expandedCells = new Set(expandedCells);
  }

  function startEditingCell(objectId: string, fieldKey: string, currentValue: any) {
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

  function cancelEdit() {
    editingCell = null;
    editingValue = null;
    originalValue = null;
  }

  async function saveEdit() {
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
        const objIndex = filteredObjects.findIndex(obj => obj.id === editingCell.objectId);
        if (objIndex !== -1) {
          filteredObjects[objIndex].data[editingCell.fieldKey] = editingValue;
          filteredObjects = [...filteredObjects];
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

  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    }
  }

  // Focus action for inputs
  function focus(element: HTMLElement) {
    element.focus();
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.select();
    }
  }

  // Multi-select functions
  function handleRowSelection(objectId: string, index: number, event: MouseEvent) {
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

  function toggleSelectAll() {
    if (selectedRows.size === filteredObjects.length) {
      selectedRows = new Set();
    } else {
      selectedRows = new Set(filteredObjects.map(obj => obj.id));
    }
  }

  function openBulkEditModal() {
    if (selectedRows.size === 0) return;
    if (!data.template) return;

    // Default to first visible field
    const firstField = data.template.fields.find(f => f.visible);
    if (firstField) {
      bulkEditField = firstField.key;
    }
    showBulkEditModal = true;
  }

  function closeBulkEditModal() {
    showBulkEditModal = false;
    bulkEditField = '';
    bulkEditValue = '';
  }

  async function deleteSelected() {
    if (selectedRows.size === 0) return;

    const count = selectedRows.size;
    const confirmed = confirm(`Czy na pewno chcesz usunąć ${count} zaznaczonych wierszy? Ta operacja jest nieodwracalna.`);

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
      filteredObjects = filteredObjects.filter(obj => !selectedIds.includes(obj.id));
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

  async function applyBulkEdit() {
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
        filteredObjects = filteredObjects.map(obj => {
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

  // Calculate placeholder rows to fill the screen
  function calculatePlaceholderRows(): void {
    if (!tableBodyElement) return;

    const containerHeight = tableBodyElement.clientHeight;
    const rowHeight = 40;
    const existingRowsCount = filteredObjects.length;
    const maxVisibleRows = Math.floor(containerHeight / rowHeight);
    const neededPlaceholders = Math.max(0, maxVisibleRows - existingRowsCount);

    placeholderRowCount = neededPlaceholders;
  }

  // Recalculate on window resize and data changes
  $effect(() => {
    if (tableBodyElement && data.template) {
      calculatePlaceholderRows();
    }
  });

  $effect(() => {
    if (filteredObjects) {
      calculatePlaceholderRows();
    }
  });

  onMount(async () => {
    // Initialize table resize callbacks
    initResizeCallbacks({
      onWidthChange: (key: string, width: number) => {
        columnWidths = { ...columnWidths, [key]: width };
      },
      onResizeComplete: (columnKey: string) => {
        const newManuallyResized = new Set(manuallyResizedColumns);
        newManuallyResized.add(columnKey);
        manuallyResizedColumns = newManuallyResized;
      },
      onPreventClick: () => {
        justFinishedResizing = true;
        setTimeout(() => {
          justFinishedResizing = false;
        }, 150);
      }
    });

    // Fix any fields missing adminVisible property (one-time migration)
    if (data.template && data.template.fields) {
      const needsFix = data.template.fields.some(f => f.adminVisible === undefined);

      if (needsFix) {
        console.log('Fixing fields missing adminVisible property...');
        const fixedTemplate = {
          ...data.template,
          fields: data.template.fields.map(f => ({
            ...f,
            adminVisible: f.adminVisible ?? true // Set to true if undefined
          }))
        };

        // Save the fixed template
        try {
          const formData = new FormData();
          formData.set('template', JSON.stringify(fixedTemplate));

          await fetch('/schema-builder?/updateTemplate', {
            method: 'POST',
            body: formData
          });

          // Update local state
          data.template = fixedTemplate;
          console.log('Fields fixed successfully');
        } catch (error) {
          console.error('Error fixing fields:', error);
        }
      }
    }

    const handleResizeWindow = () => {
      calculatePlaceholderRows();
    };

    window.addEventListener('resize', handleResizeWindow);

    return () => {
      window.removeEventListener('resize', handleResizeWindow);
    };
  });

  // Sync address with location coordinates
  async function syncAddressWithLocation(objectId: string) {
    const obj = filteredObjects.find(o => o.id === objectId);
    if (!obj || !obj.location || !obj.location.coordinates) {
      alert('Brak współrzędnych dla tego obiektu');
      return;
    }

    const [lng, lat] = obj.location.coordinates;

    try {
      const response = await fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat, lng })
      });

      const result = await response.json();

      if (result.success && result.structuredAddress) {
        // Find the address field in the template
        const addressField = data.template?.fields.find(f => f.type === 'address');
        if (!addressField) {
          alert('Brak pola adresu w schemacie');
          return;
        }

        // Use structured address data with all components
        const addressValue = {
          street: result.structuredAddress.street || '',
          number: result.structuredAddress.number || '',
          postalCode: result.structuredAddress.postalCode || '',
          city: result.structuredAddress.city || '',
          gmina: result.structuredAddress.gmina || ''
        };

        // Update the address field
        const updateResponse = await fetch(`/api/objects/${objectId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fieldKey: addressField.key,
            value: addressValue
          })
        });

        if (updateResponse.ok) {
          // Update local state
          const objIndex = filteredObjects.findIndex(o => o.id === objectId);
          if (objIndex !== -1) {
            filteredObjects[objIndex].data[addressField.key] = addressValue;
            filteredObjects = [...filteredObjects];
          }
          alert('Adres został zaktualizowany');
        } else {
          alert('Błąd podczas zapisywania adresu');
        }
      } else {
        alert(result.error || 'Nie udało się pobrać adresu');
      }
    } catch (error) {
      console.error('Sync address error:', error);
      alert('Błąd podczas synchronizacji adresu');
    }
  }

  // Quick geocode function - uses geocoding module
  async function quickGeocodePin(objectId: string) {
    const obj = filteredObjects.find(o => o.id === objectId);
    if (!obj) return;

    const address = extractAddressFromObject(obj, data.template);
    if (!address) {
      alert('Nie znaleziono pola z adresem dla tego obiektu.');
      return;
    }

    try {
      // Add to queue (module will handle validation)
      addToQueue(objectId, address);

      // Show immediate feedback
      const queueLength = getQueueLength();
      if (queueLength === 1) {
        alert(`Rozpoczęto geokodowanie dla adresu: ${address}`);
      } else {
        alert(`Dodano do kolejki (pozycja ${queueLength}): ${address}`);
      }

      // Start processing queue with update callback
      processQueue(async (objId: string, lat: number, lng: number) => {
        const locationResponse = await fetch(`/api/objects/${objId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            clearIncomplete: true
          })
        });

        if (locationResponse.ok) {
          const locationResult = await locationResponse.json();
          if (locationResult.success && locationResult.object) {
            // Update object in list
            const objIndex = filteredObjects.findIndex(o => o.id === objId);
            if (objIndex !== -1) {
              filteredObjects[objIndex] = locationResult.object;
              if (filteredObjects[objIndex].missingFields?.includes('location')) {
                filteredObjects[objIndex].missingFields = filteredObjects[objIndex].missingFields?.filter(f => f !== 'location');
                if (filteredObjects[objIndex].missingFields?.length === 0) {
                  filteredObjects[objIndex].hasIncompleteData = false;
                }
              }
              filteredObjects = [...filteredObjects];
            }
          }
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  }

</script>

<svelte:head>
  <title>Lista</title>
</svelte:head>

{#if !data.user}
  <div class="login-prompt">
    <p>Proszę <a href="/login">zaloguj się</a> aby uzyskać dostęp do aplikacji.</p>
  </div>
{:else if !data.template}
  <div class="no-template">
    <p>Brak zdefiniowanego schematu. <a href="/schema-builder">Utwórz schemat</a> aby móc dodawać pinezki.</p>
  </div>
{:else}
  <div class="list-container">
    <ListActionsToolbar
      onTemplateDownload={handleTemplateDownload}
      onExcelImport={handleExcelImport}
      onExcelExport={handleExcelExport}
    />

    <BulkActionsToolbar
      selectedCount={selectedRows.size}
      onBulkEdit={openBulkEditModal}
      onBulkDelete={deleteSelected}
      onClearSelection={() => selectedRows = new Set()}
    />

    <DataTable
      template={data.template}
      objects={filteredObjects}
      {sortField}
      {sortDirection}
      {columnWidths}
      {selectedRows}
      {expandedCells}
      {editingCell}
      bind:editingValue
      {hoverCell}
      {placeholderRowCount}
      isResizing={getIsResizing()}
      {justFinishedResizing}
      {getFieldDisplayName}
      {getFieldType}
      {formatTableCellValue}
      {formatPrice}
      {hasHiddenData}
      {isElementOverflowing}
      {getTooltipContent}
      {extractAddressFromObject}
      {isGeocoding}
      {SyncIcon}
      startColumnResize={startColumnResize}
      onSort={handleSort}
      onToggleSelectAll={toggleSelectAll}
      onRowSelection={handleRowSelection}
      onEditStart={startEditingCell}
      onEditSave={saveEdit}
      onEditCancel={cancelEdit}
      onToggleExpansion={toggleCellExpansion}
      onShowTooltip={showTooltip}
      onHideTooltip={hideTooltip}
      onQuickGeocode={quickGeocodePin}
      onSyncAddress={syncAddressWithLocation}
      onKeydown={handleKeydown}
      onHeaderScroll={syncHeaderScroll}
    />

    <!-- Bulk Edit Modal -->
    <BulkEditModal
      open={showBulkEditModal}
      template={data.template}
      selectedCount={selectedRows.size}
      {bulkEditField}
      {bulkEditValue}
      onclose={closeBulkEditModal}
      onapply={applyBulkEdit}
      onfieldupdated={(field) => bulkEditField = field}
      onvalueupdated={(value) => bulkEditValue = value}
      {getFieldDisplayName}
    />

    <!-- Header Selection Modal -->
    <HeaderSelectionModal
      open={showHeaderSelectionModal}
      {excelRawData}
      {selectedHeaderRow}
      onclose={closeHeaderSelectionModal}
      onconfirm={confirmHeaderSelection}
      onheaderrowchange={(rowIndex) => selectedHeaderRow = rowIndex}
    />

    <!-- Column Mapping Modal for Excel Import -->
    <ColumnMappingModal
      open={showMappingModal}
      template={data.template}
      {excelHeaders}
      {excelSampleData}
      {excelAllData}
      {columnMapping}
      {importInProgress}
      onclose={closeMappingModal}
      onimport={executeImportWithMapping}
      oncolumnmappingchange={(mapping) => columnMapping = mapping}
      onnewfield={openNewFieldForm}
      {getFieldDisplayName}
    />

    <!-- Floating Hover Tooltip -->
    {#if hoverTooltip}
      <div
        class="floating-tooltip"
        style="left: {hoverTooltip.x}px; top: {hoverTooltip.y}px; min-width: {hoverTooltip.width}px;"
      >
        {#if hoverTooltip.content.type === 'price'}
          {@const { data, maxLength, totalStr, calculatedTotal } = hoverTooltip.content}
          {#if data.funding && Array.isArray(data.funding)}
            {#each data.funding as fundingItem}
              {@const amountStr = formatPrice(fundingItem.amount)}
              {@const padding = maxLength - amountStr.length}
              <div class="tooltip-row">
                <span class="tooltip-label">{fundingItem.source}:</span>
                <span class="tooltip-value" style="padding-left: {padding}ch;">{amountStr} zł</span>
              </div>
            {/each}
            {#if data.showTotal !== false && calculatedTotal > 0}
              <div class="tooltip-row tooltip-total">
                <span class="tooltip-label">Suma:</span>
                <span class="tooltip-value">{totalStr} zł</span>
              </div>
            {/if}
          {/if}
        {:else if hoverTooltip.content.type === 'multidate'}
          {#each hoverTooltip.content.dateEntries as [label, date]}
            <div class="tooltip-row">
              <span class="tooltip-label">{label}:</span>
              <span class="tooltip-value">{new Date(date).toLocaleDateString('pl-PL')}</span>
            </div>
          {/each}
        {:else if hoverTooltip.content.type === 'address'}
          {@const addressData = hoverTooltip.content.addressData}
          {#if addressData.street}
            <div class="tooltip-row">
              <span class="tooltip-label">Ulica:</span>
              <span class="tooltip-value">{addressData.street}{#if addressData.number} {addressData.number}{/if}</span>
            </div>
          {/if}
          {#if addressData.postalCode}
            <div class="tooltip-row">
              <span class="tooltip-label">Kod:</span>
              <span class="tooltip-value">{addressData.postalCode}</span>
            </div>
          {/if}
          {#if addressData.city}
            <div class="tooltip-row">
              <span class="tooltip-label">Miasto:</span>
              <span class="tooltip-value">{addressData.city}</span>
            </div>
          {/if}
          {#if addressData.gmina}
            <div class="tooltip-row">
              <span class="tooltip-label">Gmina:</span>
              <span class="tooltip-value">{addressData.gmina}</span>
            </div>
          {/if}
        {:else if hoverTooltip.content.type === 'links'}
          {#each hoverTooltip.content.links as link}
            <div class="tooltip-row">
              <a href={link.url} target="_blank" rel="noopener noreferrer" class="tooltip-link">
                {link.text || link.url}
              </a>
            </div>
          {/each}
        {:else if hoverTooltip.content.type === 'text'}
          <div class="tooltip-text">
            {hoverTooltip.content.text}
          </div>
        {/if}
      </div>
    {/if}

    <!-- New Field Creation Modal -->
    {#if showNewFieldForm}
      <div class="new-field-modal-overlay" onclick={closeNewFieldForm}>
        <div class="new-field-modal" onclick={(e) => e.stopPropagation()}>
          <h2>Utwórz nowe pole</h2>
          <p class="new-field-modal-info">
            Pole zostanie dodane do schematu i zmapowane do kolumny "<strong>{newFieldForColumn}</strong>"
          </p>

          <div class="new-field-form">
            <div class="form-group">
              <label for="newFieldName">Nazwa pola:</label>
              <input
                id="newFieldName"
                type="text"
                bind:value={newFieldName}
                placeholder="np. Data rozpoczęcia"
                disabled={creatingField}
              />
            </div>

            <div class="form-group">
              <label for="newFieldType">Typ pola:</label>
              <select
                id="newFieldType"
                bind:value={newFieldType}
                disabled={creatingField}
              >
                <option value="richtext">Tekst sformatowany</option>
                <option value="files">Pliki</option>
                <option value="gallery">Galeria</option>
                <option value="multidate">Daty</option>
                <option value="address">Adres</option>
                <option value="links">Linki</option>
                <option value="price">Cena</option>
                <option value="category">Kategoria</option>
                <option value="tags">Tagi</option>
              </select>
            </div>
          </div>

          {#if creatingField}
            <div class="new-field-loading">
              <div class="spinner"></div>
              <p>Tworzenie pola...</p>
            </div>
          {/if}

          <div class="new-field-modal-actions">
            <button
              class="btn btn-primary"
              onclick={createNewField}
              disabled={creatingField || !newFieldName.trim()}
            >
              Utwórz pole
            </button>
            <button
              class="btn btn-secondary"
              onclick={closeNewFieldForm}
              disabled={creatingField}
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    {/if}

  </div>
{/if}

<style>
  @import '$lib/styles/modal.css';

  .login-prompt, .no-template {
    text-align: center;
    padding: var(--space-12) var(--space-4);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    margin: var(--space-8);
  }

  .login-prompt p, .no-template p {
    font-size: var(--text-lg);
    color: var(--color-text-secondary);
  }

  .login-prompt a, .no-template a {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);
  }

  .list-container {
    padding: var(--space-6);
    width: 100%;
    margin: 0;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: #333333;
    color: white;
    border: none;
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
    height: 32px;
  }

  .btn:hover {
    background: #444444;
    transform: translateY(-1px);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn span {
    white-space: nowrap;
  }

  .table-container {
    background: var(--color-background);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    height: calc(100vh - 200px);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .table-header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--color-background);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  /* Hide scrollbar for header but keep functionality */
  .table-header::-webkit-scrollbar {
    display: none;
  }

  .table-header {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .table-body {
    flex: 1;
    overflow: auto;
  }

  .header-table, .body-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: "Space Mono", monospace;
  }

  .header-table th {
    background: var(--color-surface);
    padding: var(--space-4);
    text-align: left;
    font-family: "Space Mono", monospace;
    font-weight: 400;
    font-size: 16px;
    color: var(--color-text-secondary);
    cursor: pointer;
    user-select: none;
    transition: background-color var(--transition-fast);
    position: relative;
    box-sizing: border-box;
  }

  .header-table th:hover {
    background: var(--color-surface-hover);
  }

  .header-table th.sorted-asc,
  .header-table th.sorted-desc {
    background: var(--color-accent);
    color: white;
  }

  .header-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 4px 0;
    width: 100%;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .field-name {
    font-weight: 400;
    color: black;
    line-height: 1.2;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .field-type {
    font-family: "Space Mono", monospace;
    font-size: 11px;
    color: #999;
    line-height: 1.2;
  }

  .sort-icon {
    font-size: var(--text-xs);
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }

  .body-table td {
    padding: var(--space-2);
    font-family: "Space Mono", monospace;
    font-size: 16px;
  }

  .body-table tbody tr:nth-child(even) {
    background: #f8f9fa;
  }

  .body-table tbody tr:nth-child(odd) {
    background: white;
  }

  .body-table tbody tr:hover {
    background: #e9ecef !important;
  }

  .body-table tbody tr.incomplete:nth-child(even) {
    background: #fef3c7;
  }

  .body-table tbody tr.incomplete:nth-child(odd) {
    background: #fef9e6;
  }

  .body-table tbody tr.incomplete:hover {
    background: #fde68a !important;
  }

  /* Missing location indicator */
  .missing-location-cell {
    position: relative;
    background: #fee2e2 !important;
  }

  .body-table tbody tr.missing-location .checkbox-column {
    background: #fee2e2;
  }

  .cell-content {
    min-height: 1.5rem;
    display: flex;
    align-items: flex-start;
    padding: 8px 0;
    cursor: pointer;
    overflow: hidden;
    line-height: 1.4;
  }

  .cell-content.expanded {
    overflow: visible;
  }

  /* Simple text values still use line-clamp */
  .cell-content > .field-value {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cell-content.expanded > .field-value {
    -webkit-line-clamp: unset;
    overflow: visible;
  }

  .cell-content:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  .field-value {
    color: var(--color-text-primary);
    word-break: break-word;
  }

  .missing-data {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .tag-display {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-base);
    color: white;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  .empty-row {
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .column-resizer {
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    z-index: 30;
    transform: translateX(50%);
  }

  .column-resizer::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    height: 100%;
    background: transparent;
  }

  .column-resizer:hover::before {
    background: var(--color-accent);
    width: 2px;
  }

  /* Modern table design improvements */
  .header-table th {
    background: var(--color-surface);
    padding: 12px 12px 16px 12px;
    text-align: left;
    font-family: "Space Mono", monospace;
    font-weight: var(--font-weight-bold);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    cursor: pointer;
    user-select: none;
    transition: background-color var(--transition-fast);
    position: relative;
    border-bottom: 2px solid var(--color-border);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
  }

  .header-table th:last-child {
    border-right: none;
  }

  .header-table th.sorted-asc,
  .header-table th.sorted-desc {
    background: #d0d0d0;
    color: var(--color-text-primary);
  }

  .field-name {
    font-family: "Space Mono", monospace;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .body-table td {
    padding: 8px 12px;
    font-family: "Space Mono", monospace;
    font-size: var(--text-sm);
    vertical-align: top;
    box-sizing: border-box;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
  }

  .body-table td:last-child {
    border-right: none;
  }

  .body-table tbody tr:nth-child(even) {
    background: #e8e8e8;
  }

  .body-table tbody tr:nth-child(odd) {
    background: #f5f5f5;
  }

  .body-table tbody tr:hover {
    background: #d0d0d0 !important;
  }

  .body-table td.sorted-column {
    background: rgba(0, 0, 0, 0.05);
  }

  .body-table tbody tr:nth-child(even) td.sorted-column {
    background: #d8d8d8;
  }

  .body-table tbody tr:nth-child(odd) td.sorted-column {
    background: #e8e8e8;
  }

  .cell-content {
    min-height: 1.2rem;
    padding: 0;
    cursor: pointer;
    line-height: 1.3;
    vertical-align: top;
  }

  .cell-content > span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cell-content > .sub-fields {
    display: block;
  }

  /* Placeholder rows */
  .placeholder-row {
    pointer-events: none;
  }

  .placeholder-row.even {
    background: #e8e8e8;
  }

  .placeholder-row:not(.even) {
    background: #f5f5f5;
  }

  .placeholder-cell {
    height: 100%;
    background: transparent;
  }

  .placeholder-row:hover {
    background: inherit !important;
  }

  /* Field editing styles - minimal */
  .edit-field-container {
    position: relative;
  }

  .edit-field-input,
  .edit-field-textarea {
    width: 100%;
    border: 1px solid #007bff;
    border-radius: var(--radius-base);
    padding: var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: white;
    resize: none;
    min-height: 80px; /* Make it appear expanded like normal cells */
    line-height: 1.3;
  }

  .edit-field-input:focus,
  .edit-field-textarea:focus {
    outline: none;
    border-color: #007bff;
  }

  .edit-field-textarea {
    min-height: 100px; /* Even taller for actual textareas */
  }

  .edit-field-checkbox {
    transform: scale(1.1);
  }

  .edit-buttons {
    display: flex;
    gap: var(--space-1);
    margin-top: var(--space-1);
    justify-content: flex-end;
  }

  .edit-save-btn,
  .edit-cancel-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: #333333;
    color: white;
    border: none;
    border-radius: var(--radius-base);
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition-fast);
    width: 28px;
    height: 24px;
  }

  .edit-save-btn:hover,
  .edit-cancel-btn:hover {
    background: #444444;
    transform: translateY(-1px);
  }

  .edit-save-btn:active,
  .edit-cancel-btn:active {
    transform: translateY(0);
  }

  /* Sub-field display styles for complex fields */
  .sub-fields {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  /* Default flex layout for most complex fields */
  .sub-field-row {
    display: flex;
    gap: 6px;
    font-size: var(--text-sm);
    line-height: 1.4;
    margin-bottom: 1px;
  }

  .sub-label {
    color: var(--color-text-muted);
    font-family: 'Space Mono', monospace;
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    flex-shrink: 0;
    text-align: right;
    min-width: fit-content;
  }

  .sub-value {
    color: var(--color-text);
    text-align: left;
    font-family: 'Space Mono', monospace;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-grow: 1;
  }

  /* Price field container - keeps it at left edge */
  .price-container {
    display: inline-block;
    margin: 0;
    padding: 0;
  }

  /* Price fields use table layout for decimal alignment */
  .price-container .sub-fields {
    display: table;
    border-collapse: collapse;
    border-spacing: 0;
    margin: 0;
    padding: 0;
    width: auto;
  }

  .price-container .sub-field-row {
    display: table-row;
  }

  .price-container .sub-label {
    display: table-cell;
    padding-right: 6px;
    padding-bottom: 1px;
  }

  .price-container .sub-value {
    display: table-cell;
    padding-bottom: 1px;
  }

  .sub-value a {
    color: #007bff;
    text-decoration: none;
  }

  .sub-value a:hover {
    text-decoration: underline;
  }

  .total-row {
    margin-top: 2px;
    font-weight: var(--font-weight-semibold);
  }

  /* Edit field styles for complex fields */
  .edit-field-input-small {
    width: 100%;
    border: 1px solid #ccc;
    border-radius: var(--radius-base);
    padding: 4px 8px;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: white;
    margin-bottom: 4px;
  }

  .edit-field-input-small:focus {
    outline: none;
    border-color: #007bff;
  }

  .edit-price-container,
  .edit-multidate-container,
  .edit-address-container,
  .edit-links-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 300px;
    overflow-y: auto;
  }

  .edit-price-row,
  .edit-date-row,
  .edit-link-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .edit-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
    min-width: 80px;
    text-align: right;
    flex-shrink: 0;
  }

  /* Checkbox column styles */
  .checkbox-column {
    width: 40px !important;
    min-width: 40px !important;
    max-width: 40px !important;
    text-align: center;
    cursor: pointer;
  }

  .checkbox-column input[type="checkbox"] {
    cursor: pointer;
    transform: scale(1.2);
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  /* Address sync button styles */
  .address-display-container {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  }

  .address-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    margin-top: 2px;
  }

  .quick-geocode-address-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: "Space Mono", monospace;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .quick-geocode-address-btn:hover {
    background: #059669;
    transform: scale(1.05);
  }

  .quick-geocode-address-btn:active {
    transform: scale(0.95);
  }

  .geocoding-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #f59e0b;
    color: white;
    border-radius: var(--radius-base);
    font-family: "Space Mono", monospace;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .sync-address-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: all var(--transition-fast);
    width: 24px;
    height: 24px;
  }

  .sync-address-btn:hover {
    background: #7c3aed;
    transform: scale(1.05);
  }

  .sync-address-btn:active {
    transform: scale(0.95);
  }

  /* Column Mapping Modal styles */
  /* Modal Styles - Base styles from modal.css, component-specific overrides below */
  /* Column Mapping Modal styles moved to ColumnMappingModal.svelte */

  /* Header Selection Modal styles moved to HeaderSelectionModal.svelte */

  .import-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    gap: var(--space-4);
  }

  .import-progress p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* New Field Creation Modal styles */
  .new-field-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .new-field-modal {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .new-field-modal h2 {
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .new-field-modal-info {
    margin: 0 0 var(--space-4) 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .new-field-form {
    margin-bottom: var(--space-4);
  }

  .new-field-form .form-group {
    margin-bottom: var(--space-4);
  }

  .new-field-form label {
    display: block;
    margin-bottom: var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .new-field-form input[type="text"],
  .new-field-form select {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .new-field-form input[type="text"]:focus,
  .new-field-form select:focus {
    outline: none;
    border-color: #0ea5e9;
  }

  .new-field-form input[type="checkbox"] {
    margin-right: var(--space-2);
  }

  .new-field-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) 0;
  }

  .new-field-loading p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .new-field-modal-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Location column styles */
  .location-column {
    width: 15ch; /* 15 character widths - fits "Lokalizacja" and "(współrzędne)" header */
    white-space: nowrap;
  }

  .coordinates-display {
    display: flex;
    flex-direction: column;
    gap: 0px;
    font-family: "Space Mono", monospace;
    font-size: var(--text-sm);
  }

  .coordinate-line {
    line-height: 1.4;
    white-space: nowrap;
  }

  .missing-location-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .missing-location-text {
    color: #999;
    font-style: italic;
    font-family: "Space Mono", monospace;
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  .geocoding-status-inline {
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  /* Compact view for complex fields (max 2 lines) */
  .compact-view {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: "Space Mono", monospace;
    font-size: var(--text-sm);
  }

  .compact-line {
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .compact-line:first-child {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
  }

  /* Floating tooltip for hover data */
  .floating-tooltip {
    position: fixed;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    pointer-events: none;
    padding: 8px 12px;
    font-family: "Space Mono", monospace;
    font-size: var(--text-sm);
    max-width: 500px;
    max-height: 400px;
    overflow: auto;
  }

  .tooltip-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    line-height: 1.6;
    margin-bottom: 2px;
  }

  .tooltip-row:last-child {
    margin-bottom: 0;
  }

  .tooltip-label {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
    min-width: 80px;
    flex-shrink: 0;
  }

  .tooltip-value {
    color: var(--color-text-primary);
    font-family: "Space Mono", monospace;
  }

  .tooltip-total {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    font-weight: var(--font-weight-medium);
  }

  .tooltip-link {
    color: #0ea5e9;
    text-decoration: underline;
    font-family: "Space Mono", monospace;
  }

  .tooltip-link:hover {
    color: #0284c7;
  }

  .tooltip-text {
    color: var(--color-text-primary);
    font-family: "Space Mono", monospace;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
  }

  .quick-geocode-btn {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background: #000000;
    color: white;
    border: none;
    border-radius: 0;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: "Space Mono", monospace;
    font-size: 10px;
    font-weight: 500;
    white-space: nowrap;
  }

  .quick-geocode-btn:hover {
    background: #333333;
    transform: scale(1.05);
  }

  .quick-geocode-btn:active {
    transform: scale(0.95);
  }

  .geocoding-status-inline {
    font-size: 14px;
  }

</style>
