<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedObject, Template } from '$lib/types.js';

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
  let filteredObjects = $state<SavedObject[]>([]);
  let columnWidths = $state<Record<string, number>>({});
  let isResizing = $state(false);
  let resizeStartX = $state(0);
  let resizeLeftColumn = $state('');
  let resizeRightColumn = $state('');
  let expandedCells = $state<Set<string>>(new Set());

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

  function handleSort(fieldKey: string) {
    if (sortField === fieldKey) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
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

  function formatFieldValue(field: any, value: any): string {
    if (!value && value !== 0) return '';

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
      'address': 'adres'
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

  // Column resizing functions
  function startResize(e: MouseEvent, leftFieldKey: string, rightFieldKey: string) {
    e.preventDefault();
    isResizing = true;
    resizeStartX = e.clientX;
    resizeLeftColumn = leftFieldKey;
    resizeRightColumn = rightFieldKey;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing || !resizeLeftColumn || !resizeRightColumn) return;

    const deltaX = e.clientX - resizeStartX;
    const leftCurrentWidth = columnWidths[resizeLeftColumn] || 200;
    const rightCurrentWidth = columnWidths[resizeRightColumn] || 200;

    // Calculate potential new widths
    const potentialLeftWidth = leftCurrentWidth + deltaX;
    const potentialRightWidth = rightCurrentWidth - deltaX;

    // Only proceed if both columns would remain above minimum width
    if (potentialLeftWidth >= 100 && potentialRightWidth >= 100) {
      columnWidths[resizeLeftColumn] = potentialLeftWidth;
      columnWidths[resizeRightColumn] = potentialRightWidth;
      resizeStartX = e.clientX;
    }
    // If either column would go below minimum, do nothing (stop resizing)
  }

  function stopResize() {
    isResizing = false;
    resizeLeftColumn = '';
    resizeRightColumn = '';
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
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

  // Excel export handler
  async function handleExcelExport(): Promise<void> {
    if (!data.template || !data.objects || data.objects.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }

    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          objects: data.objects,
          template: data.template
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `pinezki-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Błąd podczas eksportu do Excel');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Błąd podczas eksportu do Excel');
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
      <button class="btn btn-primary">
        {@html DownloadIcon()}
        <span>Export szablonu</span>
      </button>
      <button class="btn btn-primary">
        {@html UploadIcon()}
        <span>Importuj excel</span>
      </button>
      <button class="btn btn-primary" onclick={handleExcelExport}>
        {@html DownloadIcon()}
        <span>Export tabeli</span>
      </button>
    </div>

    <div class="table-container">
      <!-- Sticky Header -->
      <div class="table-header">
        <table class="header-table">
          <thead>
            <tr>
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
      <div class="table-body">
        <table class="body-table">
          <tbody>
            {#if filteredObjects.length === 0}
              <tr>
                <td colspan={data.template.fields.filter(f => f.visible).length} class="empty-row">
                  Brak danych do wyświetlenia
                </td>
              </tr>
            {:else}
              {#each filteredObjects as obj}
                <tr class:incomplete={obj.hasIncompleteData}>
                  {#each data.template.fields.filter(f => f.visible) as field}
                    {@const cellId = `${obj._id}-${field.key}`}
                    {@const isExpanded = expandedCells.has(cellId)}
                    <td style="width: {columnWidths[field.key] || 200}px;">
                      <div class="cell-content" class:expanded={isExpanded} onclick={() => toggleCellExpansion(obj._id, field.key)}>
                        {#if obj.hasIncompleteData && !obj.data[field.key]}
                          <span class="missing-data">—</span>
                        {:else if field.type === 'tags'}
                          {#if obj.data[field.key]?.majorTag}
                            {@const tagData = obj.data[field.key]}
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
                            {formatFieldValue(field, obj.data[field.key])}
                          </span>
                        {/if}
                      </div>
                    </td>
                  {/each}
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
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
    max-width: var(--content-max-width);
    margin: 0 auto;
  }

  .list-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-family: "Space Mono", monospace;
    font-size: 16px;
    font-weight: 400;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn:hover {
    background: #f8f9fa;
    border-color: #bbb;
  }

  .btn-primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .btn-primary:hover {
    background: #0056b3;
    border-color: #0056b3;
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
    padding: var(--space-4);
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
    right: -2px; /* Center the hitbox around the visual separator */
    width: 5px; /* 5px hitbox */
    height: calc(100vh - 200px);
    cursor: col-resize;
    z-index: 30;
  }

  .column-resizer::before {
    content: '';
    position: absolute;
    top: 0;
    left: 2px; /* Center the 1px line within the 5px hitbox */
    width: 1px;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
  }

  .column-resizer:hover::before {
    background: rgba(0, 0, 0, 0.4);
    width: 2px;
    left: 1.5px;
  }
</style>