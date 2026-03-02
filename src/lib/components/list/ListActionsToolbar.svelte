<script lang="ts">
  /**
   * ListActionsToolbar
   * Toolbar with search input, export template, import Excel, and export table actions.
   */
  import Icon from '$lib/Icon.svelte';

  interface Props {
    searchText?: string;
    onSearchChange?: (text: string) => void;
    onTemplateDownload: () => void;
    onExcelImport: (event: Event) => void;
    onExcelExport: () => void;
  }

  const { searchText = '', onSearchChange, onTemplateDownload, onExcelImport, onExcelExport }: Props = $props();
</script>

<div class="list-actions">
  <div class="search-wrapper">
    <Icon name="Magnigier Glass" size={16} />
    <input
      type="text"
      value={searchText}
      oninput={(e) => onSearchChange?.(e.currentTarget.value)}
      placeholder="Wyszukaj..."
      class="search-input"
    >
  </div>
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

  .search-wrapper {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    border: 1px solid #000000;
    padding: 0.5rem 0.75rem;
    background: #ffffff;
    flex-shrink: 0;
  }

  .search-wrapper :global(.icon) {
    flex-shrink: 0;
    opacity: 0.5;
  }

  .search-input {
    border: none;
    outline: none;
    font-family: "Space Mono", monospace;
    font-size: 0.875rem;
    background: transparent;
    width: 160px;
  }

  .search-input::placeholder {
    color: #999;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1rem;
    border: none;
    border-radius: 0;
    font-family: "Space Mono", monospace;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #000000;
    color: white;
  }

  .btn-primary:hover {
    background: #1a1a1a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .btn-primary:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .btn-primary :global(.icon) {
    filter: brightness(0) invert(1);
  }
</style>
