<script lang="ts">
  /**
   * ExcelImportPreviewModal
   * Modal for previewing and selecting rows from imported Excel data before final import.
   */

  import Modal from './Modal.svelte';
  import Icon from '$lib/Icon.svelte';

  interface ImportRow {
    coordinates?: { lat: number; lng: number } | null;
    originalData: Record<string, any>;
    hasIncompleteData?: boolean;
  }

  interface Props {
    open: boolean;
    importedData: ImportRow[];
    selectedRows: Set<number>;
    onclose: () => void;
    onimport: () => void;
    onselectionchange: (selectedRows: Set<number>) => void;
  }

  const {
    open,
    importedData,
    selectedRows,
    onclose,
    onimport,
    onselectionchange
  }: Props = $props();

  const incompleteRowsCount = $derived(importedData.filter(row => row.hasIncompleteData).length);

  function toggleSelectAll() {
    if (selectedRows.size === importedData.length) {
      onselectionchange(new Set());
    } else {
      onselectionchange(new Set(importedData.map((_, i) => i)));
    }
  }

  function toggleRow(index: number, checked: boolean) {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    onselectionchange(newSelection);
  }
</script>

<Modal {open} title="Import danych z Excel" {onclose} maxWidth="900px">
  <p>Znaleziono <strong>{importedData.length}</strong> wierszy do zaimportowania.</p>

  {#if incompleteRowsCount > 0}
    <div class="warning-box">
      <Icon name="Cross" size={16} />
      <strong>Uwaga:</strong> {incompleteRowsCount} wierszy będzie miało niekompletne dane.
      Pinezki z niekompletnymi danymi zostaną oznaczone na mapie.
    </div>
  {/if}

  <p>Wybierz które wiersze chcesz zaimportować:</p>

  <div class="import-data-table">
    <div class="table-controls">
      <button type="button" onclick={toggleSelectAll} class="select-all-btn">
        {selectedRows.size === importedData.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
      </button>
      <span class="selection-count">
        Wybrano: {selectedRows.size} / {importedData.length}
      </span>
    </div>

    <div class="import-table-scroll">
      <table class="import-table">
        <thead>
          <tr>
            <th>Wybierz</th>
            <th>Współrzędne</th>
            <th>Dane</th>
          </tr>
        </thead>
        <tbody>
          {#each importedData as row, i}
            <tr class:selected={selectedRows.has(i)} class:incomplete={row.hasIncompleteData}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedRows.has(i)}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    toggleRow(i, target.checked);
                  }}
                />
                {#if row.hasIncompleteData}
                  <span class="incomplete-indicator" title="Pinezka będzie miała niekompletne dane">
                    <Icon name="Cross" size={12} />
                  </span>
                {/if}
              </td>
              <td>
                {#if row.coordinates}
                  <span class="coordinates">
                    {row.coordinates.lat.toFixed(4)}, {row.coordinates.lng.toFixed(4)}
                  </span>
                {:else}
                  <span class="no-coordinates">Brak współrzędnych</span>
                {/if}
              </td>
              <td>
                <div class="row-data">
                  {#each Object.entries(row.originalData) as [key, value]}
                    <div class="data-item">
                      <strong>{key}:</strong> {value}
                    </div>
                  {/each}
                  {#if row.hasIncompleteData}
                    <div class="data-item incomplete-notice">
                      <em><Icon name="Cross" size={12} /> Wymaga uzupełnienia po imporcie</em>
                    </div>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  {#snippet footer()}
    <button type="button" onclick={onclose} class="cancel-btn">
      Anuluj
    </button>
    <button type="button" onclick={onimport} class="import-confirm-btn">
      Importuj wybrane ({selectedRows.size})
    </button>
  {/snippet}
</Modal>

<style>
  .warning-box {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 4px;
    padding: 12px;
    margin: 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #92400e;
  }

  .import-data-table {
    margin-top: 16px;
  }

  .table-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .select-all-btn {
    padding: 6px 12px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .select-all-btn:hover {
    background: #0284c7;
  }

  .selection-count {
    font-size: 13px;
    font-weight: 500;
    color: #666;
  }

  .import-table-scroll {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .import-table {
    width: 100%;
    border-collapse: collapse;
  }

  .import-table th {
    background: #f5f5f5;
    padding: 10px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #ddd;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .import-table td {
    padding: 10px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }

  .import-table tbody tr:hover {
    background: #f9f9f9;
  }

  .import-table tbody tr.selected {
    background: #e0f2fe;
  }

  .import-table tbody tr.incomplete {
    background: #fef3c7;
  }

  .import-table tbody tr.selected.incomplete {
    background: #fde68a;
  }

  .incomplete-indicator {
    color: #f59e0b;
    margin-left: 4px;
  }

  .coordinates {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: #059669;
  }

  .no-coordinates {
    color: #9ca3af;
    font-style: italic;
    font-size: 12px;
  }

  .row-data {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .data-item {
    font-size: 12px;
    line-height: 1.4;
  }

  .data-item strong {
    color: #666;
    font-weight: 500;
  }

  .incomplete-notice {
    color: #f59e0b;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #fde68a;
  }

  .cancel-btn {
    padding: 8px 16px;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .cancel-btn:hover {
    background: #4b5563;
  }

  .import-confirm-btn {
    padding: 8px 16px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .import-confirm-btn:hover {
    background: #059669;
  }
</style>
