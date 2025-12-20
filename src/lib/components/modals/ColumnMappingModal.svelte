<script lang="ts">
  import type { Template, Field } from '$lib/types.js';
  import type { Snippet } from 'svelte';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    template: Template | null;
    excelHeaders: string[];
    excelSampleData: Record<string, any>[];
    excelAllData: any[];
    columnMapping: Record<string, string>;
    importInProgress: boolean;
    onclose: () => void;
    onimport: () => void;
    oncolumnmappingchange: (mapping: Record<string, string>) => void;
    onnewfield: (columnName: string) => void;
    getFieldDisplayName: (field: Field) => string;
  }

  const {
    open,
    template,
    excelHeaders,
    excelSampleData,
    excelAllData,
    columnMapping,
    importInProgress,
    onclose,
    onimport,
    oncolumnmappingchange,
    onnewfield,
    getFieldDisplayName
  }: Props = $props();

  function handleMappingChange(header: string, value: string) {
    if (value === '_create_new_field') {
      onnewfield(header);
    } else {
      const newMapping = { ...columnMapping, [header]: value };
      oncolumnmappingchange(newMapping);
    }
  }
</script>

<Modal
  {open}
  title="Mapowanie kolumn Excel"
  {onclose}
  maxWidth="800px"
  closeOnOverlayClick={!importInProgress}
  closeOnEscape={!importInProgress}
  showCloseButton={!importInProgress}
>
  <p class="mapping-modal-info">
    Przypisz kolumny z pliku Excel do pól w schemacie.
    Znaleziono {excelAllData.length} wierszy do importu.
  </p>

  {#if importInProgress}
    <div class="import-progress">
      <div class="spinner"></div>
      <p>Importowanie danych...</p>
    </div>
  {:else}
    <!-- Column mapping table -->
    <div class="mapping-table-container">
      <table class="mapping-table">
        <thead>
          <tr>
            <th>Kolumna Excel</th>
            <th>Przykładowe dane</th>
            <th>Pole w schemacie</th>
          </tr>
        </thead>
        <tbody>
          {#each excelHeaders as header}
            <tr>
              <td class="mapping-excel-col">{header}</td>
              <td class="mapping-sample">
                {#if excelSampleData.length > 0}
                  <span class="sample-value">{excelSampleData[0]?.[header] || '—'}</span>
                  {#if excelSampleData.length > 1}
                    <span class="sample-value">{excelSampleData[1]?.[header] || '—'}</span>
                  {/if}
                {:else}
                  <span class="sample-value">—</span>
                {/if}
              </td>
              <td class="mapping-field-select">
                <select
                  value={columnMapping[header] || ''}
                  onchange={(e) => {
                    const target = e.target as HTMLSelectElement;
                    handleMappingChange(header, target.value);
                    if (target.value === '_create_new_field') {
                      target.value = ''; // Reset dropdown
                    }
                  }}
                >
                  <option value="">— Pomiń —</option>
                  <option value="_skip">— Pomiń —</option>
                  <optgroup label="Lokalizacja">
                    <option value="_latitude">Szerokość (latitude)</option>
                    <option value="_longitude">Długość (longitude)</option>
                    <option value="_geocode">Adres do geokodowania</option>
                  </optgroup>
                  <optgroup label="Pola schematu">
                    {#each template?.fields || [] as field}
                      {@const fieldType = field.type || field.fieldType || 'richtext'}
                      {@const typeLabel =
                        fieldType === 'richtext' ? ' [tekst]' :
                        fieldType === 'files' ? ' [pliki]' :
                        fieldType === 'gallery' ? ' [galeria]' :
                        fieldType === 'multidate' ? ' [daty]' :
                        fieldType === 'address' ? ' [adres]' :
                        fieldType === 'links' ? ' [linki]' :
                        fieldType === 'price' ? ' [cena]' :
                        fieldType === 'category' ? ' [kategoria]' :
                        fieldType === 'tags' ? ' [tagi]' :
                        // Legacy types
                        fieldType === 'number' || fieldType === 'currency' || fieldType === 'percentage' ? ' [liczba]' :
                        fieldType === 'checkbox' ? ' [tak/nie]' :
                        fieldType === 'date' ? ' [data]' : ''
                      }
                      <option value={field.key}>{getFieldDisplayName(field)}{typeLabel}</option>
                    {/each}
                  </optgroup>
                  <option value="_create_new_field" style="color: #0ea5e9; font-weight: 500;">+ Utwórz nowe pole...</option>
                </select>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Import info -->
    <div class="mapping-info">
      <p>
        <strong>Uwaga:</strong> Rekordy bez współrzędnych zostaną zaimportowane jako niekompletne
        i nie będą widoczne na mapie (tylko w widoku listy).
      </p>
      <p style="margin-top: 8px;">
        <strong>Typy danych:</strong> Dane tekstowe zostaną zaimportowane i będą mogły być
        edytowane za pomocą odpowiednich edytorów (galeria, daty, adres, itp.).
      </p>
    </div>
  {/if}

  {#snippet footer()}
    {#if !importInProgress}
      <button class="btn btn-secondary" onclick={onclose}>
        Anuluj
      </button>
      <button class="btn btn-primary" onclick={onimport}>
        Importuj {excelAllData.length} rekordów
      </button>
    {/if}
  {/snippet}
</Modal>

<style>
  .mapping-modal-info {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #6b7280;
  }

  .import-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px 20px;
  }

  .spinner {
    border: 3px solid #f3f4f6;
    border-top: 3px solid #0ea5e9;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .import-progress p {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }

  .mapping-table-container {
    max-height: 400px;
    overflow: auto;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .mapping-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .mapping-table thead {
    position: sticky;
    top: 0;
    background: #f9fafb;
    z-index: 1;
  }

  .mapping-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #111827;
    border-bottom: 2px solid #e5e7eb;
  }

  .mapping-table td {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }

  .mapping-table tbody tr:last-child td {
    border-bottom: none;
  }

  .mapping-excel-col {
    font-weight: 500;
    color: #111827;
    min-width: 150px;
  }

  .mapping-sample {
    color: #6b7280;
    min-width: 200px;
  }

  .sample-value {
    display: inline-block;
    margin-right: 8px;
    padding: 2px 8px;
    background: #f3f4f6;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
  }

  .mapping-field-select {
    min-width: 250px;
  }

  .mapping-field-select select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  .mapping-field-select select:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  .mapping-info {
    padding: 12px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    font-size: 13px;
    color: #1e40af;
  }

  .mapping-info p {
    margin: 0;
  }

  .mapping-info strong {
    font-weight: 600;
  }
</style>
