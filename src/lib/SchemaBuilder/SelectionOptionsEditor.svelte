<script lang="ts">
  import type { SelectionOption } from '$lib/types.js';

  interface Props {
    options: SelectionOption[];
    onUpdate: (options: SelectionOption[]) => void;
  }

  const { options, onUpdate }: Props = $props();

  let newOptionValue = $state('');
  let newOptionColor = $state('#3b82f6');
  let editingOption = $state<SelectionOption | null>(null);

  const visibleOptions = $derived(
    (options || []).filter(o => !o.archived).sort((a, b) => a.order - b.order)
  );
  const archivedOptions = $derived((options || []).filter(o => o.archived));

  function addOption(): void {
    if (!newOptionValue.trim()) return;

    const newOption: SelectionOption = {
      id: `opt_${Date.now()}`,
      value: newOptionValue.trim(),
      color: newOptionColor,
      order: visibleOptions.length,
      archived: false
    };

    onUpdate([...(options || []), newOption]);
    newOptionValue = '';
    newOptionColor = '#3b82f6';
  }

  function updateOption(optionId: string, updates: Partial<SelectionOption>): void {
    onUpdate(
      (options || []).map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      )
    );
  }

  function archiveOption(optionId: string): void {
    updateOption(optionId, { archived: true });
  }

  function restoreOption(optionId: string): void {
    updateOption(optionId, { archived: false });
  }

  function moveOptionUp(index: number): void {
    if (index === 0) return;

    const reordered = [...visibleOptions];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];

    const updated = reordered.map((opt, i) => ({ ...opt, order: i }));
    onUpdate([...updated, ...archivedOptions]);
  }

  function moveOptionDown(index: number): void {
    if (index === visibleOptions.length - 1) return;

    const reordered = [...visibleOptions];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];

    const updated = reordered.map((opt, i) => ({ ...opt, order: i }));
    onUpdate([...updated, ...archivedOptions]);
  }

  function startEdit(option: SelectionOption): void {
    editingOption = { ...option };
  }

  function saveEdit(): void {
    if (!editingOption) return;
    updateOption(editingOption.id, editingOption);
    editingOption = null;
  }

  function cancelEdit(): void {
    editingOption = null;
  }
</script>

<div class="selection-options-editor">
  <div class="options-list">
    {#each visibleOptions as option, i}
      <div class="option-item">
        {#if editingOption && editingOption.id === option.id}
          <!-- Edit mode -->
          <div class="option-edit-form">
            <div class="option-color-preview" style="background-color: {editingOption.color}"></div>
            <input
              type="text"
              bind:value={editingOption.value}
              class="option-edit-input"
              placeholder="Nazwa opcji"
            />
            <input
              type="color"
              bind:value={editingOption.color}
              class="color-input"
            />
            <div class="edit-actions">
              <button onclick={saveEdit} class="icon-btn save" title="Zapisz">✓</button>
              <button onclick={cancelEdit} class="icon-btn cancel" title="Anuluj">✕</button>
            </div>
          </div>
        {:else}
          <!-- Display mode -->
          <div class="option-info">
            <div class="option-color-preview" style="background-color: {option.color || '#3b82f6'}"></div>
            <span class="option-value">{option.value}</span>
          </div>

          <div class="option-actions">
            <button onclick={() => startEdit(option)} class="icon-btn" title="Edytuj">
              <img src="/icons/Pen.svg" alt="Edit" style="width: 12px; height: 12px;" />
            </button>
            <button onclick={() => archiveOption(option.id)} class="icon-btn" title="Usuń">
              <img src="/icons/Trash.svg" alt="Delete" style="width: 12px; height: 12px;" />
            </button>
            <button
              onclick={() => moveOptionUp(i)}
              disabled={i === 0}
              class="icon-btn"
              title="W górę"
            >
              <img src="/icons/Chevron/Up.svg" alt="Up" style="width: 12px; height: 12px;" />
            </button>
            <button
              onclick={() => moveOptionDown(i)}
              disabled={i === visibleOptions.length - 1}
              class="icon-btn"
              title="W dół"
            >
              <img src="/icons/Chevron/Down.svg" alt="Down" style="width: 12px; height: 12px;" />
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Add new option -->
  <div class="add-option-row">
    <input
      type="text"
      bind:value={newOptionValue}
      placeholder="Nowa opcja..."
      class="add-option-input"
      onkeydown={(e) => e.key === 'Enter' && addOption()}
    />
    <input
      type="color"
      bind:value={newOptionColor}
      class="color-input"
    />
    <button onclick={addOption} disabled={!newOptionValue.trim()} class="add-btn">
      + Dodaj
    </button>
  </div>

  {#if archivedOptions.length > 0}
    <details class="archived-section">
      <summary>Zarchiwizowane ({archivedOptions.length})</summary>
      <div class="archived-list">
        {#each archivedOptions as option}
          <div class="archived-item">
            <div class="option-color-preview archived" style="background-color: {option.color}"></div>
            <span class="option-value">{option.value}</span>
            <button onclick={() => restoreOption(option.id)} class="restore-btn">
              Przywróć
            </button>
          </div>
        {/each}
      </div>
    </details>
  {/if}
</div>

<style>
  .selection-options-editor {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
  }

  .option-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .option-color-preview {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .option-color-preview.archived {
    opacity: 0.5;
  }

  .option-value {
    font-size: 12px;
    color: #333;
  }

  .option-actions {
    display: flex;
    gap: 2px;
  }

  .icon-btn {
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 12px;
    transition: all 0.15s ease;
  }

  .icon-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .icon-btn.save {
    color: #22c55e;
  }

  .icon-btn.cancel {
    color: #ef4444;
  }

  .option-edit-form {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
  }

  .option-edit-input {
    flex: 1;
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
  }

  .option-edit-input:focus {
    border-color: #007acc;
  }

  .edit-actions {
    display: flex;
    gap: 2px;
  }

  .color-input {
    width: 28px;
    height: 24px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
  }

  .add-option-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }

  .add-option-input {
    flex: 1;
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
  }

  .add-option-input:focus {
    border-color: #007acc;
  }

  .add-btn {
    padding: 4px 8px;
    background: transparent;
    border: 1px dashed #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    color: #666;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .add-btn:hover:not(:disabled) {
    border-color: #999;
    color: #333;
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .archived-section {
    margin-top: 8px;
    font-size: 12px;
    color: #666;
  }

  .archived-section summary {
    cursor: pointer;
    padding: 4px 0;
  }

  .archived-section summary:hover {
    color: #333;
  }

  .archived-list {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .archived-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }

  .restore-btn {
    margin-left: auto;
    padding: 2px 6px;
    background: #000;
    color: white;
    border: none;
    border-radius: 3px;
    font-size: 10px;
    cursor: pointer;
  }

  .restore-btn:hover {
    background: #333;
  }
</style>
