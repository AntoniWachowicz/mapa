<script lang="ts">
  /**
   * DataTable Component
   * Complete table implementation composing TableHeader and TableCell.
   * Handles scrolling, row rendering, placeholder rows, and empty states.
   */

  import TableHeader from './TableHeader.svelte';
  import TableCell from './TableCell.svelte';
  import type { SavedObject, Template } from '$lib/types';

  interface Props {
    template: Template;
    objects: SavedObject[];
    sortField: string;
    sortDirection: 'asc' | 'desc';
    columnWidths: Record<string, number>;
    selectedRows: Set<string>;
    expandedRows: Set<string>;
    editingCell: { objectId: string; fieldKey: string } | null;
    editingValue: any;
    hoverCell: { objectId: string; fieldKey: string } | null;
    placeholderRowCount: number;
    isResizing?: boolean;
    justFinishedResizing?: boolean;

    // Helper functions passed to children
    getFieldDisplayName: (field: any) => string;
    getFieldType: (field: any) => string;
    formatTableCellValue: (field: any, value: any) => string;
    formatPrice: (amount: number) => string;
    hasHiddenData: (field: any, value: any) => boolean;
    isElementOverflowing: (element: HTMLElement | null) => boolean;
    getTooltipContent: (field: any, value: any, obj: SavedObject) => any;
    extractAddressFromObject: (obj: SavedObject, template: Template) => any;
    isGeocoding: (objectId: string) => boolean;
    SyncIcon: () => string;
    startColumnResize: (e: MouseEvent, fieldKey: string, currentWidth: number) => void;

    // Event handlers
    onSort?: (fieldKey: string) => void;
    onToggleSelectAll?: () => void;
    onRowSelection?: (objectId: string, rowIndex: number, event: MouseEvent) => void;
    onEditStart?: (objectId: string, fieldKey: string, currentValue: any) => void;
    onEditSave?: () => void;
    onEditCancel?: () => void;
    onEditValueChange?: (newValue: any) => void;
    onToggleRowExpansion?: (objectId: string) => void;
    onShowTooltip?: (event: MouseEvent, content: any) => void;
    onHideTooltip?: () => void;
    onQuickGeocode?: (objectId: string) => void;
    onSyncAddress?: (objectId: string) => void;
    onKeydown?: (event: KeyboardEvent) => void;
    onHeaderScroll?: () => void;
  }

  let {
    template,
    objects,
    sortField,
    sortDirection,
    columnWidths,
    selectedRows,
    expandedRows,
    editingCell,
    editingValue = $bindable(),
    hoverCell,
    placeholderRowCount,
    isResizing = false,
    justFinishedResizing = false,
    getFieldDisplayName,
    getFieldType,
    formatTableCellValue,
    formatPrice,
    hasHiddenData,
    isElementOverflowing,
    getTooltipContent,
    extractAddressFromObject,
    isGeocoding,
    SyncIcon,
    startColumnResize,
    onSort,
    onToggleSelectAll,
    onRowSelection,
    onEditStart,
    onEditSave,
    onEditCancel,
    onEditValueChange,
    onToggleRowExpansion,
    onShowTooltip,
    onHideTooltip,
    onQuickGeocode,
    onSyncAddress,
    onKeydown,
    onHeaderScroll
  }: Props = $props();

  let tableHeaderElement: HTMLElement | null = $state(null);
  let tableBodyElement: HTMLElement | null = $state(null);

  const visibleFields = $derived(
    template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location')
  );

  function syncHeaderScroll() {
    if (tableBodyElement && tableHeaderElement) {
      tableHeaderElement.scrollLeft = tableBodyElement.scrollLeft;
    }
    onHeaderScroll?.();
  }

  function handleRowSelection(objectId: string, rowIndex: number, event: MouseEvent) {
    onRowSelection?.(objectId, rowIndex, event);
  }
</script>

<div class="table-container">
  <!-- Sticky Header -->
  <div class="table-header" bind:this={tableHeaderElement}>
    <TableHeader
      {template}
      {sortField}
      {sortDirection}
      {columnWidths}
      selectedRowCount={selectedRows.size}
      totalRowCount={objects.length}
      {isResizing}
      {justFinishedResizing}
      {getFieldDisplayName}
      {getFieldType}
      {startColumnResize}
      onSort={onSort}
      onToggleSelectAll={onToggleSelectAll}
    />
  </div>

  <!-- Scrollable Body -->
  <div class="table-body" bind:this={tableBodyElement} onscroll={syncHeaderScroll}>
    <table class="body-table">
      <tbody>
        {#if objects.length === 0}
          <tr>
            <td colspan={visibleFields.length + 2} class="empty-row">
              Brak danych do wyświetlenia
            </td>
          </tr>
        {:else}
          {#each objects as obj, rowIndex}
            {@const isMissingLocation = !obj.location || obj.missingFields?.includes('location')}
            <tr class:incomplete={obj.hasIncompleteData} class:missing-location={isMissingLocation}>
              <!-- Checkbox column -->
              <td class="checkbox-column" style="width: 2.5rem;" class:missing-location-cell={isMissingLocation}>
                <input
                  type="checkbox"
                  checked={selectedRows.has(obj.id)}
                  onclick={(e) => handleRowSelection(obj.id, rowIndex, e)}
                />
              </td>
              <!-- Location column -->
              <td class="location-column" style="width: 9rem;" class:missing-location-cell={isMissingLocation}>
                {#if obj.location && obj.location.coordinates}
                  <div class="cell-content coordinates-display">
                    <div class="coordinate-line">{obj.location.coordinates[1].toFixed(6)}</div>
                    <div class="coordinate-line">{obj.location.coordinates[0].toFixed(6)}</div>
                  </div>
                {:else}
                  {@const hasAddress = extractAddressFromObject(obj, template) !== null}
                  {@const isGeocodingPin = isGeocoding(obj.id)}
                  <div class="cell-content missing-location-row">
                    <div class="missing-location-text">Brak</div>
                    {#if hasAddress && !isGeocodingPin}
                      <button
                        class="quick-geocode-btn"
                        title="Automatyczne geokodowanie z adresu"
                        onclick={(e) => {
                          e.stopPropagation();
                          onQuickGeocode?.(obj.id);
                        }}
                      >
                        Geokoduj
                      </button>
                    {/if}
                    {#if isGeocodingPin}
                      <div class="geocoding-status-inline">⏳</div>
                    {/if}
                  </div>
                {/if}
              </td>
              {#each visibleFields as field}
                {@const isRowExpanded = expandedRows.has(obj.id)}
                <TableCell
                  {field}
                  value={obj.data[field.key]}
                  object={obj}
                  {template}
                  isEditing={editingCell?.objectId === obj.id && editingCell?.fieldKey === field.key}
                  bind:editingValue
                  isExpanded={isRowExpanded}
                  isSorted={sortField === field.key}
                  width={columnWidths[field.key] || 200}
                  {hoverCell}
                  {formatTableCellValue}
                  {formatPrice}
                  {hasHiddenData}
                  {isElementOverflowing}
                  {getTooltipContent}
                  {extractAddressFromObject}
                  {isGeocoding}
                  {SyncIcon}
                  onEditStart={onEditStart}
                  onEditSave={onEditSave}
                  onEditCancel={onEditCancel}
                  onEditValueChange={onEditValueChange}
                  onToggleRowExpansion={onToggleRowExpansion}
                  onShowTooltip={onShowTooltip}
                  onHideTooltip={onHideTooltip}
                  onQuickGeocode={onQuickGeocode}
                  onSyncAddress={onSyncAddress}
                  onKeydown={onKeydown}
                />
              {/each}
            </tr>
          {/each}

          <!-- Placeholder rows to fill screen -->
          {#each Array(placeholderRowCount).fill(null) as _, index}
            <tr class="placeholder-row" class:even={index % 2 === 0}>
              <td class="checkbox-column" style="width: 2.5rem;">
                <div class="cell-content placeholder-cell"></div>
              </td>
              <td class="location-column" style="width: 9rem;">
                <div class="cell-content placeholder-cell"></div>
              </td>
              {#each visibleFields as field}
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

<style>
  .table-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    background: white;
  }

  .table-header {
    flex-shrink: 0;
    overflow-x: hidden;
    overflow-y: hidden;
  }

  .table-body {
    flex: 1;
    overflow: auto;
  }

  .body-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
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

  .body-table tbody tr.incomplete {
    background: #fef3c7 !important;
  }

  .body-table tbody tr.missing-location {
    border-left: 0.1875rem solid #dc2626;
  }

  .body-table tbody tr.missing-location .checkbox-column {
    background: #fee2e2;
  }

  .body-table td {
    /* No padding here - TableCell handles its own padding */
    padding: 0;
    font-family: "Space Mono", monospace;
    font-size: 0.8125rem;
    vertical-align: top;
    box-sizing: border-box;
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

  .checkbox-column {
    width: 2.5rem !important;
    min-width: 2.5rem !important;
    max-width: 2.5rem !important;
    text-align: center;
    cursor: pointer;
    padding: 0.375rem 0.5rem !important;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid var(--color-border);
  }

  .checkbox-column input[type="checkbox"] {
    cursor: pointer;
    transform: scale(1.1);
  }

  .location-column {
    width: 9rem;
    min-width: 9rem;
    padding: 0.375rem 0.5rem !important;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid var(--color-border);
  }

  .cell-content {
    cursor: pointer;
    line-height: 1.3;
    vertical-align: top;
    font-size: 0.8125rem;
  }

  .coordinates-display {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .coordinate-line {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    line-height: 1.3;
  }

  .missing-location-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .missing-location-text {
    color: var(--color-text-muted);
    font-style: italic;
    font-size: 0.75rem;
  }

  .missing-location-cell {
    background: #fee2e2 !important;
  }

  .quick-geocode-btn {
    padding: 0.125rem 0.375rem;
    font-size: 0.625rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 0.1875rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: "Space Mono", monospace;
    font-weight: 500;
  }

  .quick-geocode-btn:hover {
    background: #059669;
  }

  .geocoding-status-inline {
    font-size: 0.75rem;
    color: #f59e0b;
  }

  .empty-row {
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
    font-style: italic;
    font-size: 0.875rem;
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
    height: 2.6rem;
    background: transparent;
  }

  .placeholder-row:hover {
    background: inherit !important;
  }
</style>
