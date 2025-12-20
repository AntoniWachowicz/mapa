<script lang="ts">
  /**
   * TableHeader Component
   * Renders the table header with sortable columns and resizable widths.
   * Integrates with the tableResize module for column resizing.
   */

  import Icon from '$lib/Icon.svelte';
  import type { Template } from '$lib/types';

  interface Props {
    template: Template;
    sortField: string;
    sortDirection: 'asc' | 'desc';
    columnWidths: Record<string, number>;
    selectedRowCount: number;
    totalRowCount: number;
    isResizing?: boolean;
    justFinishedResizing?: boolean;

    // Helper functions
    getFieldDisplayName: (field: any) => string;
    getFieldType: (field: any) => string;
    startColumnResize: (e: MouseEvent, fieldKey: string, currentWidth: number) => void;

    // Event handlers
    onSort?: (fieldKey: string) => void;
    onToggleSelectAll?: () => void;
  }

  let {
    template,
    sortField,
    sortDirection,
    columnWidths,
    selectedRowCount,
    totalRowCount,
    isResizing = false,
    justFinishedResizing = false,
    getFieldDisplayName,
    getFieldType,
    startColumnResize,
    onSort,
    onToggleSelectAll
  }: Props = $props();

  const visibleFields = $derived(
    template.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location')
  );

  function handleSort(fieldKey: string) {
    // Don't sort if we're currently resizing or just finished resizing
    if (isResizing || justFinishedResizing) return;
    onSort?.(fieldKey);
  }

  function handleToggleSelectAll() {
    onToggleSelectAll?.();
  }
</script>

<table class="header-table">
  <thead>
    <tr>
      <!-- Checkbox column -->
      <th class="checkbox-column" onclick={handleToggleSelectAll}>
        <input
          type="checkbox"
          checked={selectedRowCount === totalRowCount && totalRowCount > 0}
          onchange={handleToggleSelectAll}
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
      {#each visibleFields as field, index}
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
                {#if sortDirection === 'asc'}
                  <Icon name="Chevron/Up" size={12} />
                {:else}
                  <Icon name="Chevron/Down" size={12} />
                {/if}
              </span>
            {/if}
          </div>
          {#if index < visibleFields.length - 1}
            <div
              class="column-resizer"
              onmousedown={(e) => startColumnResize(e, field.key, columnWidths[field.key] || 200)}
            ></div>
          {/if}
        </th>
      {/each}
    </tr>
  </thead>
</table>

<style>
  .header-table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
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

  th:last-child {
    border-right: none;
  }

  th.sorted-asc,
  th.sorted-desc {
    background: #d0d0d0;
    color: var(--color-text-primary);
  }

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

  .location-column {
    width: 200px;
    min-width: 200px;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .field-name {
    font-family: "Space Mono", monospace;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .field-type {
    font-family: "Space Mono", monospace;
    font-size: 11px;
    color: var(--color-text-secondary);
    font-weight: normal;
  }

  .sort-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--color-text-primary);
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
</style>
