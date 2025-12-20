<script lang="ts">
  /**
   * ListActionsToolbar
   * Toolbar with export template, import Excel, and export table actions.
   */
  import Icon from '$lib/Icon.svelte';

  interface Props {
    onTemplateDownload: () => void;
    onExcelImport: (event: Event) => void;
    onExcelExport: () => void;
  }

  const { onTemplateDownload, onExcelImport, onExcelExport }: Props = $props();
</script>

<div class="list-actions">
  <button class="btn btn-primary" onclick={onTemplateDownload}>
    <Icon name="Action/Download • 1" size={16} />
    <span>Export szablonu</span>
  </button>
  <label class="btn btn-primary">
    <Icon name="Action/Upload • 1" size={16} />
    <span>Importuj excel</span>
    <input
      type="file"
      accept=".xlsx,.xls"
      onchange={onExcelImport}
      style="display: none;"
    >
  </label>
  <button class="btn btn-primary" onclick={onExcelExport}>
    <Icon name="Action/Download • 1" size={16} />
    <span>Export tabeli</span>
  </button>
</div>

<style>
  .list-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .btn-primary:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
  }
</style>
