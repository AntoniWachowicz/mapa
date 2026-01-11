<script lang="ts">
  import type { SelectionFieldData, SelectionConfig, SelectionOption, Field } from '$lib/types.js';

  interface Props {
    value: SelectionFieldData;
    field: Field;
    onchange: (newValue: SelectionFieldData) => void;
  }

  const { value, field, onchange }: Props = $props();

  // Get config from field
  const config = $derived((field.config as SelectionConfig) || {
    mode: 'single',
    options: [],
    allowCustom: false
  });

  const mode = $derived(config.mode || 'single');
  const options = $derived((config.options || []).filter(o => !o.archived).sort((a, b) => a.order - b.order));
  const allowCustom = $derived(config.allowCustom ?? false);
  const maxSelections = $derived(config.maxSelections);
  const maxSecondary = $derived(config.maxSecondary);

  // Custom entry input state
  let customEntryInput = $state('');

  // Single mode handlers
  function handleSingleChange(optionId: string | null): void {
    onchange({ ...value, selected: optionId });
  }

  // Multi mode handlers
  function handleMultiToggle(optionId: string, checked: boolean): void {
    const selections = value.selections || [];
    let newSelections: string[];

    if (checked) {
      if (!selections.includes(optionId)) {
        newSelections = [...selections, optionId];
      } else {
        newSelections = selections;
      }
    } else {
      newSelections = selections.filter(id => id !== optionId);
    }

    onchange({ ...value, selections: newSelections });
  }

  // Hierarchical mode handlers
  function handlePrimaryChange(optionId: string | null): void {
    // Remove from secondary if it was there
    const secondary = (value.secondary || []).filter(id => id !== optionId);
    onchange({ ...value, primary: optionId, secondary });
  }

  function handleSecondaryToggle(optionId: string, checked: boolean): void {
    const secondary = value.secondary || [];
    let newSecondary: string[];

    if (checked) {
      if (!secondary.includes(optionId)) {
        newSecondary = [...secondary, optionId];
      } else {
        newSecondary = secondary;
      }
    } else {
      newSecondary = secondary.filter(id => id !== optionId);
    }

    onchange({ ...value, secondary: newSecondary });
  }

  // Custom entry handlers
  function addCustomEntry(): void {
    if (!customEntryInput.trim()) return;

    const customEntries = value.customEntries || [];
    const newEntry = customEntryInput.trim();

    if (!customEntries.includes(newEntry)) {
      const newCustomEntries = [...customEntries, newEntry];

      // Add to appropriate selection based on mode
      if (mode === 'single') {
        onchange({ ...value, selected: newEntry, customEntries: newCustomEntries });
      } else if (mode === 'multi') {
        const selections = value.selections || [];
        onchange({ ...value, selections: [...selections, newEntry], customEntries: newCustomEntries });
      } else {
        // Hierarchical - add to secondary
        const secondary = value.secondary || [];
        onchange({ ...value, secondary: [...secondary, newEntry], customEntries: newCustomEntries });
      }
    }

    customEntryInput = '';
  }

  function removeCustomEntry(entry: string): void {
    const customEntries = (value.customEntries || []).filter(e => e !== entry);

    // Remove from selections
    if (mode === 'single') {
      const selected = value.selected === entry ? null : value.selected;
      onchange({ ...value, selected, customEntries });
    } else if (mode === 'multi') {
      const selections = (value.selections || []).filter(s => s !== entry);
      onchange({ ...value, selections, customEntries });
    } else {
      const secondary = (value.secondary || []).filter(s => s !== entry);
      onchange({ ...value, secondary, customEntries });
    }
  }

  // Helper to check if an ID is a custom entry
  function isCustomEntry(id: string): boolean {
    return (value.customEntries || []).includes(id);
  }

  // Helper to get option display value
  function getOptionDisplay(id: string): string {
    const option = options.find(o => o.id === id);
    if (option) return option.value;
    // Custom entry - return as is
    return id;
  }

  // Helper to get option color
  function getOptionColor(id: string): string {
    const option = options.find(o => o.id === id);
    return option?.color || '#6b7280';
  }
</script>

<div class="selection-field">
  {#if mode === 'single'}
    <!-- Single Select Mode -->
    <div class="single-select">
      <select
        value={value.selected || ''}
        onchange={(e) => handleSingleChange(e.currentTarget.value || null)}
        class="selection-dropdown"
        required={field.required}
      >
        <option value="">Wybierz...</option>
        {#each options as option}
          <option value={option.id}>{option.value}</option>
        {/each}
        {#each value.customEntries || [] as entry}
          <option value={entry}>{entry} (własna)</option>
        {/each}
      </select>

      {#if value.selected}
        <div class="selected-badge" style="background-color: {getOptionColor(value.selected)}">
          {getOptionDisplay(value.selected)}
          {#if isCustomEntry(value.selected)}
            <button class="remove-custom" onclick={() => removeCustomEntry(value.selected || '')}>✕</button>
          {/if}
        </div>
      {/if}
    </div>

  {:else if mode === 'multi'}
    <!-- Multi Select Mode -->
    <div class="multi-select">
      <div class="options-grid">
        {#each options as option}
          {@const isSelected = (value.selections || []).includes(option.id)}
          {@const canSelect = isSelected || !maxSelections || (value.selections || []).length < maxSelections}

          <label class="option-checkbox" class:disabled={!canSelect}>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={!canSelect}
              onchange={(e) => handleMultiToggle(option.id, e.currentTarget.checked)}
            />
            <div class="option-badge" style="background-color: {option.color || '#6b7280'}">
              {option.value}
            </div>
          </label>
        {/each}

        {#each value.customEntries || [] as entry}
          {@const isSelected = (value.selections || []).includes(entry)}

          <label class="option-checkbox custom-entry">
            <input
              type="checkbox"
              checked={isSelected}
              onchange={(e) => handleMultiToggle(entry, e.currentTarget.checked)}
            />
            <div class="option-badge custom" style="background-color: #6b7280">
              {entry}
              <button class="remove-custom-inline" onclick={() => removeCustomEntry(entry)}>✕</button>
            </div>
          </label>
        {/each}
      </div>

      {#if maxSelections}
        <div class="selection-counter">
          {(value.selections || []).length} / {maxSelections} wybrano
        </div>
      {/if}
    </div>

  {:else if mode === 'hierarchical'}
    <!-- Hierarchical Mode (Primary + Secondary) -->
    <div class="hierarchical-select">
      <!-- Primary Selection -->
      <div class="primary-section">
        <span class="section-label">Główna opcja</span>
        <select
          value={value.primary || ''}
          onchange={(e) => handlePrimaryChange(e.currentTarget.value || null)}
          class="selection-dropdown"
          required={field.required}
        >
          <option value="">Wybierz główną opcję...</option>
          {#each options as option}
            <option value={option.id}>{option.value}</option>
          {/each}
        </select>

        {#if value.primary}
          <div class="selected-badge primary" style="background-color: {getOptionColor(value.primary)}">
            {getOptionDisplay(value.primary)}
          </div>
        {/if}
      </div>

      <!-- Secondary Selections -->
      <div class="secondary-section">
        <span class="section-label">Dodatkowe opcje {#if maxSecondary}(max {maxSecondary}){/if}</span>
        <div class="options-grid">
          {#each options as option}
            {@const isSelected = (value.secondary || []).includes(option.id)}
            {@const isPrimary = value.primary === option.id}
            {@const canSelect = !isPrimary && (isSelected || !maxSecondary || (value.secondary || []).length < maxSecondary)}

            <label class="option-checkbox" class:disabled={!canSelect} class:is-primary={isPrimary}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={!canSelect}
                onchange={(e) => handleSecondaryToggle(option.id, e.currentTarget.checked)}
              />
              <div class="option-badge secondary" style="background-color: {option.color || '#6b7280'}">
                {option.value}
                {#if isPrimary}
                  <span class="primary-indicator">Główna</span>
                {/if}
              </div>
            </label>
          {/each}

          {#each value.customEntries || [] as entry}
            {@const isSelected = (value.secondary || []).includes(entry)}

            <label class="option-checkbox custom-entry">
              <input
                type="checkbox"
                checked={isSelected}
                onchange={(e) => handleSecondaryToggle(entry, e.currentTarget.checked)}
              />
              <div class="option-badge secondary custom" style="background-color: #6b7280">
                {entry}
                <button class="remove-custom-inline" onclick={() => removeCustomEntry(entry)}>✕</button>
              </div>
            </label>
          {/each}
        </div>

        {#if maxSecondary}
          <div class="selection-counter">
            {(value.secondary || []).length} / {maxSecondary} wybrano
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Custom Entry Input -->
  {#if allowCustom}
    <div class="custom-entry-section">
      <input
        type="text"
        bind:value={customEntryInput}
        placeholder="Dodaj własną wartość..."
        class="custom-entry-input"
        onkeydown={(e) => e.key === 'Enter' && addCustomEntry()}
      />
      <button
        onclick={addCustomEntry}
        disabled={!customEntryInput.trim()}
        class="add-custom-btn"
      >
        + Dodaj
      </button>
    </div>
  {/if}
</div>

<style>
  .selection-field {
    margin-top: 8px;
    padding: 12px;
    background: #FAFAFA;
    border: 1px solid #000000;
  }

  .selection-dropdown {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #000000;
    background: #FFFFFF;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .selection-dropdown:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 1px #000000;
  }

  .selected-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    margin-top: 6px;
  }

  .selected-badge.primary {
    border: 2px solid rgba(0, 0, 0, 0.3);
  }

  .remove-custom {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 12px;
    opacity: 0.8;
    padding: 0;
    margin-left: 4px;
  }

  .remove-custom:hover {
    opacity: 1;
  }

  .options-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
  }

  .option-checkbox {
    display: flex !important;
    align-items: center;
    cursor: pointer;
    margin: 0 !important;
    padding: 6px;
    transition: background-color 0.2s;
  }

  .option-checkbox:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .option-checkbox.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .option-checkbox.disabled:hover {
    background: none;
  }

  .option-checkbox.is-primary {
    opacity: 0.5;
  }

  .option-checkbox input[type="checkbox"] {
    margin-right: 8px;
    width: auto !important;
  }

  .option-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    position: relative;
  }

  .option-badge.custom {
    font-style: italic;
  }

  .remove-custom-inline {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 10px;
    opacity: 0.7;
    padding: 0 2px;
  }

  .remove-custom-inline:hover {
    opacity: 1;
  }

  .primary-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #dc2626;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    line-height: 1;
  }

  .selection-counter {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    color: #666;
    text-align: right;
  }

  .section-label {
    display: block;
    margin-bottom: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #333;
  }

  .primary-section {
    margin-bottom: 16px;
  }

  .secondary-section {
    padding-top: 8px;
    border-top: 1px solid #eee;
  }

  .custom-entry-section {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #eee;
  }

  .custom-entry-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
  }

  .custom-entry-input:focus {
    outline: none;
    border-color: #000;
  }

  .add-custom-btn {
    padding: 8px 16px;
    background: #000;
    color: white;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    white-space: nowrap;
  }

  .add-custom-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .add-custom-btn:hover:not(:disabled) {
    background: #333;
  }
</style>
