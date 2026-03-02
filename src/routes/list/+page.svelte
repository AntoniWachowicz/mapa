<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedObject, Template, CategoryFieldData, PriceData, SelectionFieldData, SelectionConfig } from '$lib/types.js';
  import Icon from '$lib/Icon.svelte';
  import Modal from '$lib/components/modals/Modal.svelte';
  import ColumnMappingModal from '$lib/components/modals/ColumnMappingModal.svelte';
  import HeaderSelectionModal from '$lib/components/modals/HeaderSelectionModal.svelte';
  import BulkEditModal from '$lib/components/modals/BulkEditModal.svelte';
  import NewFieldModal from '$lib/components/modals/NewFieldModal.svelte';
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
  import { createImportWorkflow } from '$lib/features/excelImport/importWorkflow.svelte.js';
  import { createBulkOperationsManager } from '$lib/features/bulkOperations/bulkOperationsManager.svelte.js';
  import { createCellEditor } from '$lib/features/tableEdit/cellEditor.svelte.js';
  import * as excelService from '$lib/features/excel/excelHandlers.js';
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
  import { filterByText, sortObjects } from '$lib/utils/filterSort.js';
  import { highlightText } from '$lib/utils/highlight.js';

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

  let searchText = $state('');
  let sortField = $state<string>('');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let filteredObjects = $state<SavedObject[]>(data.objects || []);
  let columnWidths = $state<Record<string, number>>({});
  let manuallyResizedColumns = $state<Set<string>>(new Set());
  let justFinishedResizing = $state(false);
  let expandedRows = $state<Set<string>>(new Set());
  let tableBodyElement = $state<HTMLElement | null>(null);
  let tableHeaderElement = $state<HTMLElement | null>(null);
  let placeholderRowCount = $state(0);
  let hoverCell = $state<{objectId: string, fieldKey: string} | null>(null);
  let hoverTooltip = $state<{content: any, x: number, y: number, width: number} | null>(null);

  // Excel import workflow manager
  const importWorkflow = createImportWorkflow();

  // Bulk operations manager
  const bulkOps = createBulkOperationsManager();

  // Cell editor manager
  const cellEditor = createCellEditor();

  // Flag to track if column widths have been initialized
  let columnWidthsInitialized = $state(false);

  // Initialize data and apply search filter + current sort
  $effect(() => {
    const base = data.objects ? [...data.objects] : [];
    const filtered = filterByText(base, data.template?.fields || [], searchText);
    filteredObjects = sortObjects(filtered, sortField, sortDirection);
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
      await excelService.downloadExcelTemplate(data.template);
    } catch (error) {
      console.error('Template download error:', error);
      alert(error instanceof Error ? error.message : 'Błąd podczas pobierania szablonu');
    }
  }

  // Wrapper function to handle field creation and update local template
  function handleFieldCreated(fieldKey: string, newField: any) {
    // Update local template state immediately
    if (data.template) {
      data.template = {
        ...data.template,
        fields: [...(data.template.fields || []), newField]
      };
    }

    // Call workflow handler
    importWorkflow.handleFieldCreated(fieldKey, (updater) => {
      if (data.template) {
        data.template = updater(data.template);
      }
    });
  }

  async function handleExcelExport() {
    if (!data.template || !filteredObjects.length) {
      alert('Brak danych do eksportu');
      return;
    }

    try {
      await excelService.exportToExcel(filteredObjects, data.template);
    } catch (error) {
      console.error('Excel export error:', error);
      alert(error instanceof Error ? error.message : 'Błąd podczas eksportu do Excel');
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
        sortField = '';
        sortDirection = 'asc';
      }
    } else {
      sortField = fieldKey;
      sortDirection = 'asc';
    }
    // The $effect handles re-computing filteredObjects from the new sort state
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

    // Selection field with hidden secondary tags
    if (field.type === 'selection' && typeof fieldValue === 'object' && fieldValue !== null) {
      const selData = fieldValue as SelectionFieldData;
      const selConfig = (field.config as SelectionConfig) || { mode: 'single', options: [] };
      const getLabel = (id: string) => selConfig.options?.find(o => o.id === id)?.value || id;
      const getColor = (id: string) => selConfig.options?.find(o => o.id === id)?.color || '#6b7280';

      const items: { label: string; color: string }[] = [];
      if (selConfig.mode === 'hierarchical') {
        if (selData.primary) items.push({ label: getLabel(selData.primary), color: getColor(selData.primary) });
        for (const secId of (selData.secondary || [])) {
          items.push({ label: getLabel(secId), color: getColor(secId) });
        }
      } else if (selConfig.mode === 'multi') {
        for (const selId of (selData.selections || [])) {
          items.push({ label: getLabel(selId), color: getColor(selId) });
        }
      } else if (selData.selected) {
        items.push({ label: getLabel(selData.selected), color: getColor(selData.selected) });
      }
      if (items.length > 1) {
        return { type: 'selection', items };
      }
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

    // Selection field: has secondary/multiple tags
    if (field.type === 'selection' && typeof fieldValue === 'object' && fieldValue !== null) {
      const selData = fieldValue as SelectionFieldData;
      const selConfig = (field.config as SelectionConfig) || { mode: 'single', options: [] };
      if (selConfig.mode === 'hierarchical' && selData.secondary && selData.secondary.length > 0) return true;
      if (selConfig.mode === 'multi' && selData.selections && selData.selections.length > 1) return true;
    }

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

  function toggleRowExpansion(objId: string) {
    if (expandedRows.has(objId)) {
      expandedRows.delete(objId);
    } else {
      expandedRows.add(objId);
    }
    expandedRows = new Set(expandedRows);
  }

  // Wrapper for cell editor handleKeydown that calls saveEdit with proper args
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      cellEditor.saveEdit(filteredObjects, (updated) => filteredObjects = updated);
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
        if (import.meta.env.DEV) console.log('Fixing fields missing adminVisible property...');
        const fixedTemplate = {
          ...data.template,
          fields: data.template.fields.map(f => ({
            ...f,
            adminVisible: f.adminVisible ?? true // Set to true if undefined
          }))
        };

        // Save the fixed template (fire-and-forget)
        const formData = new FormData();
        formData.set('template', JSON.stringify(fixedTemplate));

        fetch('/schema-builder?/updateTemplate', {
          method: 'POST',
          body: formData
        }).then(() => {
          data.template = fixedTemplate;
          if (import.meta.env.DEV) console.log('Fields fixed successfully');
        }).catch((error) => {
          console.error('Error fixing fields:', error);
        });
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

    const address = extractAddressFromObject(obj, data.template ?? null);
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
      {searchText}
      onSearchChange={(text) => searchText = text}
      onTemplateDownload={handleTemplateDownload}
      onExcelImport={importWorkflow.handleExcelImport}
      onExcelExport={handleExcelExport}
    />

    <BulkActionsToolbar
      selectedCount={bulkOps.selectedRows.size}
      onBulkEdit={() => bulkOps.openBulkEditModal(data.template ?? undefined)}
      onBulkDelete={() => bulkOps.deleteSelected(filteredObjects, (updated) => filteredObjects = updated)}
      onClearSelection={bulkOps.clearSelection}
    />

    <DataTable
      template={data.template}
      objects={filteredObjects}
      {sortField}
      {sortDirection}
      {columnWidths}
      selectedRows={bulkOps.selectedRows}
      {expandedRows}
      editingCell={cellEditor.editingCell}
      bind:editingValue={cellEditor.editingValue}
      {hoverCell}
      {placeholderRowCount}
      {searchText}
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
      onColumnWidthChange={(key, width) => { columnWidths = { ...columnWidths, [key]: width }; }}
      onSort={handleSort}
      onToggleSelectAll={() => bulkOps.toggleSelectAll(filteredObjects)}
      onRowSelection={(objectId, index, event) => bulkOps.handleRowSelection(objectId, index, event, filteredObjects)}
      onEditStart={cellEditor.startEditing}
      onEditSave={() => cellEditor.saveEdit(filteredObjects, (updated) => filteredObjects = updated)}
      onEditCancel={cellEditor.cancelEdit}
      onToggleRowExpansion={toggleRowExpansion}
      onShowTooltip={showTooltip}
      onHideTooltip={hideTooltip}
      onQuickGeocode={quickGeocodePin}
      onSyncAddress={syncAddressWithLocation}
      onKeydown={handleKeydown}
      onHeaderScroll={syncHeaderScroll}
    />

    <!-- Bulk Edit Modal -->
    <BulkEditModal
      open={bulkOps.showBulkEditModal}
      template={data.template}
      selectedCount={bulkOps.selectedRows.size}
      bulkEditField={bulkOps.bulkEditField}
      bulkEditValue={bulkOps.bulkEditValue}
      onclose={bulkOps.closeBulkEditModal}
      onapply={() => bulkOps.applyBulkEdit(filteredObjects, (updated) => filteredObjects = updated)}
      onfieldupdated={(field) => bulkOps.bulkEditField = field}
      onvalueupdated={(value) => bulkOps.bulkEditValue = value}
      {getFieldDisplayName}
    />

    <!-- Header Selection Modal -->
    <HeaderSelectionModal
      open={importWorkflow.showHeaderSelectionModal}
      excelRawData={importWorkflow.excelRawData}
      selectedHeaderRow={importWorkflow.selectedHeaderRow}
      onclose={importWorkflow.closeHeaderSelectionModal}
      onconfirm={importWorkflow.confirmHeaderSelection}
      onheaderrowchange={(rowIndex) => importWorkflow.selectedHeaderRow = rowIndex}
    />

    <!-- Column Mapping Modal for Excel Import -->
    <ColumnMappingModal
      open={importWorkflow.showMappingModal}
      template={data.template}
      excelHeaders={importWorkflow.excelHeaders}
      excelSampleData={importWorkflow.excelSampleData}
      excelAllData={importWorkflow.excelAllData}
      columnMapping={importWorkflow.columnMapping}
      importInProgress={importWorkflow.importInProgress}
      onclose={importWorkflow.closeMappingModal}
      onimport={() => { if (data.template) importWorkflow.executeImportWithMapping(data.template); }}
      oncolumnmappingchange={(mapping) => importWorkflow.columnMapping = mapping}
      onnewfield={importWorkflow.openNewFieldModal}
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
                <span class="tooltip-label">{@html highlightText(fundingItem.source + ':', searchText)}</span>
                <span class="tooltip-value" style="padding-left: {padding}ch;">{@html highlightText(amountStr + ' zł', searchText)}</span>
              </div>
            {/each}
            {#if data.showTotal !== false && calculatedTotal > 0}
              <div class="tooltip-row tooltip-total">
                <span class="tooltip-label">Suma:</span>
                <span class="tooltip-value">{@html highlightText(totalStr + ' zł', searchText)}</span>
              </div>
            {/if}
          {/if}
        {:else if hoverTooltip.content.type === 'multidate'}
          {#each hoverTooltip.content.dateEntries as [label, date]}
            <div class="tooltip-row">
              <span class="tooltip-label">{@html highlightText(label + ':', searchText)}</span>
              <span class="tooltip-value">{@html highlightText(new Date(date).toLocaleDateString('pl-PL'), searchText)}</span>
            </div>
          {/each}
        {:else if hoverTooltip.content.type === 'address'}
          {@const addressData = hoverTooltip.content.addressData}
          {#if addressData.street}
            <div class="tooltip-row">
              <span class="tooltip-label">Ulica:</span>
              <span class="tooltip-value">{@html highlightText(addressData.street + (addressData.number ? ' ' + addressData.number : ''), searchText)}</span>
            </div>
          {/if}
          {#if addressData.postalCode}
            <div class="tooltip-row">
              <span class="tooltip-label">Kod:</span>
              <span class="tooltip-value">{@html highlightText(addressData.postalCode, searchText)}</span>
            </div>
          {/if}
          {#if addressData.city}
            <div class="tooltip-row">
              <span class="tooltip-label">Miasto:</span>
              <span class="tooltip-value">{@html highlightText(addressData.city, searchText)}</span>
            </div>
          {/if}
          {#if addressData.gmina}
            <div class="tooltip-row">
              <span class="tooltip-label">Gmina:</span>
              <span class="tooltip-value">{@html highlightText(addressData.gmina, searchText)}</span>
            </div>
          {/if}
        {:else if hoverTooltip.content.type === 'links'}
          {#each hoverTooltip.content.links as link}
            <div class="tooltip-row">
              <a href={link.url} target="_blank" rel="noopener noreferrer" class="tooltip-link">
                {@html highlightText(link.text || link.url, searchText)}
              </a>
            </div>
          {/each}
        {:else if hoverTooltip.content.type === 'selection'}
          {#each hoverTooltip.content.items as item}
            <div class="tooltip-row">
              <span class="tooltip-tag" style="background-color: {item.color}">{@html highlightText(item.label, searchText)}</span>
            </div>
          {/each}
        {:else if hoverTooltip.content.type === 'text'}
          <div class="tooltip-text">
            {@html highlightText(hoverTooltip.content.text, searchText)}
          </div>
        {/if}
      </div>
    {/if}

    <!-- New Field Creation Modal -->
    <NewFieldModal
      open={importWorkflow.showNewFieldModal}
      columnName={importWorkflow.newFieldForColumn}
      template={data.template}
      onclose={importWorkflow.closeNewFieldModal}
      oncreated={handleFieldCreated}
    />

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

  .tooltip-tag {
    color: white;
    border-radius: 0.125rem;
    padding: 0 0.125rem;
    font-family: "Space Mono", monospace;
  }

  .tooltip-text {
    color: var(--color-text-primary);
    font-family: "Space Mono", monospace;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
  }


</style>
