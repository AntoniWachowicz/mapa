<script lang="ts">
  import type { Template, Field, AddressConfig, MultiDateConfig } from '$lib/types.js';
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

  interface SchemaColumn {
    key: string;        // e.g. 'fieldKey' or 'fieldKey.street'
    label: string;
    typeLabel: string;
    parentLabel?: string;   // for subfields, the parent field name
    isSubfield?: boolean;   // true for expanded subfields
    isFirstInGroup?: boolean; // first subfield shows parent label
  }

  const addressSubfields: { key: string; label: string }[] = [
    { key: 'street', label: 'Ulica' },
    { key: 'number', label: 'Numer' },
    { key: 'postalCode', label: 'Kod pocztowy' },
    { key: 'city', label: 'Miasto' },
    { key: 'gmina', label: 'Gmina' },
  ];

  function getSchemaColumns(): SchemaColumn[] {
    const columns: SchemaColumn[] = [];

    for (const field of template?.fields || []) {
      const fieldType = field.type || field.fieldType || 'richtext';
      const fieldLabel = getFieldDisplayName(field);

      if (fieldType === 'address') {
        // Expand address into subfield columns
        for (let i = 0; i < addressSubfields.length; i++) {
          const sub = addressSubfields[i];
          columns.push({
            key: `${field.key}.${sub.key}`,
            label: sub.label,
            typeLabel: '[adres]',
            parentLabel: fieldLabel,
            isSubfield: true,
            isFirstInGroup: i === 0,
          });
        }
      } else if (fieldType === 'multidate') {
        // Expand multidate into its configured date fields
        const config = field.config as MultiDateConfig | undefined;
        const dateFields = config?.dateFields || [];
        if (dateFields.length > 0) {
          for (let i = 0; i < dateFields.length; i++) {
            const df = dateFields[i];
            columns.push({
              key: `${field.key}.${df.key}`,
              label: df.label,
              typeLabel: '[data]',
              parentLabel: fieldLabel,
              isSubfield: true,
              isFirstInGroup: i === 0,
            });
          }
        } else {
          columns.push({ key: field.key, label: fieldLabel, typeLabel: '[daty]' });
        }
      } else if (fieldType === 'price') {
        columns.push({
          key: `${field.key}.total`,
          label: 'Kwota',
          typeLabel: '[cena]',
          parentLabel: fieldLabel,
          isSubfield: true,
          isFirstInGroup: true,
        });
      } else {
        // Simple fields
        const typeLabel =
          fieldType === 'richtext' ? '[tekst]' :
          fieldType === 'files' ? '[pliki]' :
          fieldType === 'gallery' ? '[galeria]' :
          fieldType === 'links' ? '[linki]' :
          fieldType === 'category' ? '[kategoria]' :
          fieldType === 'tags' ? '[tagi]' :
          fieldType === 'selection' ? '[wybór]' :
          fieldType === 'number' || fieldType === 'currency' || fieldType === 'percentage' ? '[liczba]' :
          fieldType === 'checkbox' ? '[tak/nie]' :
          fieldType === 'date' ? '[data]' : '';
        columns.push({ key: field.key, label: fieldLabel, typeLabel });
      }
    }

    return columns;
  }

  // Build inverted mapping: schemaKey -> excelHeader
  function getInverseMapping(): Record<string, string> {
    const inverse: Record<string, string> = {};
    for (const [excelCol, schemaField] of Object.entries(columnMapping)) {
      if (schemaField && schemaField !== '' && schemaField !== '_skip') {
        inverse[schemaField] = excelCol;
      }
    }
    return inverse;
  }

  // When user picks an Excel column for a schema field
  function handleSchemaMapping(schemaKey: string, excelHeader: string) {
    const newMapping = { ...columnMapping };

    // Remove any previous Excel column that was mapped to this schema field
    for (const [col, field] of Object.entries(newMapping)) {
      if (field === schemaKey) {
        delete newMapping[col];
      }
    }

    // If an Excel column was selected (not "none"), add the mapping
    if (excelHeader !== '') {
      // Remove this Excel column from any other schema field it was mapped to
      if (newMapping[excelHeader]) {
        delete newMapping[excelHeader];
      }
      newMapping[excelHeader] = schemaKey;
    }

    oncolumnmappingchange(newMapping);
  }

  // Get sample data for a schema column (from whatever Excel column is mapped to it)
  function getSampleValue(row: Record<string, any>, schemaKey: string, inverseMap: Record<string, string>): string {
    const excelHeader = inverseMap[schemaKey];
    if (!excelHeader) return '—';
    const val = row[excelHeader];
    return val !== undefined && val !== null && String(val).trim() !== ''
      ? String(val).substring(0, 60)
      : '—';
  }

  // Get Excel headers not yet mapped to any schema field
  function getUnmappedExcelHeaders(): string[] {
    const mappedHeaders = new Set(
      Object.entries(columnMapping)
        .filter(([_, v]) => v && v !== '' && v !== '_skip')
        .map(([k, _]) => k)
    );
    return excelHeaders.filter(h => !mappedHeaders.has(h));
  }
</script>

<Modal
  {open}
  title="Import Excel"
  {onclose}
  maxWidth="92vw"
  maxHeight="90vh"
  closeOnOverlayClick={!importInProgress}
  closeOnEscape={!importInProgress}
  showCloseButton={!importInProgress}
>
  <p class="mapping-modal-info">
    Mapowanie kolumn &middot; {excelAllData.length} wierszy
  </p>

  {#if importInProgress}
    <div class="import-progress">
      <div class="spinner"></div>
      <p>Importowanie danych...</p>
    </div>
  {:else}
    {@const schemaColumns = getSchemaColumns()}
    {@const inverseMap = getInverseMapping()}
    {@const unmappedHeaders = getUnmappedExcelHeaders()}

    <!-- Schema-field table with Excel column assignment -->
    <div class="mapping-table-container">
      <table class="mapping-table">
        <thead>
          <tr>
            {#each schemaColumns as col}
              <th class:mapped={!!inverseMap[col.key]} class:subfield={col.isSubfield}>
                <div class="th-inner">
                  <div class="th-top">
                    {#if col.isFirstInGroup && col.parentLabel}
                      <span class="header-parent">{col.parentLabel}</span>
                    {/if}
                    <span class="header-label" class:indented={col.isSubfield}>{col.label}</span>
                    <span class="header-type">{col.typeLabel}</span>
                  </div>
                  <select
                    value={inverseMap[col.key] || ''}
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement;
                      handleSchemaMapping(col.key, target.value);
                    }}
                  >
                    <option value="">— Brak —</option>
                    {#each excelHeaders as header}
                      <option value={header}>{header}</option>
                    {/each}
                  </select>
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each excelSampleData as row}
            <tr>
              {#each schemaColumns as col}
                <td class:muted={!inverseMap[col.key]} title={getSampleValue(row, col.key, inverseMap)}>
                  {getSampleValue(row, col.key, inverseMap)}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if unmappedHeaders.length > 0}
      <div class="unmapped-info">
        <strong>Nieprzypisane kolumny Excel ({unmappedHeaders.length}):</strong>
        {unmappedHeaders.join(', ')}
      </div>
    {/if}

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
    margin: 0 0 10px 0;
    font-size: 13px;
    color: #9ca3af;
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
    overflow: auto;
    max-height: 500px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .mapping-table {
    border-collapse: collapse;
    font-size: 14px;
  }

  .mapping-table thead {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .mapping-table th {
    padding: 0;
    text-align: left;
    vertical-align: top;
    border-right: 1px solid #e5e7eb;
    border-bottom: 2px solid #e5e7eb;
    background: #f9fafb;
    min-width: 180px;
    height: 1px;
    transition: background-color 0.15s;
  }

  .th-inner {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    min-height: 100%;
    padding: 10px 12px;
  }

  .th-top {
    flex: 1;
  }

  .mapping-table th:last-child {
    border-right: none;
  }

  .mapping-table th.mapped {
    background: #e0f2fe;
  }

  .mapping-table th select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: white;
    cursor: pointer;
  }

  .mapping-table th.mapped select {
    border-color: #7dd3fc;
  }

  .mapping-table th select:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  .mapping-table th.subfield {
    border-left: 2px solid #e5e7eb;
  }

  .mapping-table th.subfield.mapped {
    border-left-color: #93c5fd;
  }

  .header-parent {
    display: block;
    font-size: 10px;
    font-weight: 500;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 1px;
  }

  .header-label {
    display: block;
    margin-bottom: 2px;
    font-size: 12px;
    font-weight: 600;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-label.indented {
    padding-left: 8px;
    font-weight: 500;
    font-size: 11px;
  }

  .header-type {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 400;
    color: #9ca3af;
  }

  .mapping-table td {
    padding: 6px 12px;
    border-bottom: 1px solid #f3f4f6;
    border-right: 1px solid #f3f4f6;
    font-family: monospace;
    font-size: 12px;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .mapping-table td:last-child {
    border-right: none;
  }

  .mapping-table td.muted {
    color: #d1d5db;
  }

  .mapping-table tbody tr:last-child td {
    border-bottom: none;
  }

  .mapping-table tbody tr:hover {
    background: #f9fafb;
  }

  .unmapped-info {
    padding: 10px 12px;
    margin-bottom: 12px;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 6px;
    font-size: 13px;
    color: #92400e;
  }

  .unmapped-info strong {
    font-weight: 600;
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
