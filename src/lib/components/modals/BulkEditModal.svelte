<script lang="ts">
  import type { Template, Field } from '$lib/types.js';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    template: Template | null;
    selectedCount: number;
    bulkEditField: string;
    bulkEditValue: any;
    onclose: () => void;
    onapply: () => void;
    onfieldupdated: (field: string) => void;
    onvalueupdated: (value: any) => void;
    getFieldDisplayName: (field: Field) => string;
  }

  const {
    open,
    template,
    selectedCount,
    bulkEditField,
    bulkEditValue,
    onclose,
    onapply,
    onfieldupdated,
    onvalueupdated,
    getFieldDisplayName
  }: Props = $props();

  function handleFieldChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onfieldupdated(target.value);
  }

  function handleValueChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const value = target.type === 'number' ? parseFloat(target.value) : target.value;
    onvalueupdated(value);
  }

  function handleCheckboxChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    onvalueupdated(target.value === 'true');
  }
</script>

<Modal
  {open}
  title="Edycja zaznaczonych wierszy"
  {onclose}
  maxWidth="500px"
>
  <p class="bulk-modal-info">Edytujesz {selectedCount} wierszy</p>

  <div class="bulk-modal-form">
    <div class="form-group">
      <label for="bulkEditField">Pole do edycji:</label>
      <select id="bulkEditField" value={bulkEditField} onchange={handleFieldChange}>
        {#each template?.fields.filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location') || [] as field}
          <option value={field.key}>{getFieldDisplayName(field)}</option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="bulkEditValue">Nowa wartość:</label>
      {#if template?.fields.find(f => f.key === bulkEditField)?.type === 'checkbox'}
        <select id="bulkEditValue" value={String(bulkEditValue)} onchange={handleCheckboxChange}>
          <option value="true">Tak</option>
          <option value="false">Nie</option>
        </select>
      {:else if template?.fields.find(f => f.key === bulkEditField)?.type === 'number' || template?.fields.find(f => f.key === bulkEditField)?.type === 'currency'}
        <input
          id="bulkEditValue"
          type="number"
          value={bulkEditValue}
          oninput={handleValueChange}
          placeholder="Wprowadź wartość"
        />
      {:else if template?.fields.find(f => f.key === bulkEditField)?.type === 'date'}
        <input
          id="bulkEditValue"
          type="date"
          value={bulkEditValue}
          oninput={handleValueChange}
        />
      {:else}
        <input
          id="bulkEditValue"
          type="text"
          value={bulkEditValue}
          oninput={handleValueChange}
          placeholder="Wprowadź wartość"
        />
      {/if}
    </div>
  </div>

  {#snippet footer()}
    <button class="btn btn-secondary" onclick={onclose}>
      Anuluj
    </button>
    <button class="btn btn-primary" onclick={onapply}>
      Zastosuj
    </button>
  {/snippet}
</Modal>

<style>
  .bulk-modal-info {
    margin: 0 0 var(--space-4) 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .bulk-modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-group label {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .form-group select,
  .form-group input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: white;
  }

  .form-group select:focus,
  .form-group input:focus {
    outline: none;
    border-color: #0ea5e9;
  }
</style>
