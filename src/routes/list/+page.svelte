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
  let manuallyResizedColumns = $state<Set<string>>(new Set());
  let isResizing = $state(false);
  let justFinishedResizing = $state(false);
  let resizeStartX = $state(0);
  let resizeLeftColumn = $state('');
  let resizeRightColumn = $state('');
  let resizeInitialLeftWidth = $state(0);
  let resizeInitialRightWidth = $state(0);
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

  // Quick geocoding state
  let quickGeocodingIds = $state<Set<string>>(new Set());

  // Geocoding request queue to prevent rate limiting
  let geocodingQueue: Array<{objectId: string; address: string}> = [];
  let isProcessingQueue = false;

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
      const newWidths: Record<string, number> = {};

      data.template.fields
        .filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location')
        .forEach(field => {
          newWidths[field.key] = calculateContentBasedWidth(field, filteredObjects);
        });

      columnWidths = newWidths;
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

  function convertValueByFieldType(value: string, fieldType: string): any {
    if (!value || value === '') return null;

    try {
      switch (fieldType) {
        // New field types - most accept text as-is
        case 'richtext':
        case 'files':
        case 'gallery':
        case 'multidate':
        case 'address':
        case 'links':
        case 'tags':
        case 'category':
          return value; // Store as text, will be processed by field editor

        case 'price':
          // Try to parse as number for price
          const priceNum = parseFloat(value.replace(/,/g, '.').replace(/[^\d.-]/g, ''));
          return isNaN(priceNum) ? value : priceNum;

        // Legacy field types (for backward compatibility)
        case 'number':
        case 'currency':
        case 'percentage':
          const num = parseFloat(value.replace(/,/g, '.').replace(/[^\d.-]/g, ''));
          return isNaN(num) ? null : num;

        case 'checkbox':
          const lower = value.toLowerCase().trim();
          return lower === 'true' || lower === 'tak' || lower === 'yes' || lower === '1';

        case 'date':
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date.toISOString();

        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            console.warn(`Invalid email: ${value}`);
          }
          return value;

        case 'url':
        case 'image':
        case 'youtube':
          if (!/^https?:\/\/.+/.test(value)) {
            console.warn(`Invalid URL: ${value}`);
          }
          return value;

        case 'text':
        case 'textarea':
        case 'select':
        default:
          return value;
      }
    } catch (error) {
      console.error(`Error converting value "${value}" for type ${fieldType}:`, error);
      return value; // Return original value on error
    }
  }

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
    const fieldTypeMap: Record<string, string> = {};
    if (data.template.fields) {
      for (const field of data.template.fields) {
        fieldTypeMap[field.key] = field.type || field.fieldType || 'text';
      }
    }

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
    if (isResizing || justFinishedResizing) return;

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
    const formattedValue = formatFieldValue(field, fieldValue);
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

    // All legacy field type handlers removed - using modern field types only
    return String(value);
  }

  function calculateContentBasedWidth(field: any, objects: SavedObject[]): number {
    const MAX_WIDTH_CH = 25; // Max width for columns
    const MIN_WIDTH_PX = 100; // Existing minimum from resize
    const PADDING_CH = 2; // Extra space for padding/breathing room
    const SAMPLE_SIZE = 100; // Only sample first 100 rows for performance
    const MAX_HEADER_WIDTH_CH = 15; // Allow headers longer than this to wrap

    // Calculate header width (field name + type)
    const headerText = `${field.name || field.key} (${field.type})`;
    // Don't force long headers to fit on one line - allow them to wrap
    const headerLength = Math.min(headerText.length, MAX_HEADER_WIDTH_CH);
    let maxContentLength = headerLength;

    // Sample only first N objects for performance (usually first 100 rows is representative)
    const sampleObjects = objects.slice(0, SAMPLE_SIZE);

    sampleObjects.forEach(obj => {
      const value = obj.data[field.key];
      if (!value) return;

      // Get text representation of the field value
      const textValue = formatFieldValue(field, value);
      if (textValue && textValue !== '—') {
        // For multi-line fields, use the longest line
        const lines = String(textValue).split('\n');
        const longestLine = Math.max(...lines.map(line => line.length));
        maxContentLength = Math.max(maxContentLength, longestLine);
      }
    });

    // Calculate width in ch, apply max constraint
    const widthInCh = Math.min(maxContentLength + PADDING_CH, MAX_WIDTH_CH);

    // Convert ch to pixels (approximate: 1ch ≈ 8px in Space Mono)
    const widthInPx = widthInCh * 8;

    // Apply minimum constraint
    return Math.max(widthInPx, MIN_WIDTH_PX);
  }

  function getFieldDisplayName(field: any): string {
    return field.displayLabel || field.label;
  }

  function getFieldType(field: any): string {
    // Modern field types only
    const typeMap: Record<string, string> = {
      'title': 'tytuł',
      'location': 'lokalizacja',
      'richtext': 'tekst sformatowany',
      'files': 'pliki',
      'gallery': 'galeria',
      'multidate': 'wielodata',
      'address': 'adres',
      'links': 'linki',
      'tags': 'tagi',
      'price': 'cena',
      'category': 'kategoria'
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
    resizeRightColumn = ''; // Not used anymore - right column just gets pushed
    resizeInitialLeftWidth = columnWidths[leftFieldKey] || 200;
    resizeInitialRightWidth = 0; // Not used anymore
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing || !resizeLeftColumn) return;

    e.preventDefault();
    pendingMouseX = e.pageX;

    if (resizeRAF !== null) return;

    resizeRAF = requestAnimationFrame(() => {
      if (pendingMouseX === null) {
        resizeRAF = null;
        return;
      }

      const deltaX = pendingMouseX - resizeStartX;

      // Calculate new width for left column only - right columns get pushed
      const newLeftWidth = Math.round(resizeInitialLeftWidth + deltaX);

      // Only proceed if column remains above minimum width
      if (newLeftWidth >= 100) {
        columnWidths = {
          ...columnWidths,
          [resizeLeftColumn]: newLeftWidth
        };
      }

      resizeRAF = null;
      pendingMouseX = null;
    });
  }

  function stopResize(e: MouseEvent) {
    e.preventDefault();
    isResizing = false;

    // Set flag to prevent click events from triggering sort immediately after resize
    justFinishedResizing = true;
    setTimeout(() => {
      justFinishedResizing = false;
    }, 150);

    // Mark only the left column as manually resized (right column just gets pushed, not resized)
    const newManuallyResized = new Set(manuallyResizedColumns);
    if (resizeLeftColumn) {
      newManuallyResized.add(resizeLeftColumn);
    }
    manuallyResizedColumns = newManuallyResized;

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

  // Extract address from object's data (looks for address-type fields or text fields that might contain addresses)
  function extractAddressFromObject(obj: SavedObject): string | null {
    if (!data.template) return null;

    // Priority 1: Look for 'address' type fields
    const addressFields = data.template.fields.filter(f => f.type === 'address' || f.fieldType === 'address');
    for (const field of addressFields) {
      const addressData = obj.data[field.key];

      // Handle structured address object
      if (addressData && typeof addressData === 'object') {
        const parts = [];
        if (addressData.street) parts.push(addressData.street);
        if (addressData.number) parts.push(addressData.number);
        if (addressData.city) parts.push(addressData.city);
        if (addressData.gmina) parts.push(addressData.gmina);
        if (addressData.postalCode) parts.push(addressData.postalCode);

        // Even if we only have gmina or postal code, return it
        if (parts.length > 0) return parts.join(', ');
      }

      // Handle string dumped into address field (Excel import case)
      if (addressData && typeof addressData === 'string') {
        const trimmed = addressData.trim();
        if (trimmed.length > 2) return trimmed;
      }
    }

    // Priority 2: Look for fields with 'adres' in the name
    const addressLikeFields = data.template.fields.filter(f =>
      f.key?.toLowerCase().includes('adres') ||
      f.displayLabel?.toLowerCase().includes('adres') ||
      f.label?.toLowerCase().includes('adres')
    );
    for (const field of addressLikeFields) {
      const value = obj.data[field.key];

      // Handle string addresses
      if (value && typeof value === 'string' && value.trim().length > 5) {
        return value.trim();
      }

      // Handle address object that might be in a field with "adres" in name
      if (value && typeof value === 'object') {
        const parts = [];
        if (value.street) parts.push(value.street);
        if (value.number) parts.push(value.number);
        if (value.city) parts.push(value.city);
        if (value.postalCode) parts.push(value.postalCode);
        if (value.gmina) parts.push(value.gmina);
        if (parts.length > 0) return parts.join(' ');
      }
    }

    // Priority 3: Look for gmina + postal code fields separately and combine them
    const gminaFields = data.template.fields.filter(f =>
      f.key?.toLowerCase().includes('gmina') ||
      f.label?.toLowerCase().includes('gmina')
    );
    const postalCodeFields = data.template.fields.filter(f =>
      f.key?.toLowerCase().includes('kod') ||
      f.key?.toLowerCase().includes('postal') ||
      f.label?.toLowerCase().includes('kod pocztowy')
    );

    let gminaValue = '';
    let postalValue = '';

    for (const field of gminaFields) {
      const value = obj.data[field.key];
      if (value && typeof value === 'string' && value.trim().length > 2) {
        gminaValue = value.trim();
        break;
      }
    }

    for (const field of postalCodeFields) {
      const value = obj.data[field.key];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        postalValue = value.trim();
        break;
      }
    }

    // If we have gmina or postal code, combine them
    if (gminaValue || postalValue) {
      const parts = [];
      if (gminaValue) parts.push(gminaValue);
      if (postalValue) parts.push(postalValue);
      return parts.join(', ');
    }

    // Priority 4: Look for fields with location/miejsce/lokalizacja in name
    const locationFields = data.template.fields.filter(f =>
      f.key?.toLowerCase().includes('miejsce') ||
      f.key?.toLowerCase().includes('lokalizacja') ||
      f.key?.toLowerCase().includes('location') ||
      f.label?.toLowerCase().includes('miejsce') ||
      f.label?.toLowerCase().includes('lokalizacja')
    );
    for (const field of locationFields) {
      const value = obj.data[field.key];
      if (value && typeof value === 'string' && value.trim().length > 3) {
        return value.trim();
      }
    }

    // Priority 5: Look for text fields that might contain addresses
    const textFields = data.template.fields.filter(f =>
      (f.type === 'richtext' || f.type === 'textarea' || f.type === 'text') &&
      !f.key?.toLowerCase().includes('opis') && // Exclude description fields
      !f.key?.toLowerCase().includes('uwag') && // Exclude notes
      !f.key?.toLowerCase().includes('description')
    );
    for (const field of textFields) {
      const value = obj.data[field.key];
      if (value && typeof value === 'string') {
        const trimmed = value.trim();
        // Check if it looks like an address (has at least one digit or comma, and multiple words)
        if (trimmed.length > 5 && (/\d/.test(trimmed) || /,/.test(trimmed)) && trimmed.split(/[\s,]+/).length >= 2) {
          return trimmed;
        }
      }
    }

    return null;
  }

  // Process geocoding queue - one at a time with delays
  async function processGeocodingQueue() {
    if (isProcessingQueue || geocodingQueue.length === 0) {
      return;
    }

    isProcessingQueue = true;

    while (geocodingQueue.length > 0) {
      const request = geocodingQueue.shift();
      if (!request) break;

      const { objectId, address } = request;

      console.log(`Processing queue: ${geocodingQueue.length + 1} remaining, geocoding: ${address}`);

      // Add to loading set
      quickGeocodingIds.add(objectId);
      quickGeocodingIds = new Set(quickGeocodingIds);

      try {
        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });

        if (!response.ok) {
          throw new Error('Geocoding failed');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          console.error(`Failed to geocode: ${address}`);
          // Don't alert for queued items, just log
        } else {
          // Save coordinates
          const { lat, lng } = result.data;
          const locationResponse = await fetch(`/api/objects/${objectId}`, {
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
              const objIndex = filteredObjects.findIndex(o => o.id === objectId);
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
            console.log(`✓ Geocoded: ${address} -> ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        }
      } catch (error) {
        console.error('Queue geocode error:', error);
      } finally {
        // Remove from loading set
        quickGeocodingIds.delete(objectId);
        quickGeocodingIds = new Set(quickGeocodingIds);
      }

      // Wait 1.5 seconds between addresses to respect Nominatim rate limits
      // (each address may make multiple queries internally with 500ms delays)
      if (geocodingQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    isProcessingQueue = false;
    console.log('Geocoding queue completed');
  }

  // Quick geocode function - adds to queue instead of running immediately
  async function quickGeocodePin(objectId: string) {
    const obj = filteredObjects.find(o => o.id === objectId);
    if (!obj) return;

    const address = extractAddressFromObject(obj);
    if (!address) {
      alert('Nie znaleziono pola z adresem dla tego obiektu.');
      return;
    }

    // Check if already in queue
    if (geocodingQueue.some(r => r.objectId === objectId)) {
      alert('Ten obiekt jest już w kolejce do geokodowania');
      return;
    }

    // Check if already being processed
    if (quickGeocodingIds.has(objectId)) {
      alert('Ten obiekt jest obecnie geokodowany');
      return;
    }

    console.log('Adding to geocoding queue:', address);

    // Add to queue
    geocodingQueue.push({ objectId, address });
    geocodingQueue = [...geocodingQueue];

    // Show immediate feedback
    if (geocodingQueue.length === 1) {
      alert(`Rozpoczęto geokodowanie dla adresu: ${address}`);
    } else {
      alert(`Dodano do kolejki (pozycja ${geocodingQueue.length}): ${address}`);
    }

    // Start processing queue
    processGeocodingQueue();
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
        <button class="btn btn-bulk-delete" onclick={deleteSelected}>
          Usuń zaznaczone
        </button>
        <button class="btn btn-bulk-clear" onclick={() => selectedRows = new Set()}>
          Wyczyść zaznaczenie
        </button>
      </div>
    {/if}

    <div class="table-container">
      <!-- Sticky Header -->
      <div class="table-header" bind:this={tableHeaderElement}>
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
              <!-- Location column (always visible) -->
              <th class="location-column">
                <div class="header-content">
                  <div class="header-text">
                    <span class="field-name">Lokalizacja</span>
                    <span class="field-type">(współrzędne)</span>
                  </div>
                </div>
              </th>
              {#each data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location') as field, index}
                <th
                  onclick={() => handleSort(field.key)}
                  class:sorted-asc={sortField === field.key && sortDirection === 'asc'}
                  class:sorted-desc={sortField === field.key && sortDirection === 'desc'}
                  style="width: {columnWidths[field.key] || 200}px; position: relative;"
                >
                  <div class="header-content">
                    <div class="header-text">
                      <span class="field-name">{getFieldDisplayName(field)}</span>
                      <span class="field-type">({getFieldType(field)})</span>
                    </div>
                    {#if sortField === field.key}
                      <span class="sort-icon">
                        {@html sortDirection === 'asc' ? ChevronUpIcon() : ChevronDownIcon()}
                      </span>
                    {/if}
                  </div>
                  {#if index < data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location').length - 1}
                    {@const visibleFields = data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location')}
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
      <div class="table-body" bind:this={tableBodyElement} onscroll={syncHeaderScroll}>
        <table class="body-table">
          <tbody>
            {#if filteredObjects.length === 0}
              <tr>
                <td colspan={data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location').length + 2} class="empty-row">
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
                      onclick={(e) => handleRowSelection(obj.id, rowIndex, e)}
                    />
                  </td>
                  <!-- Location column -->
                  <td class="location-column" class:missing-location-cell={isMissingLocation}>
                    {#if obj.location && obj.location.coordinates}
                      <div class="cell-content coordinates-display">
                        <div class="coordinate-line">{obj.location.coordinates[1].toFixed(6)}</div>
                        <div class="coordinate-line">{obj.location.coordinates[0].toFixed(6)}</div>
                      </div>
                    {:else}
                      {@const hasAddress = extractAddressFromObject(obj) !== null}
                      {@const isGeocoding = quickGeocodingIds.has(obj.id)}
                      <div class="cell-content missing-location-row">
                        <div class="missing-location-text">Brak</div>
                        {#if hasAddress && !isGeocoding}
                          <button
                            class="quick-geocode-btn"
                            title="Automatyczne geokodowanie z adresu"
                            onclick={(e) => {
                              e.stopPropagation();
                              quickGeocodePin(obj.id);
                            }}
                          >
                            Geokoduj
                          </button>
                        {/if}
                        {#if isGeocoding}
                          <div class="geocoding-status-inline">⏳</div>
                        {/if}
                      </div>
                    {/if}
                  </td>
                  {#each data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location') as field}
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
                          {:else}
                            <!-- Default text input for other modern field types -->
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
                          onmouseenter={(e) => {
                            hoverCell = {objectId: obj.id, fieldKey: field.key};
                            if (!isExpanded) {
                              const target = e.currentTarget as HTMLElement;
                              let shouldShowTooltip = false;

                              // Check if compact view with hidden data or overflow
                              const compactView = target.querySelector('.compact-view');
                              if (compactView) {
                                const hasData = hasHiddenData(field, fieldValue);
                                const compactLines = compactView.querySelectorAll('.compact-line');
                                const isOverflowing = Array.from(compactLines).some(line =>
                                  isElementOverflowing(line as HTMLElement)
                                );
                                shouldShowTooltip = hasData || isOverflowing;
                              } else {
                                // Regular field: check visual overflow only
                                const contentElement = target.querySelector('.field-value, .sub-fields, .address-display-container');
                                shouldShowTooltip = contentElement && isElementOverflowing(contentElement as HTMLElement);
                              }

                              if (shouldShowTooltip) {
                                const tooltipContent = getTooltipContent(field, fieldValue, obj);
                                if (tooltipContent) showTooltip(e, tooltipContent);
                              }
                            }
                          }}
                          onmouseleave={() => {
                            hoverCell = null;
                            hideTooltip();
                          }}
                        >
                          {#if obj.hasIncompleteData && !fieldValue}
                            <span class="missing-data">—</span>
                          {:else if field.type === 'price' && typeof fieldValue === 'object' && fieldValue !== null}
                            {@const priceData = fieldValue as PriceData}
                            {@const calculatedTotal = priceData.funding?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0}
                            {@const totalStr = formatPrice(calculatedTotal)}
                            {@const fundingCount = priceData.funding?.length || 0}
                            {@const maxLength = totalStr.length}
                            {#if !isExpanded && fundingCount > 2}
                              <div class="compact-view">
                                <div class="compact-line">{fundingCount} źródeł finansowania</div>
                                <div class="compact-line">
                                  {priceData.funding[fundingCount - 1].source}: {formatPrice(priceData.funding[fundingCount - 1].amount)} zł
                                </div>
                              </div>
                            {:else}
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
                            {/if}
                          {:else if field.type === 'multidate' && typeof fieldValue === 'object' && fieldValue !== null}
                            {@const dateData = fieldValue}
                            {@const dateEntries = Object.entries(dateData)}
                            {@const dateCount = dateEntries.length}
                            {#if !isExpanded && dateCount > 2}
                              <div class="compact-view">
                                <div class="compact-line">{dateCount} dat</div>
                                <div class="compact-line">
                                  {dateEntries[dateCount - 1][0]}: {new Date(dateEntries[dateCount - 1][1]).toLocaleDateString('pl-PL')}
                                </div>
                              </div>
                            {:else}
                              <div class="sub-fields">
                                {#each dateEntries as [label, date]}
                                  <div class="sub-field-row">
                                    <span class="sub-label">{label}:</span>
                                    <span class="sub-value">{new Date(date).toLocaleDateString('pl-PL')}</span>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                          {:else if field.type === 'address' && typeof fieldValue === 'object' && fieldValue !== null}
                            {@const addressData = fieldValue}
                            {@const isMissingLocation = !obj.location || obj.missingFields?.includes('location')}
                            {@const hasAddress = extractAddressFromObject(obj) !== null}
                            {@const isGeocoding = quickGeocodingIds.has(obj.id)}
                            {#if !isExpanded}
                              {@const parts = []}
                              {#if addressData.street}
                                {parts.push(addressData.street + (addressData.number ? ' ' + addressData.number : ''))}
                              {/if}
                              {#if addressData.postalCode}
                                {parts.push(addressData.postalCode)}
                              {/if}
                              {#if addressData.city}
                                {parts.push(addressData.city)}
                              {/if}
                              <div class="compact-view">
                                <div class="compact-line">{parts.join(', ')}</div>
                                {#if addressData.gmina}
                                  <div class="compact-line">Gmina: {addressData.gmina}</div>
                                {/if}
                              </div>
                            {:else}
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
                                <div class="address-actions">
                                  {#if isMissingLocation && hasAddress && !isGeocoding}
                                    <button
                                      class="quick-geocode-address-btn"
                                      title="Automatyczne geokodowanie z adresu"
                                      onclick={(e) => {
                                        e.stopPropagation();
                                        quickGeocodePin(obj.id);
                                      }}
                                    >
                                      📍 Geokoduj
                                    </button>
                                  {/if}
                                  {#if isGeocoding}
                                    <span class="geocoding-status">⏳ Geokodowanie...</span>
                                  {/if}
                                  {#if !isMissingLocation}
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
                                  {/if}
                                </div>
                              </div>
                            {/if}
                          {:else if field.type === 'links' && Array.isArray(fieldValue) && fieldValue.length > 0}
                            {@const linkCount = fieldValue.length}
                            {#if !isExpanded && linkCount > 2}
                              <div class="compact-view">
                                <div class="compact-line">{linkCount} linków</div>
                                <div class="compact-line">
                                  <a href={fieldValue[linkCount - 1].url} target="_blank" rel="noopener noreferrer" class="sub-value">
                                    {fieldValue[linkCount - 1].text || fieldValue[linkCount - 1].url}
                                  </a>
                                </div>
                              </div>
                            {:else}
                              <div class="sub-fields">
                                {#each fieldValue as link}
                                  <div class="sub-field-row">
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" class="sub-value">
                                      {link.text || link.url}
                                    </a>
                                  </div>
                                {/each}
                              </div>
                            {/if}
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
                            {@const formattedValue = formatFieldValue(field, fieldValue)}
                            <span class="field-value">
                              {formattedValue}
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
                  <td class="location-column">
                    <div class="cell-content placeholder-cell"></div>
                  </td>
                  {#each data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location') as field}
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
                {#each data.template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location') as field}
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

    <!-- Header Selection Modal -->
    {#if showHeaderSelectionModal}
      <div class="mapping-modal-overlay" onclick={closeHeaderSelectionModal}>
        <div class="mapping-modal" onclick={(e) => e.stopPropagation()}>
          <h2>Wybierz wiersz z nagłówkami kolumn</h2>
          <p class="mapping-modal-info">
            Wskaż, który wiersz w pliku Excel zawiera nazwy kolumn.
            Poniżej znajduje się podgląd pierwszych {Math.min(5, excelRawData.length)} wierszy.
          </p>

          <div class="header-selection-preview">
            <table class="header-preview-table">
              <tbody>
                {#each excelRawData.slice(0, 5) as row, rowIndex}
                  <tr class:selected={selectedHeaderRow === rowIndex}>
                    <td class="row-selector">
                      <input
                        type="radio"
                        name="headerRow"
                        value={rowIndex}
                        checked={selectedHeaderRow === rowIndex}
                        onchange={() => selectedHeaderRow = rowIndex}
                      />
                      <span class="row-number">Wiersz {rowIndex + 1}</span>
                    </td>
                    {#each row.slice(0, 10) as cell, cellIndex}
                      <td class="preview-cell" title={String(cell || '')}>
                        {String(cell || '—').substring(0, 50)}
                      </td>
                    {/each}
                    {#if row.length > 10}
                      <td class="preview-cell more-cols">
                        ... (+{row.length - 10} kolumn)
                      </td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <div class="mapping-modal-actions">
            <button class="btn btn-primary" onclick={confirmHeaderSelection}>
              Dalej
            </button>
            <button class="btn btn-secondary" onclick={closeHeaderSelectionModal}>
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
                        <select
                          value={columnMapping[header] || ''}
                          onchange={(e) => {
                            const target = e.target as HTMLSelectElement;
                            if (target.value === '_create_new_field') {
                              openNewFieldForm(header);
                              target.value = ''; // Reset dropdown
                            } else {
                              columnMapping = { ...columnMapping, [header]: target.value };
                            }
                          }}
                        >
                          <option value="">— Pomiń —</option>
                          <option value="_skip">— Pomiń —</option>
                          <optgroup label="Współrzędne">
                            <option value="_latitude">Szerokość (latitude)</option>
                            <option value="_longitude">Długość (longitude)</option>
                          </optgroup>
                          <optgroup label="Pola schematu">
                            {#each data.template?.fields || [] as field}
                              {@const fieldType = field.type || field.fieldType || 'richtext'}
                              {@const typeLabel =
                                fieldType === 'richtext' ? ' [tekst]' :
                                fieldType === 'files' ? ' [pliki]' :
                                fieldType === 'gallery' ? ' [galeria]' :
                                fieldType === 'multidate' ? ' [daty]' :
                                fieldType === 'address' ? ' [adres]' :
                                fieldType === 'links' ? ' [linki]' :
                                fieldType === 'price' ? ' [cena]' :
                                fieldType === 'category' ? ' [kategoria]' :
                                fieldType === 'tags' ? ' [tagi]' :
                                // Legacy types
                                fieldType === 'number' || fieldType === 'currency' || fieldType === 'percentage' ? ' [liczba]' :
                                fieldType === 'checkbox' ? ' [tak/nie]' :
                                fieldType === 'date' ? ' [data]' : ''
                              }
                              <option value={field.key}>{getFieldDisplayName(field)}{typeLabel}</option>
                            {/each}
                          </optgroup>
                          <option value="_create_new_field" style="color: #0ea5e9; font-weight: 500;">+ Utwórz nowe pole...</option>
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
              <p style="margin-top: 8px;">
                <strong>Typy danych:</strong> Dane tekstowe zostaną zaimportowane i będą mogły być
                edytowane za pomocą odpowiednich edytorów (galeria, daty, adres, itp.).
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

  .btn-bulk-delete {
    background: #dc2626;
    color: white;
  }

  .btn-bulk-delete:hover {
    background: #b91c1c;
  }

  .btn-bulk-clear {
    background: #6b7280;
    color: white;
  }

  .btn-bulk-clear:hover {
    background: #4b5563;
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

  /* Header Selection Modal styles */
  .header-selection-preview {
    max-height: 400px;
    overflow: auto;
    margin-bottom: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
  }

  .header-preview-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .header-preview-table tr {
    border-bottom: 1px solid var(--color-border);
    transition: background-color 0.2s;
  }

  .header-preview-table tr:hover {
    background-color: #f9fafb;
  }

  .header-preview-table tr.selected {
    background-color: #e0f2fe;
  }

  .header-preview-table td {
    padding: var(--space-2);
    border-right: 1px solid #e5e7eb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .header-preview-table td:last-child {
    border-right: none;
  }

  .row-selector {
    position: sticky;
    left: 0;
    background-color: inherit;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 100px;
    z-index: 1;
  }

  .row-number {
    font-family: var(--font-ui);
    color: var(--color-text-secondary);
  }

  .preview-cell {
    font-family: var(--font-mono);
    color: var(--color-text);
  }

  .more-cols {
    font-style: italic;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
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
