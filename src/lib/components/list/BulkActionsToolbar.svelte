<script lang="ts">
  /**
   * BulkActionsToolbar
   * Toolbar shown when rows are selected, with bulk edit and delete actions.
   */
  interface Props {
    selectedCount: number;
    onBulkEdit: () => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
  }

  const { selectedCount, onBulkEdit, onBulkDelete, onClearSelection }: Props = $props();
</script>

{#if selectedCount > 0}
  <div class="bulk-toolbar">
    <span class="bulk-count">{selectedCount} wierszy zaznaczonych</span>
    <button class="btn btn-bulk" onclick={onBulkEdit}>
      Edytuj zaznaczone
    </button>
    <button class="btn btn-bulk-delete" onclick={onBulkDelete}>
      Usuń zaznaczone
    </button>
    <button class="btn btn-bulk-clear" onclick={onClearSelection}>
      Wyczyść zaznaczenie
    </button>
  </div>
{/if}

<style>
  .bulk-toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .bulk-count {
    font-size: 14px;
    font-weight: 500;
    color: #1e40af;
    margin-right: auto;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-bulk {
    background: #3b82f6;
    color: white;
  }

  .btn-bulk:hover {
    background: #2563eb;
  }

  .btn-bulk-delete {
    background: #ef4444;
    color: white;
  }

  .btn-bulk-delete:hover {
    background: #dc2626;
  }

  .btn-bulk-clear {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-bulk-clear:hover {
    background: #d1d5db;
  }
</style>
