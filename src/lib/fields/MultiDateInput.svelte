<script lang="ts">
  import type { MultiDateData, MultiDateConfig } from '../types.js';

  interface Props {
    value: MultiDateData;
    config: MultiDateConfig;
    required?: boolean;
    oninput: (value: MultiDateData) => void;
  }

  const { value = {}, config, required = false, oninput }: Props = $props();

  function updateDate(key: string, newValue: string) {
    const newDates = { ...value };
    if (newValue) {
      newDates[key] = new Date(newValue);
    } else {
      delete newDates[key];
    }
    oninput(newDates);
  }

  function formatDateForInput(date: Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }
</script>

<div class="multidate-container" class:horizontal={config.layout === 'horizontal'}>
  {#each config.dateFields as dateField}
    <div class="date-field">
      <label class="date-label" for={`date-${dateField.key}`}>
        <span class="label-text">
          {dateField.label}
          {#if dateField.required}
            <span class="required">*</span>
          {/if}
        </span>
      </label>
      <input
        type="date"
        id={`date-${dateField.key}`}
        value={formatDateForInput(value[dateField.key])}
        oninput={(e) => updateDate(dateField.key, e.currentTarget.value)}
        required={dateField.required}
        class="date-input"
      />
    </div>
  {/each}
</div>

<style>
  .multidate-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .multidate-container.horizontal {
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .date-field {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    width: 100%;
  }

  .date-label {
    display: block;
    cursor: pointer;
  }

  .label-text {
    font-size: 12px;
    font-weight: 500;
    color: #666;
  }

  .required {
    color: #dc2626;
  }

  .date-input {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .date-input:focus {
    outline: none;
    border-color: #007acc;
  }
</style>
