<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedObject, Template, CategoryFieldData, PriceData } from '$lib/types.js';

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
  let isResizing = $state(false);
  let resizeStartX = $state(0);
  let resizeLeftColumn = $state('');
  let resizeRightColumn = $state('');
  let resizeInitialLeftWidth = $state(0);
  let resizeInitialRightWidth = $state(0);
  let expandedCells = $state<Set<string>>(new Set());
  let tableBodyElement = $state<HTMLElement | null>(null);
  let placeholderRowCount = $state(0);
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
  let showMappingModal = $state(false);
  let excelHeaders = $state<string[]>([]);
  let excelSampleData = $state<Record<string, any>[]>([]);
  let excelAllData = $state<any[]>([]);
  let columnMapping = $state<Record<string, string>>({}); // Excel column -> schema field key
  let importInProgress = $state(false);

  // Location editing modal state
  let showLocationModal = $state(false);
  let locationEditObjectId = $state<string | null>(null);
  let locationEditLat = $state<string>('');
  let locationEditLng = $state<string>('');
  let locationEditAddress = $state<string>('');
  let locationEditMode = $state<'manual' | 'geocode'>('manual');
  let locationEditLoading = $state(false);

  // Initialize data
  $effect(() => {
    if (data.objects) {
      filteredObjects = [...data.objects];
    }
    // Initialize column widths
    if (data.template) {
      const initialWidths: Record<string, number> = {};
      data.template.fields.filter(f => f.visible).forEach(field => {
        initialWidths[field.key] = 200; // Default width
      });
      columnWidths = initialWidths;
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

      const importedRows = result.data || [];
      if (importedRows.length === 0) {
        alert('Plik Excel nie zawiera danych do importu');
        input.value = '';
        return;
      }

      // Step 2: Store data and show mapping modal
      excelHeaders = result.headers || [];
      excelAllData = importedRows;

      // Create sample data for preview (first 3 rows)
      excelSampleData = importedRows.slice(0, 3).map((row: any) => row.originalData);

      // Auto-detect mappings based on column name similarity
      const autoMapping: Record<string, string> = {};
      if (data.template?.fields) {
        for (const header of excelHeaders) {
          const headerLower = header.toLowerCase().trim();

          // Try to find a matching field
          for (const field of data.template.fields) {
            const fieldNameLower = field.fieldName.toLowerCase().trim();
            const fieldKeyLower = field.key.toLowerCase().trim();

            // Match by exact name, key, or partial match
            if (headerLower === fieldNameLower ||
                headerLower === fieldKeyLower ||
                fieldNameLower.includes(headerLower) ||
                headerLower.includes(fieldNameLower)) {
              autoMapping[header] = field.key;
              break;
            }
          }

          // Special handling for coordinates
          if (!autoMapping[header]) {
            if (headerLower.includes('lat') || headerLower.includes('szerokość') || headerLower.includes('szerokosc')) {
              autoMapping[header] = '_latitude';
            } else if (headerLower.includes('lng') || headerLower.includes('lon') || headerLower.includes('długość') || headerLower.includes('dlugosc')) {
              autoMapping[header] = '_longitude';
            }
          }
        }
      }

      columnMapping = autoMapping;
      showMappingModal = true;

    } catch (error) {
      console.error('Excel import error:', error);
      alert('Błąd podczas importu pliku Excel');
    }

    // Reset input
    input.value = '';
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

    for (const row of excelAllData) {
      try {
        const originalData = row.originalData || {};

        // Map Excel columns to schema fields
        const mappedData: Record<string, any> = {};

        for (const [excelCol, schemaField] of Object.entries(columnMapping)) {
          // Skip special coordinate mappings
          if (schemaField === '_latitude' || schemaField === '_longitude' || schemaField === '_skip') {
            continue;
          }

          // Get the value from the original Excel data
          const value = originalData[excelCol];
          if (value !== undefined && value !== null && value !== '') {
            mappedData[schemaField] = value;
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
    // Don't sort if we're currently resizing
    if (isResizing) return;

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

  // Price formatting function
  const formatPrice = (amount: number) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    const fixed = num.toFixed(2);
    const [integer, decimal] = fixed.split('.');
    const withSpaces = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${withSpaces},${decimal}`;
  };

  function formatFieldValue(field: any, value: any): string {
    // Check for empty values
    if (!value && value !== 0 && value !== false) return '—';

    // Check for empty arrays
    if (Array.isArray(value) && value.length === 0) return '—';

    // Check for empty gallery objects
    if (typeof value === 'object' && value !== null && 'items' in value) {
      if (!value.items || (Array.isArray(value.items) && value.items.length === 0)) {
        return '—';
      }
    }

    if (field.type === 'checkbox') {
      return value ? 'Tak' : 'Nie';
    } else if (field.type === 'currency') {
      return `${Number(value).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
    } else if (field.type === 'percentage') {
      return `${value}%`;
    } else if (field.type === 'date') {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('pl-PL');
      } catch {
        return String(value);
      }
    } else {
      return String(value);
    }
  }

  function getFieldDisplayName(field: any): string {
    return field.displayLabel || field.label;
  }

  function getFieldType(field: any): string {
    const typeMap: Record<string, string> = {
      'text': 'tekst',
      'number': 'liczba',
      'checkbox': 'tak/nie',
      'date': 'data',
      'email': 'email',
      'url': 'url',
      'currency': 'waluta',
      'percentage': 'procent',
      'textarea': 'tekst',
      'select': 'wybór',
      'tags': 'tagi',
      'image': 'obraz',
      'youtube': 'youtube',
      'address': 'adres',
      'price': 'cena',
      'multidate': 'wielodata',
      'links': 'linki',
      'richtext': 'tekst sformatowany'
    };
    return typeMap[field.type] || field.type;
  }

  // Icon functions
  function DownloadIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.3414 17.2444C13.2154 17.3704 13 17.2812 13 17.103L13 10C13 9.44772 12.5522 9 12 9C11.4477 9 11 9.44772 11 10L11 17.1029C11 17.2811 10.7845 17.3703 10.6585 17.2443L8.46446 15.0502C8.07394 14.6597 7.44077 14.6597 7.05025 15.0502C6.65972 15.4408 6.65972 16.0739 7.05025 16.4645L11.2874 20.7016C11.375 20.7906 11.4791 20.8632 11.5948 20.9145C11.7186 20.9695 11.8557 21 12 21C12.1316 21 12.2572 20.9746 12.3723 20.9284C12.4942 20.8796 12.6084 20.8058 12.7071 20.7071L16.9497 16.4645C17.3403 16.0739 17.3403 15.4408 16.9497 15.0502C16.5592 14.6597 15.9261 14.6597 15.5355 15.0502L13.3414 17.2444Z" fill="currentColor"/>
      <path d="M21 11C21 12.1046 20.1046 13 19 13H16C15.4477 13 15 12.5523 15 12V10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10V12C9 12.5523 8.55228 13 8 13H5C3.89543 13 3 12.1046 3 11L3 7C3 4.79086 4.79086 3 7 3L17 3C19.2091 3 21 4.79086 21 7V11Z" fill="currentColor"/>
    </svg>`;
  }

  function UploadIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.6586 6.7556C10.7846 6.62961 11 6.71884 11 6.89703V14C11 14.5523 11.4478 15 12 15C12.5523 15 13 14.5523 13 14V6.8971C13 6.71892 13.2155 6.62968 13.3415 6.75568L15.5355 8.94975C15.9261 9.34028 16.5592 9.34028 16.9498 8.94975C17.3403 8.55923 17.3403 7.92606 16.9498 7.53554L12.7126 3.29836C12.625 3.20942 12.5209 3.1368 12.4052 3.08548C12.2814 3.03053 12.1443 3 12 3C11.8684 3 11.7428 3.02542 11.6277 3.07163C11.5058 3.12044 11.3916 3.19419 11.2929 3.2929L7.05026 7.53554C6.65973 7.92606 6.65973 8.55923 7.05026 8.94975C7.44078 9.34028 8.07395 9.34028 8.46447 8.94975L10.6586 6.7556Z" fill="currentColor"/>
      <path d="M3 13C3 11.8954 3.89543 11 5 11H8C8.55228 11 9 11.4477 9 12V14C9 15.6569 10.3431 17 12 17C13.6569 17 15 15.6569 15 14V12C15 11.4477 15.4477 11 16 11H19C20.1046 11 21 11.8954 21 13V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V13Z" fill="currentColor"/>
    </svg>`;
  }

  function ChevronUpIcon(): string {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6.29289 15.2071C6.68342 15.5976 7.31658 15.5976 7.70711 15.2071L12 10.9142L16.2929 15.2071C16.6834 15.5976 17.3166 15.5976 17.7071 15.2071C18.0976 14.8166 18.0976 14.1834 17.7071 13.7929L12.7071 8.79289C12.5196 8.60536 12.2652 8.5 12 8.5C11.7348 8.5 11.4804 8.60536 11.2929 8.79289L6.29289 13.7929C5.90237 14.1834 5.90237 14.8166 6.29289 15.2071Z" fill="currentColor"/>
    </svg>`;
  }

  function ChevronDownIcon(): string {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M17.7071 8.79289C17.3166 8.40237 16.6834 8.40237 16.2929 8.79289L12 13.0858L7.70711 8.79289C7.31658 8.40237 6.68342 8.40237 6.29289 8.79289C5.90237 9.18342 5.90237 9.81658 6.29289 10.2071L11.2929 15.2071C11.4804 15.3946 11.7348 15.5 12 15.5C12.2652 15.5 12.5196 15.3946 12.7071 15.2071L17.7071 10.2071C18.0976 9.81658 18.0976 9.18342 17.7071 8.79289Z" fill="currentColor"/>
    </svg>`;
  }

  function SyncIcon(): string {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17107 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22075 18.8289 5.75463 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 7H18.2454L18 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 17H5.75463L6 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // Column resizing functions
  let resizeRAF = $state<number | null>(null);
  let pendingMouseX = $state<number | null>(null);

  function startResize(e: MouseEvent, leftFieldKey: string, rightFieldKey: string) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeStartX = e.pageX;
    resizeLeftColumn = leftFieldKey;
    resizeRightColumn = rightFieldKey;
    resizeInitialLeftWidth = columnWidths[leftFieldKey] || 200;
    resizeInitialRightWidth = columnWidths[rightFieldKey] || 200;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing || !resizeLeftColumn || !resizeRightColumn) return;

    e.preventDefault();
    pendingMouseX = e.pageX;

    if (resizeRAF !== null) return;

    resizeRAF = requestAnimationFrame(() => {
      if (pendingMouseX === null) {
        resizeRAF = null;
        return;
      }

      const deltaX = pendingMouseX - resizeStartX;

      // Calculate new widths based on initial widths and total delta
      const newLeftWidth = Math.round(resizeInitialLeftWidth + deltaX);
      const newRightWidth = Math.round(resizeInitialRightWidth - deltaX);

      // Only proceed if both columns would remain above minimum width
      if (newLeftWidth >= 100 && newRightWidth >= 100) {
        columnWidths = {
          ...columnWidths,
          [resizeLeftColumn]: newLeftWidth,
          [resizeRightColumn]: newRightWidth
        };
      }

      resizeRAF = null;
      pendingMouseX = null;
    });
  }

  function stopResize(e: MouseEvent) {
    e.preventDefault();
    isResizing = false;
    resizeLeftColumn = '';
    resizeRightColumn = '';
    resizeInitialLeftWidth = 0;
    resizeInitialRightWidth = 0;
    pendingMouseX = null;
    if (resizeRAF !== null) {
      cancelAnimationFrame(resizeRAF);
      resizeRAF = null;
    }
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

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

  onMount(() => {
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

  // Location editing functions
  function openLocationModal(objectId: string) {
    const obj = filteredObjects.find(o => o.id === objectId);
    if (obj && obj.location) {
      // Pre-fill with existing coordinates
      locationEditLat = String(obj.location.coordinates[1]);
      locationEditLng = String(obj.location.coordinates[0]);
    } else {
      locationEditLat = '';
      locationEditLng = '';
    }
    locationEditAddress = '';
    locationEditObjectId = objectId;
    locationEditMode = 'manual';
    showLocationModal = true;
  }

  function closeLocationModal() {
    showLocationModal = false;
    locationEditObjectId = null;
    locationEditLat = '';
    locationEditLng = '';
    locationEditAddress = '';
    locationEditMode = 'manual';
    locationEditLoading = false;
  }

  async function geocodeAddress() {
    if (!locationEditAddress.trim()) {
      alert('Wprowadź adres do wyszukania');
      return;
    }

    locationEditLoading = true;

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: locationEditAddress })
      });

      const result = await response.json();

      if (result.success && result.coordinates) {
        locationEditLat = String(result.coordinates.lat);
        locationEditLng = String(result.coordinates.lng);
        // Switch to manual mode to show the found coordinates
        locationEditMode = 'manual';
      } else {
        alert(result.error || 'Nie udało się znaleźć adresu');
      }
    } catch (error) {
      console.error('Geocode error:', error);
      alert('Błąd podczas wyszukiwania adresu');
    } finally {
      locationEditLoading = false;
    }
  }

  async function saveLocation() {
    if (!locationEditObjectId) return;

    const lat = parseFloat(locationEditLat);
    const lng = parseFloat(locationEditLng);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Wprowadź prawidłowe współrzędne');
      return;
    }

    if (lat < -90 || lat > 90) {
      alert('Szerokość geograficzna musi być między -90 a 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      alert('Długość geograficzna musi być między -180 a 180');
      return;
    }

    locationEditLoading = true;

    try {
      const response = await fetch(`/api/objects/${locationEditObjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          clearIncomplete: true // Signal to clear incomplete flags
        })
      });

      if (response.ok) {
        // Update local state
        const objIndex = filteredObjects.findIndex(o => o.id === locationEditObjectId);
        if (objIndex !== -1) {
          filteredObjects[objIndex].location = {
            type: 'Point',
            coordinates: [lng, lat]
          };
          // Clear incomplete data flags if they were only for location
          if (filteredObjects[objIndex].missingFields?.includes('location')) {
            filteredObjects[objIndex].missingFields = filteredObjects[objIndex].missingFields?.filter(f => f !== 'location');
            if (filteredObjects[objIndex].missingFields?.length === 0) {
              filteredObjects[objIndex].hasIncompleteData = false;
            }
          }
          filteredObjects = [...filteredObjects];
        }
        closeLocationModal();
        alert('Lokalizacja została zapisana');
      } else {
        alert('Błąd podczas zapisywania lokalizacji');
      }
    } catch (error) {
      console.error('Save location error:', error);
      alert('Błąd podczas zapisywania lokalizacji');
    } finally {
      locationEditLoading = false;
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
    <div class="list-actions">
      <button class="btn btn-primary" onclick={handleTemplateDownload}>
        {@html DownloadIcon()}
        <span>Export szablonu</span>
      </button>
      <label class="btn btn-primary">
        {@html UploadIcon()}
        <span>Importuj excel</span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onchange={handleExcelImport}
          style="display: none;"
        >
      </label>
      <button class="btn btn-primary" onclick={handleExcelExport}>
        {@html DownloadIcon()}
        <span>Export tabeli</span>
      </button>
    </div>

    <!-- Bulk Edit Toolbar -->
    {#if selectedRows.size > 0}
      <div class="bulk-toolbar">
        <span class="bulk-count">{selectedRows.size} wierszy zaznaczonych</span>
        <button class="btn btn-bulk" onclick={openBulkEditModal}>
          Edytuj zaznaczone
        </button>
        <button class="btn btn-bulk-clear" onclick={() => selectedRows = new Set()}>
          Wyczyść zaznaczenie
        </button>
      </div>
    {/if}

    <div class="table-container">
      <!-- Sticky Header -->
      <div class="table-header">
        <table class="header-table">
          <thead>
            <tr>
              <!-- Checkbox column -->
              <th class="checkbox-column" onclick={toggleSelectAll}>
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredObjects.length && filteredObjects.length > 0}
                  onchange={toggleSelectAll}
                />
              </th>
              {#each data.template.fields.filter(f => f.visible) as field, index}
                <th
                  onclick={() => handleSort(field.key)}
                  class:sorted-asc={sortField === field.key && sortDirection === 'asc'}
                  class:sorted-desc={sortField === field.key && sortDirection === 'desc'}
                  style="width: {columnWidths[field.key] || 200}px; position: relative;"
                >
                  <div class="header-content">
                    <span class="field-name">{getFieldDisplayName(field)}</span>
                    <span class="field-type">({getFieldType(field)})</span>
                    <span class="sort-icon">
                      {#if sortField === field.key}
                        {@html sortDirection === 'asc' ? ChevronUpIcon() : ChevronDownIcon()}
                      {/if}
                    </span>
                  </div>
                  {#if index < data.template.fields.filter(f => f.visible).length - 1}
                    {@const visibleFields = data.template.fields.filter(f => f.visible)}
                    {@const nextField = visibleFields[index + 1]}
                    <div
                      class="column-resizer"
                      onmousedown={(e) => startResize(e, field.key, nextField.key)}
                    ></div>
                  {/if}
                </th>
              {/each}
            </tr>
          </thead>
        </table>
      </div>

      <!-- Scrollable Body -->
      <div class="table-body" bind:this={tableBodyElement}>
        <table class="body-table">
          <tbody>
            {#if filteredObjects.length === 0}
              <tr>
                <td colspan={data.template.fields.filter(f => f.visible).length} class="empty-row">
                  Brak danych do wyświetlenia
                </td>
              </tr>
            {:else}
              {#each filteredObjects as obj, rowIndex}
                {@const isMissingLocation = !obj.location || obj.missingFields?.includes('location')}
                <tr class:incomplete={obj.hasIncompleteData} class:missing-location={isMissingLocation}>
                  <!-- Checkbox column -->
                  <td class="checkbox-column" class:missing-location-cell={isMissingLocation}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(obj.id)}
                      onchange={(e) => handleRowSelection(obj.id, rowIndex, e)}
                    />
                    {#if isMissingLocation}
                      <button
                        class="missing-location-badge"
                        title="Kliknij aby dodać współrzędne"
                        onclick={(e) => {
                          e.stopPropagation();
                          openLocationModal(obj.id);
                        }}
                      >!</button>
                    {/if}
                  </td>
                  {#each data.template.fields.filter(f => f.visible) as field}
                    {@const cellId = `${obj.id}-${field.key}`}
                    {@const isExpanded = expandedCells.has(cellId)}
                    {@const fieldValue = obj.data[field.key]}
                    <td style="width: {columnWidths[field.key] || 200}px;" class:sorted-column={sortField === field.key}>
                      {#if editingCell && editingCell.objectId === obj.id && editingCell.fieldKey === field.key}
                        <div class="edit-field-container">
                          {#if field.type === 'price' && typeof fieldValue === 'object' && fieldValue !== null}
                            <div class="edit-price-container">
                              {#if editingValue.funding && Array.isArray(editingValue.funding)}
                                {#each editingValue.funding as fundingItem, idx}
                                  <div class="edit-price-row">
                                    <span class="edit-label">{fundingItem.source}:</span>
                                    <input
                                      type="number"
                                      bind:value={editingValue.funding[idx].amount}
                                      class="edit-field-input-small"
                                      onkeydown={handleKeydown}
                                    />
                                  </div>
                                {/each}
                              {/if}
                            </div>
                          {:else if field.type === 'multidate' && typeof fieldValue === 'object' && fieldValue !== null}
                            <div class="edit-multidate-container">
                              {#each Object.entries(fieldValue) as [label, date]}
                                <div class="edit-date-row">
                                  <span class="edit-label">{label}:</span>
                                  <input
                                    type="date"
                                    bind:value={editingValue[label]}
                                    class="edit-field-input-small"
                                    onkeydown={handleKeydown}
                                  />
                                </div>
                              {/each}
                            </div>
                          {:else if field.type === 'address' && typeof fieldValue === 'object' && fieldValue !== null}
                            <div class="edit-address-container">
                              <div class="edit-date-row">
                                <span class="edit-label">Ulica:</span>
                                <input
                                  type="text"
                                  bind:value={editingValue.street}
                                  class="edit-field-input-small"
                                  onkeydown={handleKeydown}
                                />
                              </div>
                              <div class="edit-date-row">
                                <span class="edit-label">Numer:</span>
                                <input
                                  type="text"
                                  bind:value={editingValue.number}
                                  class="edit-field-input-small"
                                  onkeydown={handleKeydown}
                                />
                              </div>
                              <div class="edit-date-row">
                                <span class="edit-label">Kod:</span>
                                <input
                                  type="text"
                                  bind:value={editingValue.postalCode}
                                  class="edit-field-input-small"
                                  onkeydown={handleKeydown}
                                />
                              </div>
                              <div class="edit-date-row">
                                <span class="edit-label">Miasto:</span>
                                <input
                                  type="text"
                                  bind:value={editingValue.city}
                                  class="edit-field-input-small"
                                  onkeydown={handleKeydown}
                                />
                              </div>
                              <div class="edit-date-row">
                                <span class="edit-label">Gmina:</span>
                                <input
                                  type="text"
                                  bind:value={editingValue.gmina}
                                  class="edit-field-input-small"
                                  onkeydown={handleKeydown}
                                />
                              </div>
                            </div>
                          {:else if field.type === 'links' && Array.isArray(fieldValue)}
                            <div class="edit-links-container">
                              {#each fieldValue as link, idx}
                                <div class="edit-link-row">
                                  <input
                                    type="text"
                                    bind:value={editingValue[idx].text}
                                    placeholder="Tekst"
                                    class="edit-field-input-small"
                                    onkeydown={handleKeydown}
                                  />
                                  <input
                                    type="text"
                                    bind:value={editingValue[idx].url}
                                    placeholder="URL"
                                    class="edit-field-input-small"
                                    onkeydown={handleKeydown}
                                  />
                                </div>
                              {/each}
                            </div>
                          {:else if field.type === 'richtext'}
                            <textarea
                              bind:value={editingValue}
                              class="edit-field-textarea"
                              onkeydown={handleKeydown}
                              use:focus
                            ></textarea>
                          {:else if field.type === 'text' || field.type === 'email' || field.type === 'url'}
                            <input
                              type="text"
                              bind:value={editingValue}
                              class="edit-field-input"
                              onkeydown={handleKeydown}
                              use:focus
                            />
                          {:else if field.type === 'number' || field.type === 'currency' || field.type === 'percentage'}
                            <input
                              type="number"
                              bind:value={editingValue}
                              class="edit-field-input"
                              onkeydown={handleKeydown}
                              use:focus
                            />
                          {:else if field.type === 'textarea'}
                            <textarea
                              bind:value={editingValue}
                              class="edit-field-textarea"
                              onkeydown={handleKeydown}
                              use:focus
                            ></textarea>
                          {:else if field.type === 'checkbox'}
                            <input
                              type="checkbox"
                              bind:checked={editingValue}
                              class="edit-field-checkbox"
                              onkeydown={handleKeydown}
                              use:focus
                            />
                          {:else if field.type === 'date'}
                            <input
                              type="date"
                              bind:value={editingValue}
                              class="edit-field-input"
                              onkeydown={handleKeydown}
                              use:focus
                            />
                          {:else}
                            <input
                              type="text"
                              bind:value={editingValue}
                              class="edit-field-input"
                              onkeydown={handleKeydown}
                              use:focus
                            />
                          {/if}
                          <div class="edit-buttons">
                            <button class="edit-save-btn" onclick={saveEdit} title="Zapisz (Ctrl+Enter)">
                              ✓
                            </button>
                            <button class="edit-cancel-btn" onclick={cancelEdit} title="Anuluj">
                              ✕
                            </button>
                          </div>
                        </div>
                      {:else}
                        <div
                          class="cell-content"
                          class:expanded={isExpanded}
                          onclick={() => toggleCellExpansion(obj.id, field.key)}
                          ondblclick={() => startEditingCell(obj.id, field.key, obj.data[field.key])}
                        >
                          {#if obj.hasIncompleteData && !fieldValue}
                            <span class="missing-data">—</span>
                          {:else if field.type === 'price' && typeof fieldValue === 'object' && fieldValue !== null}
                            {@const priceData = fieldValue as PriceData}
                            {@const calculatedTotal = priceData.funding?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0}
                            {@const totalStr = formatPrice(calculatedTotal)}
                            {@const maxLength = totalStr.length}
                            <div class="price-container">
                              <div class="sub-fields">
                                {#if priceData.funding && Array.isArray(priceData.funding)}
                                  {#each priceData.funding as fundingItem}
                                    {@const amountStr = formatPrice(fundingItem.amount)}
                                    {@const padding = maxLength - amountStr.length}
                                    <div class="sub-field-row">
                                      <span class="sub-label">{fundingItem.source}:</span>
                                      <span class="sub-value" style="padding-left: {padding}ch;">{amountStr} zł</span>
                                    </div>
                                  {/each}
                                  {#if priceData.showTotal !== false && calculatedTotal > 0}
                                    <div class="sub-field-row total-row">
                                      <span class="sub-label">Suma:</span>
                                      <span class="sub-value">{totalStr} zł</span>
                                    </div>
                                  {/if}
                                {/if}
                              </div>
                            </div>
                          {:else if field.type === 'multidate' && typeof fieldValue === 'object' && fieldValue !== null}
                            {@const dateData = fieldValue}
                            <div class="sub-fields">
                              {#each Object.entries(dateData) as [label, date]}
                                <div class="sub-field-row">
                                  <span class="sub-label">{label}:</span>
                                  <span class="sub-value">{new Date(date).toLocaleDateString('pl-PL')}</span>
                                </div>
                              {/each}
                            </div>
                          {:else if field.type === 'address' && typeof fieldValue === 'object' && fieldValue !== null}
                            {@const addressData = fieldValue}
                            <div class="address-display-container">
                              <div class="sub-fields">
                                {#if addressData.street}
                                  <div class="sub-field-row">
                                    <span class="sub-label">Ulica:</span>
                                    <span class="sub-value">{addressData.street}{#if addressData.number} {addressData.number}{/if}</span>
                                  </div>
                                {/if}
                                {#if addressData.postalCode}
                                  <div class="sub-field-row">
                                    <span class="sub-label">Kod:</span>
                                    <span class="sub-value">{addressData.postalCode}</span>
                                  </div>
                                {/if}
                                {#if addressData.city}
                                  <div class="sub-field-row">
                                    <span class="sub-label">Miasto:</span>
                                    <span class="sub-value">{addressData.city}</span>
                                  </div>
                                {/if}
                                {#if addressData.gmina}
                                  <div class="sub-field-row">
                                    <span class="sub-label">Gmina:</span>
                                    <span class="sub-value">{addressData.gmina}</span>
                                  </div>
                                {/if}
                              </div>
                              <button
                                class="sync-address-btn"
                                onclick={(e) => {
                                  e.stopPropagation();
                                  syncAddressWithLocation(obj.id);
                                }}
                                title="Synchronizuj adres z lokalizacją"
                              >
                                {@html SyncIcon()}
                              </button>
                            </div>
                          {:else if field.type === 'links' && Array.isArray(fieldValue) && fieldValue.length > 0}
                            <div class="sub-fields">
                              {#each fieldValue as link}
                                <div class="sub-field-row">
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" class="sub-value">
                                    {link.text || link.url}
                                  </a>
                                </div>
                              {/each}
                            </div>
                          {:else if field.type === 'tags'}
                            {#if fieldValue && typeof fieldValue === 'object' && fieldValue !== null && 'majorTag' in fieldValue}
                              {@const tagData = fieldValue as CategoryFieldData}
                              {@const majorTag = data.template.tags?.find(t => t.id === tagData.majorTag)}
                              {#if majorTag}
                                <span class="tag-display" style="background-color: {majorTag.color}">
                                  {majorTag.displayName || majorTag.name}
                                </span>
                              {/if}
                            {:else}
                              <span class="missing-data">—</span>
                            {/if}
                          {:else}
                            <span class="field-value">
                              {formatFieldValue(field, fieldValue)}
                            </span>
                          {/if}
                        </div>
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}

              <!-- Placeholder rows to fill screen -->
              {#each Array(placeholderRowCount).fill(null) as _, index}
                <tr class="placeholder-row" class:even={index % 2 === 0}>
                  <td class="checkbox-column">
                    <div class="cell-content placeholder-cell"></div>
                  </td>
                  {#each data.template.fields.filter(f => f.visible) as field}
                    <td style="width: {columnWidths[field.key] || 200}px;" class:sorted-column={sortField === field.key}>
                      <div class="cell-content placeholder-cell"></div>
                    </td>
                  {/each}
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk Edit Modal -->
    {#if showBulkEditModal}
      <div class="bulk-modal-overlay" onclick={closeBulkEditModal}>
        <div class="bulk-modal" onclick={(e) => e.stopPropagation()}>
          <h2>Edycja zaznaczonych wierszy</h2>
          <p class="bulk-modal-info">Edytujesz {selectedRows.size} wierszy</p>

          <div class="bulk-modal-form">
            <div class="form-group">
              <label for="bulkEditField">Pole do edycji:</label>
              <select id="bulkEditField" bind:value={bulkEditField}>
                {#each data.template.fields.filter(f => f.visible) as field}
                  <option value={field.key}>{getFieldDisplayName(field)}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="bulkEditValue">Nowa wartość:</label>
              {#if data.template.fields.find(f => f.key === bulkEditField)?.type === 'checkbox'}
                <select id="bulkEditValue" bind:value={bulkEditValue}>
                  <option value={true}>Tak</option>
                  <option value={false}>Nie</option>
                </select>
              {:else if data.template.fields.find(f => f.key === bulkEditField)?.type === 'number' || data.template.fields.find(f => f.key === bulkEditField)?.type === 'currency'}
                <input
                  id="bulkEditValue"
                  type="number"
                  bind:value={bulkEditValue}
                  placeholder="Wprowadź wartość"
                />
              {:else if data.template.fields.find(f => f.key === bulkEditField)?.type === 'date'}
                <input
                  id="bulkEditValue"
                  type="date"
                  bind:value={bulkEditValue}
                />
              {:else}
                <input
                  id="bulkEditValue"
                  type="text"
                  bind:value={bulkEditValue}
                  placeholder="Wprowadź wartość"
                />
              {/if}
            </div>
          </div>

          <div class="bulk-modal-actions">
            <button class="btn btn-primary" onclick={applyBulkEdit}>
              Zastosuj
            </button>
            <button class="btn btn-secondary" onclick={closeBulkEditModal}>
              Anuluj
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Column Mapping Modal for Excel Import -->
    {#if showMappingModal}
      <div class="mapping-modal-overlay" onclick={closeMappingModal}>
        <div class="mapping-modal" onclick={(e) => e.stopPropagation()}>
          <h2>Mapowanie kolumn Excel</h2>
          <p class="mapping-modal-info">
            Przypisz kolumny z pliku Excel do pól w schemacie.
            Znaleziono {excelAllData.length} wierszy do importu.
          </p>

          {#if importInProgress}
            <div class="import-progress">
              <div class="spinner"></div>
              <p>Importowanie danych...</p>
            </div>
          {:else}
            <!-- Column mapping table -->
            <div class="mapping-table-container">
              <table class="mapping-table">
                <thead>
                  <tr>
                    <th>Kolumna Excel</th>
                    <th>Przykładowe dane</th>
                    <th>Pole w schemacie</th>
                  </tr>
                </thead>
                <tbody>
                  {#each excelHeaders as header}
                    <tr>
                      <td class="mapping-excel-col">{header}</td>
                      <td class="mapping-sample">
                        {#if excelSampleData.length > 0}
                          <span class="sample-value">{excelSampleData[0]?.[header] || '—'}</span>
                          {#if excelSampleData.length > 1}
                            <span class="sample-value">{excelSampleData[1]?.[header] || '—'}</span>
                          {/if}
                        {:else}
                          <span class="sample-value">—</span>
                        {/if}
                      </td>
                      <td class="mapping-field-select">
                        <select bind:value={columnMapping[header]}>
                          <option value="">— Pomiń —</option>
                          <option value="_skip">— Pomiń —</option>
                          <optgroup label="Współrzędne">
                            <option value="_latitude">Szerokość (latitude)</option>
                            <option value="_longitude">Długość (longitude)</option>
                          </optgroup>
                          <optgroup label="Pola schematu">
                            {#each data.template?.fields || [] as field}
                              <option value={field.key}>{getFieldDisplayName(field)}</option>
                            {/each}
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <!-- Import info -->
            <div class="mapping-info">
              <p>
                <strong>Uwaga:</strong> Rekordy bez współrzędnych zostaną zaimportowane jako niekompletne
                i nie będą widoczne na mapie (tylko w widoku listy).
              </p>
            </div>

            <div class="mapping-modal-actions">
              <button class="btn btn-primary" onclick={executeImportWithMapping} disabled={importInProgress}>
                Importuj {excelAllData.length} rekordów
              </button>
              <button class="btn btn-secondary" onclick={closeMappingModal} disabled={importInProgress}>
                Anuluj
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Location Edit Modal -->
    {#if showLocationModal}
      <div class="location-modal-overlay" onclick={closeLocationModal}>
        <div class="location-modal" onclick={(e) => e.stopPropagation()}>
          <h2>Ustaw lokalizację</h2>
          <p class="location-modal-info">
            Wprowadź współrzędne ręcznie lub wyszukaj adres.
          </p>

          <!-- Mode tabs -->
          <div class="location-mode-tabs">
            <button
              class="mode-tab"
              class:active={locationEditMode === 'manual'}
              onclick={() => locationEditMode = 'manual'}
            >
              Wprowadź współrzędne
            </button>
            <button
              class="mode-tab"
              class:active={locationEditMode === 'geocode'}
              onclick={() => locationEditMode = 'geocode'}
            >
              Wyszukaj adres
            </button>
          </div>

          {#if locationEditLoading}
            <div class="location-loading">
              <div class="spinner"></div>
              <p>Wyszukiwanie...</p>
            </div>
          {:else}
            {#if locationEditMode === 'manual'}
              <div class="location-form">
                <div class="form-group">
                  <label for="locationLat">Szerokość geograficzna (latitude):</label>
                  <input
                    id="locationLat"
                    type="number"
                    step="any"
                    bind:value={locationEditLat}
                    placeholder="np. 49.5123"
                  />
                </div>
                <div class="form-group">
                  <label for="locationLng">Długość geograficzna (longitude):</label>
                  <input
                    id="locationLng"
                    type="number"
                    step="any"
                    bind:value={locationEditLng}
                    placeholder="np. 19.1234"
                  />
                </div>
              </div>
            {:else}
              <div class="location-form">
                <div class="form-group">
                  <label for="locationAddress">Adres do wyszukania:</label>
                  <input
                    id="locationAddress"
                    type="text"
                    bind:value={locationEditAddress}
                    placeholder="np. Jeleśnia, ul. Główna 1"
                  />
                </div>
                <button class="btn btn-geocode" onclick={geocodeAddress}>
                  Wyszukaj
                </button>

                {#if locationEditLat && locationEditLng}
                  <div class="geocode-result">
                    <p>Znaleziono współrzędne:</p>
                    <p><strong>Lat:</strong> {locationEditLat}</p>
                    <p><strong>Lng:</strong> {locationEditLng}</p>
                  </div>
                {/if}
              </div>
            {/if}
          {/if}

          <div class="location-modal-actions">
            <button
              class="btn btn-primary"
              onclick={saveLocation}
              disabled={locationEditLoading || !locationEditLat || !locationEditLng}
            >
              Zapisz lokalizację
            </button>
            <button class="btn btn-secondary" onclick={closeLocationModal} disabled={locationEditLoading}>
              Anuluj
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
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

  .list-actions {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    padding: var(--space-3);
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
  }

  .table-body {
    flex: 1;
    overflow: auto;
  }

  .header-table, .body-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
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
    align-items: flex-start;
    gap: var(--space-2);
    padding: 8px 0;
  }

  .field-name {
    font-weight: 400;
    color: black;
  }

  .field-type {
    font-family: "Space Mono", monospace;
    font-size: 14px;
    color: #999;
  }

  .sort-icon {
    margin-left: auto;
    font-size: var(--text-xs);
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

  .missing-location-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    background: #dc2626;
    color: white;
    border-radius: 50%;
    font-size: 11px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: help;
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
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    line-height: 1.4;
  }

  .cell-content.expanded {
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
    height: calc(100vh - 200px);
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
    background: rgba(0, 0, 0, 0.2);
  }

  .column-resizer:hover::before {
    background: rgba(0, 0, 0, 0.4);
    width: 2px;
  }

  /* Modern table design improvements */
  .header-table th {
    background: var(--color-surface);
    padding: 12px 12px 16px 12px;
    text-align: left;
    font-family: var(--font-ui);
    font-weight: var(--font-weight-bold);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    cursor: pointer;
    user-select: none;
    transition: background-color var(--transition-fast);
    position: relative;
    border-bottom: 2px solid var(--color-border);
    box-sizing: border-box;
  }

  .header-table th.sorted-asc,
  .header-table th.sorted-desc {
    background: #d0d0d0;
    color: var(--color-text-primary);
  }

  .field-name {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .body-table td {
    padding: 8px 12px;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    vertical-align: top;
    box-sizing: border-box;
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

  /* Bulk toolbar styles */
  .bulk-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: var(--radius-base);
    margin-bottom: var(--space-4);
  }

  .bulk-count {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: #0c4a6e;
  }

  .btn-bulk {
    background: #0ea5e9;
    color: white;
  }

  .btn-bulk:hover {
    background: #0284c7;
  }

  .btn-bulk-clear {
    background: #ef4444;
    color: white;
  }

  .btn-bulk-clear:hover {
    background: #dc2626;
  }

  /* Bulk edit modal styles */
  .bulk-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .bulk-modal {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 500px;
    width: 90%;
    box-shadow: var(--shadow-lg);
  }

  .bulk-modal h2 {
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .bulk-modal-info {
    margin: 0 0 var(--space-4) 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .bulk-modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-group label {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .form-group select,
  .form-group input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: white;
  }

  .form-group select:focus,
  .form-group input:focus {
    outline: none;
    border-color: #0ea5e9;
  }

  .bulk-modal-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
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
    margin-top: 2px;
  }

  .sync-address-btn:hover {
    background: #7c3aed;
    transform: scale(1.05);
  }

  .sync-address-btn:active {
    transform: scale(0.95);
  }

  /* Column Mapping Modal styles */
  .mapping-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .mapping-modal {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 800px;
    width: 95%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
  }

  .mapping-modal h2 {
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .mapping-modal-info {
    margin: 0 0 var(--space-4) 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .mapping-table-container {
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
  }

  .mapping-table {
    width: 100%;
    border-collapse: collapse;
  }

  .mapping-table th {
    position: sticky;
    top: 0;
    background: var(--color-surface);
    padding: var(--space-3);
    text-align: left;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    border-bottom: 2px solid var(--color-border);
  }

  .mapping-table td {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .mapping-table tbody tr:nth-child(even) {
    background: #f8f9fa;
  }

  .mapping-table tbody tr:hover {
    background: #e9ecef;
  }

  .mapping-excel-col {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mapping-sample {
    max-width: 200px;
    overflow: hidden;
  }

  .sample-value {
    display: block;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 0;
  }

  .mapping-field-select select {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: white;
    cursor: pointer;
  }

  .mapping-field-select select:focus {
    outline: none;
    border-color: #0ea5e9;
  }

  .mapping-info {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: var(--radius-base);
    padding: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .mapping-info p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #92400e;
  }

  .mapping-modal-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

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

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Location Edit Modal styles */
  .location-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .location-modal {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 500px;
    width: 95%;
    box-shadow: var(--shadow-lg);
  }

  .location-modal h2 {
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .location-modal-info {
    margin: 0 0 var(--space-4) 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .location-mode-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: var(--space-2);
  }

  .mode-tab {
    background: none;
    border: none;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: var(--radius-base);
    transition: all var(--transition-fast);
  }

  .mode-tab:hover {
    background: var(--color-surface);
  }

  .mode-tab.active {
    background: #0ea5e9;
    color: white;
  }

  .location-form {
    margin-bottom: var(--space-4);
  }

  .location-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    gap: var(--space-3);
  }

  .location-loading p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .btn-geocode {
    background: #10b981;
    color: white;
    width: 100%;
    margin-top: var(--space-2);
  }

  .btn-geocode:hover {
    background: #059669;
  }

  .geocode-result {
    margin-top: var(--space-3);
    padding: var(--space-3);
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: var(--radius-base);
  }

  .geocode-result p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #065f46;
  }

  .geocode-result p + p {
    margin-top: var(--space-1);
  }

  .location-modal-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  /* Update missing location badge to be a button */
  .missing-location-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 11px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
    padding: 0;
  }

  .missing-location-badge:hover {
    background: #b91c1c;
    transform: scale(1.1);
  }

</style>
