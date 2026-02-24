<script lang="ts">
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    excelRawData: any[][];
    selectedHeaderRow: number;
    onclose: () => void;
    onconfirm: () => void;
    onheaderrowchange: (rowIndex: number) => void;
  }

  const {
    open,
    excelRawData,
    selectedHeaderRow,
    onclose,
    onconfirm,
    onheaderrowchange
  }: Props = $props();
</script>

<Modal
  {open}
  title="Wybierz wiersz z nagłówkami kolumn"
  {onclose}
  maxWidth="92vw"
  maxHeight="90vh"
>
  <p class="modal-info">
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
                onchange={() => onheaderrowchange(rowIndex)}
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

  {#snippet footer()}
    <button class="btn btn-secondary" onclick={onclose}>
      Anuluj
    </button>
    <button class="btn btn-primary" onclick={onconfirm}>
      Dalej
    </button>
  {/snippet}
</Modal>

<style>
  .modal-info {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #6b7280;
  }

  .header-selection-preview {
    max-height: 400px;
    overflow: auto;
    margin-bottom: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .header-preview-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .header-preview-table tr {
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.2s;
  }

  .header-preview-table tr:hover {
    background-color: #f9fafb;
  }

  .header-preview-table tr.selected {
    background-color: #e0f2fe;
  }

  .header-preview-table td {
    padding: 8px;
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
    gap: 8px;
    min-width: 100px;
    z-index: 1;
  }

  .row-number {
    font-family: var(--font-ui, sans-serif);
    color: #6b7280;
  }

  .preview-cell {
    font-family: monospace;
    color: #111827;
  }

  .more-cols {
    font-style: italic;
    color: #9ca3af;
    font-family: var(--font-ui, sans-serif);
  }
</style>
