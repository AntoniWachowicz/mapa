<script lang="ts">
  import type { FieldType } from '$lib/types.js';

  interface DateField {
    key: string;
    label: string;
    required: boolean;
  }

  interface Props {
    fieldType: FieldType | string;
    config: Record<string, unknown>;
    onUpdate: (config: Record<string, unknown>) => void;
  }

  const { fieldType, config, onUpdate }: Props = $props();

  // Helper to update a single config value
  function updateValue(key: string, value: unknown) {
    onUpdate({ ...config, [key]: value });
  }

  // Helper to update checkbox group (array values)
  function updateArrayValue(key: string, item: string, checked: boolean) {
    const current = (config[key] as string[]) || [];
    const newValue = checked
      ? [...current, item]
      : current.filter(v => v !== item);
    onUpdate({ ...config, [key]: newValue });
  }

  // Date field helpers
  function addDateField() {
    const fields = (config.dateFields as DateField[]) || [];
    onUpdate({ ...config, dateFields: [...fields, { key: '', label: '', required: false }] });
  }

  function removeDateField(index: number) {
    const fields = (config.dateFields as DateField[]) || [];
    onUpdate({ ...config, dateFields: fields.filter((_, i) => i !== index) });
  }

  function updateDateField(index: number, field: DateField) {
    const fields = (config.dateFields as DateField[]) || [];
    const newFields = [...fields];
    newFields[index] = field;
    onUpdate({ ...config, dateFields: newFields });
  }

  // Funding source helpers
  function addFundingSource() {
    const sources = (config.fundingSources as string[]) || [];
    onUpdate({ ...config, fundingSources: [...sources, ''] });
  }

  function removeFundingSource(index: number) {
    const sources = (config.fundingSources as string[]) || [];
    onUpdate({ ...config, fundingSources: sources.filter((_, i) => i !== index) });
  }

  function updateFundingSource(index: number, value: string) {
    const sources = (config.fundingSources as string[]) || [];
    const newSources = [...sources];
    newSources[index] = value;
    onUpdate({ ...config, fundingSources: newSources });
  }

  // Default values
  const maxLength = $derived((config.maxLength as number) ?? 5000);
  const allowedTypes = $derived((config.allowedTypes as string[]) ?? ['pdf', 'docx', 'xlsx']);
  const maxSize = $derived((config.maxSize as number) ?? 10);
  const maxCount = $derived((config.maxCount as number) ?? 5);
  const style = $derived((config.style as string) ?? 'carousel');
  const allowImages = $derived((config.allowImages as boolean) ?? true);
  const allowVideos = $derived((config.allowVideos as boolean) ?? true);
  const maxItems = $derived((config.maxItems as number) ?? 10);
  const dateFields = $derived((config.dateFields as DateField[]) ?? [{ key: 'submitted', label: 'Data złożenia', required: false }]);
  const layout = $derived((config.layout as string) ?? 'horizontal');
  const displayFields = $derived((config.displayFields as string[]) ?? ['street', 'number', 'postalCode', 'city']);
  const requiredFields = $derived((config.requiredFields as string[]) ?? ['city']);
  const enableGeocoding = $derived((config.enableGeocoding as boolean) ?? true);
  const linksMaxCount = $derived((config.maxCount as number) ?? 10);
  const currency = $derived((config.currency as string) ?? 'PLN');
  const fundingSources = $derived((config.fundingSources as string[]) ?? ['UE', 'Wnioskodawca']);
  const showPercentages = $derived((config.showPercentages as boolean) ?? true);
  const showTotal = $derived((config.showTotal as boolean) ?? true);
</script>

{#if fieldType === 'richtext'}
  <div class="field-config">
    <div class="config-row-inline">
      <label class="config-label">
        Maksymalna długość:
        <input
          type="number"
          value={maxLength}
          oninput={(e) => updateValue('maxLength', parseInt(e.currentTarget.value) || 5000)}
          min="100"
          step="100"
          class="config-input-inline"
        />
      </label>
    </div>
  </div>
{:else if fieldType === 'files'}
  <div class="field-config">
    <div class="config-section">
      <label class="config-label">Dozwolone typy plików:</label>
      <div class="checkbox-grid">
        {#each ['pdf', 'docx', 'xlsx', 'doc', 'xls', 'txt', 'rtf', 'odt', 'ods'] as fileType}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={allowedTypes.includes(fileType)}
              onchange={(e) => updateArrayValue('allowedTypes', fileType, e.currentTarget.checked)}
            />
            {fileType.toUpperCase()}
          </label>
        {/each}
      </div>
    </div>
    <label class="config-label">
      Max rozmiar (MB):
      <input
        type="number"
        value={maxSize}
        oninput={(e) => updateValue('maxSize', parseInt(e.currentTarget.value) || 10)}
        min="1"
        max="100"
        class="config-input"
      />
    </label>
    <label class="config-label">
      Max plików:
      <input
        type="number"
        value={maxCount}
        oninput={(e) => updateValue('maxCount', parseInt(e.currentTarget.value) || 5)}
        min="1"
        max="20"
        class="config-input"
      />
    </label>
  </div>
{:else if fieldType === 'gallery'}
  <div class="field-config">
    <label class="config-label">
      Styl wyświetlania:
      <select
        value={style}
        onchange={(e) => updateValue('style', e.currentTarget.value)}
        class="config-select"
      >
        <option value="carousel">Karuzela</option>
        <option value="grid">Siatka</option>
        <option value="masonry">Masonry</option>
      </select>
    </label>
    <label class="config-label">
      <input
        type="checkbox"
        checked={allowImages}
        onchange={(e) => updateValue('allowImages', e.currentTarget.checked)}
      />
      Zezwól na obrazy
    </label>
    <label class="config-label">
      <input
        type="checkbox"
        checked={allowVideos}
        onchange={(e) => updateValue('allowVideos', e.currentTarget.checked)}
      />
      Zezwól na filmy (YouTube/Vimeo)
    </label>
    <label class="config-label">
      Max elementów:
      <input
        type="number"
        value={maxItems}
        oninput={(e) => updateValue('maxItems', parseInt(e.currentTarget.value) || 10)}
        min="1"
        max="50"
        class="config-input"
      />
    </label>
  </div>
{:else if fieldType === 'multidate'}
  <div class="field-config">
    <div class="config-section">
      <label class="config-label">Pola dat:</label>
      {#each dateFields as dateField, i}
        <div class="date-field-row">
          <input
            type="text"
            value={dateField.label}
            oninput={(e) => updateDateField(i, { ...dateField, label: e.currentTarget.value })}
            placeholder="Etykieta (np. Data złożenia)"
            class="config-input"
          />
          <input
            type="text"
            value={dateField.key}
            oninput={(e) => updateDateField(i, { ...dateField, key: e.currentTarget.value })}
            placeholder="Klucz (np. submitted)"
            class="config-input"
          />
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={dateField.required}
              onchange={(e) => updateDateField(i, { ...dateField, required: e.currentTarget.checked })}
            />
            Wymagane
          </label>
          {#if dateFields.length > 1}
            <button
              type="button"
              onclick={() => removeDateField(i)}
              class="remove-btn"
            >
              ✕
            </button>
          {/if}
        </div>
      {/each}
      <button type="button" onclick={addDateField} class="add-btn">
        + Dodaj pole daty
      </button>
    </div>
    <label class="config-label">
      Układ:
      <select
        value={layout}
        onchange={(e) => updateValue('layout', e.currentTarget.value)}
        class="config-select"
      >
        <option value="horizontal">Poziomy</option>
        <option value="vertical">Pionowy</option>
      </select>
    </label>
  </div>
{:else if fieldType === 'address'}
  <div class="field-config">
    <div class="config-section">
      <label class="config-label">Wyświetlane pola:</label>
      <div class="checkbox-grid">
        {#each ['street', 'number', 'postalCode', 'city', 'gmina'] as addrField}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={displayFields.includes(addrField)}
              onchange={(e) => updateArrayValue('displayFields', addrField, e.currentTarget.checked)}
            />
            {addrField}
          </label>
        {/each}
      </div>
    </div>
    <div class="config-section">
      <label class="config-label">Wymagane pola:</label>
      <div class="checkbox-grid">
        {#each displayFields as addrField}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={requiredFields.includes(addrField)}
              onchange={(e) => updateArrayValue('requiredFields', addrField, e.currentTarget.checked)}
            />
            {addrField}
          </label>
        {/each}
      </div>
    </div>
    <label class="config-label">
      <input
        type="checkbox"
        checked={enableGeocoding}
        onchange={(e) => updateValue('enableGeocoding', e.currentTarget.checked)}
      />
      Włącz synchronizację z lokalizacją
    </label>
  </div>
{:else if fieldType === 'links'}
  <div class="field-config">
    <label class="config-label">
      Max liczba linków:
      <input
        type="number"
        value={linksMaxCount}
        oninput={(e) => updateValue('maxCount', parseInt(e.currentTarget.value) || 10)}
        min="1"
        max="20"
        class="config-input"
      />
    </label>
  </div>
{:else if fieldType === 'price'}
  <div class="field-config">
    <label class="config-label">
      Waluta:
      <input
        type="text"
        value={currency}
        oninput={(e) => updateValue('currency', e.currentTarget.value)}
        class="config-input"
        placeholder="PLN"
      />
    </label>
    <div class="config-section">
      <label class="config-label">Domyślne źródła finansowania:</label>
      {#each fundingSources as source, i}
        <div class="funding-source-row">
          <input
            type="text"
            value={source}
            oninput={(e) => updateFundingSource(i, e.currentTarget.value)}
            placeholder="Źródło (np. UE)"
            class="config-input"
          />
          {#if fundingSources.length > 1}
            <button
              type="button"
              onclick={() => removeFundingSource(i)}
              class="remove-btn"
            >
              ✕
            </button>
          {/if}
        </div>
      {/each}
      <button type="button" onclick={addFundingSource} class="add-btn">
        + Dodaj źródło
      </button>
    </div>
    <label class="config-label">
      <input
        type="checkbox"
        checked={showPercentages}
        onchange={(e) => updateValue('showPercentages', e.currentTarget.checked)}
      />
      Pokazuj procenty
    </label>
    <label class="config-label">
      <input
        type="checkbox"
        checked={showTotal}
        onchange={(e) => updateValue('showTotal', e.currentTarget.checked)}
      />
      Pokazuj sumę
    </label>
  </div>
{/if}

<style>
  .field-config {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .config-row-inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .config-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #333;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .config-input,
  .config-input-inline {
    padding: 6px 10px;
    border: 1px solid #000000;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    background: white;
  }

  .config-input {
    width: 100%;
  }

  .config-input-inline {
    width: auto;
    max-width: 120px;
  }

  .config-select {
    padding: 6px 10px;
    border: 1px solid #000000;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    background: white;
    width: 100%;
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: normal;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .date-field-row,
  .funding-source-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .date-field-row input[type="text"],
  .funding-source-row input[type="text"] {
    flex: 1;
  }

  .remove-btn {
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 0;
    padding: 6px 10px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
  }

  .remove-btn:hover {
    background: #b91c1c;
  }

  .add-btn {
    background: #059669;
    color: white;
    border: none;
    border-radius: 0;
    padding: 8px 12px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    align-self: flex-start;
  }

  .add-btn:hover {
    background: #047857;
  }
</style>
