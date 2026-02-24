<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
</svelte:head>

<script lang="ts">
  import type {
    Template,
    ProjectData,
    SavedObject,
    CategoryFieldData,
    SelectionFieldData,
    Tag,
    FileData,
    GalleryData,
    MultiDateData,
    MultiDateConfig,
    AddressData,
    AddressConfig,
    LinkData,
    LinksConfig,
    PriceData,
    PriceConfig,
    FundingSource,
    RichTextConfig,
    FilesConfig,
    GalleryConfig
  } from './types.js';
  import PinList from './PinList.svelte';
  import Icon from './Icon.svelte';
  import ColumnMappingModal from './components/modals/ColumnMappingModal.svelte';
  import ExcelImportPreviewModal from './components/modals/ExcelImportPreviewModal.svelte';
  import RichTextInput from './fields/RichTextInput.svelte';
  import LinksInput from './fields/LinksInput.svelte';
  import TagInput from './fields/TagInput.svelte';
  import MultiDateInput from './fields/MultiDateInput.svelte';
  import AddressInput from './fields/AddressInput.svelte';
  import PriceInput from './fields/PriceInput.svelte';
  import FilesInput from './fields/FilesInput.svelte';
  import GalleryInput from './fields/GalleryInput.svelte';
  import { validatePinData, hasCompleteLocation } from './utils/pinValidation.js';
  import * as excelService from './features/excel/excelHandlers.js';
  import { createInitialFormData, createEmptyFormData, createResetFormData } from './utils/formInitialization.js';
  import { uploadImage } from './services/imageUploadService.js';
  import { geocodeAddress, reverseGeocode } from './services/geocodingService.js';
  import * as formAccessors from './utils/formFieldAccessors.js';
  import { createImportModalState } from './features/excelImport/importModalState.svelte.js';
  import { executeAsyncOperation, handleAsyncError } from './utils/asyncErrorHandler.js';
  import { getFieldName, getFieldType } from './utils/fieldHelpers.js';
  import DynamicFieldRenderer from './components/fields/DynamicFieldRenderer.svelte';
  import { validateRowSelection, processImportRows, formatImportSuccessMessage } from './features/excel/importRowProcessor.js';

  interface Props {
    template: Template;
    objects: SavedObject[];
    selectedCoordinates?: {lat: number, lng: number} | null;
    editingObject?: SavedObject | null;
    onSave: (data: ProjectData, hasIncompleteData?: boolean) => Promise<void>;
    onUpdate?: (id: string, data: ProjectData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    showForm?: boolean;
    onClearCoordinates?: () => void;
    onFocusPin?: (coordinates: {lat: number, lng: number}) => void;
    showExcelFeatures?: boolean;
    showPinList?: boolean;
  }

  const { template, objects, selectedCoordinates = null, editingObject: externalEditingObject = null, onSave, onDelete, onUpdate, showForm = true, onClearCoordinates, onFocusPin, showExcelFeatures = true, showPinList = true }: Props = $props();
  
  let formData = $state<ProjectData>({});
  let editingObject = $state<SavedObject | null>(null);
  let isGeocodingAddress = $state(false);

  // Import modal state manager
  const importModal = createImportModalState();

  // New field creation state (for creating fields from column mapping)
  let newFieldData = $state({ name: '', label: '', type: 'text', required: false, forColumn: '' });

  // Sync external editingObject to internal state
  $effect(() => {
    if (externalEditingObject) {
      editingObject = externalEditingObject;
      formData = { ...externalEditingObject.data };
    }
  });

  // Initialize form data when template changes (only if not editing)
  $effect(() => {
    if (template?.fields && !editingObject) {
      formData = createInitialFormData(template);
    }
  });
  
  // Auto-fill coordinates when selected - no longer needed as location is separate
  // Coordinates are now stored as GeoJSON in SavedObject.location
  $effect(() => {
    if (selectedCoordinates && template?.fields) {
      // Trigger reverse geocoding if there's an address field with sync enabled
      const addressField = template.fields.find(f => f.type === 'address' && f.addressSync);
      if (addressField) {
        handleCoordinatesReverseGeocode();
      }
    }
  });

  // Clear coordinates - location is now handled separately
  function clearCoordinates(): void {
    if (onClearCoordinates) {
      onClearCoordinates();
    }
  }
  
  const visibleFields = $derived(template?.fields?.filter((f) => f.visible) ?? []);
  
  async function saveObject(): Promise<void> {
    if (!template?.fields) return;

    // Validate form data using extracted utility
    const validation = validatePinData(template, formData, selectedCoordinates, editingObject);

    if (!validation.isValid) {
      alert(`Proszę wypełnić: ${validation.emptyRequiredFields.join(', ')}`);
      return;
    }

    // Check if saving without location (will be marked as incomplete)
    const hasLocation = hasCompleteLocation(selectedCoordinates);
    const hasIncompleteData = !hasLocation;

    // Warn user if saving without location
    if (!hasLocation && editingObject) {
      const proceed = confirm(
        'Ta pinezka nie ma przypisanej lokalizacji i zostanie oznaczona jako niekompletna.\n\n' +
        'Nie będzie widoczna na mapie - tylko w widoku listy.\n\n' +
        'Czy chcesz kontynuować?'
      );
      if (!proceed) return;
    }

    if (editingObject && onUpdate) {
      // Update existing object
      await onUpdate(editingObject.id, formData);
      editingObject = null;
    } else {
      // Create new object
      await onSave(formData, hasIncompleteData);
    }
    
    // Reset form
    formData = createEmptyFormData(template);

    
  }
  
  // Form field accessors - wrappers for utility functions
  function handleTextInput(key: string, event: Event): void {
    formData = formAccessors.handleTextInput(formData, key, event);
  }

  function handleNumberInput(key: string, event: Event): void {
    formData = formAccessors.handleNumberInput(formData, key, event);
  }

  function handleCheckboxChange(key: string, event: Event): void {
    formData = formAccessors.handleCheckboxChange(formData, key, event);
  }

  function getFieldValue(key: string): string | number {
    return formAccessors.getFieldValue(formData, key);
  }

  function getComplexFieldValue(key: string): any {
    return formAccessors.getComplexFieldValue(formData, key);
  }

  function getCheckboxValue(key: string): boolean {
    return formAccessors.getCheckboxValue(formData, key);
  }

  function getTagValue(key: string): CategoryFieldData {
    return formAccessors.getTagValue(formData, key);
  }

  function handleTagChange(key: string, tagData: CategoryFieldData): void {
    formData = formAccessors.handleTagChange(formData, key, tagData);
  }

  function getSelectionValue(key: string): SelectionFieldData {
    return formAccessors.getSelectionValue(formData, key);
  }
  
  // Get available tags (visible ones)
  const availableTags = $derived((template.tags || []).filter(t => t.visible).sort((a, b) => a.order - b.order));

  function editPin(obj: SavedObject): void {
    editingObject = obj;
    formData = { ...obj.data };
  }

  function cancelEdit(): void {
    editingObject = null;
    formData = createResetFormData(template);
  }


  // This function is no longer needed as PinList handles focus directly from GeoJSON location
  // Keeping for backwards compatibility but it won't be called
  function handlePinClick(obj: SavedObject): void {
    if (onFocusPin && obj.location && obj.location.coordinates) {
      const [lng, lat] = obj.location.coordinates;
      onFocusPin({lat, lng});
    }
  }

  // File upload handler
  async function handleImageUpload(fieldKey: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const result = await uploadImage(file);

    if (result.success && result.imageUrl) {
      handleTextInput(fieldKey, { target: { value: result.imageUrl } } as any);
    } else {
      alert(result.error || 'Błąd podczas przesyłania obrazu');
    }
  }

  // Address geocoding handler - No longer updates coordinates field
  // Coordinates are now handled separately via selectedCoordinates in GeoJSON format
  async function handleAddressGeocode(fieldKey: string): Promise<void> {
    const addressValue = formData[fieldKey] as string;
    isGeocodingAddress = true;

    try {
      const result = await geocodeAddress(addressValue);

      if (result.success) {
        // Update address with formatted version
        if (result.formattedAddress) {
          formData = {
            ...formData,
            [fieldKey]: result.formattedAddress
          };
        }

        // Note: Coordinates are now set via map click, not stored in form data
        alert('Adres znaleziony. Kliknij na mapę aby ustawić dokładną lokalizację.');
      } else {
        alert(result.error || 'Nie udało się znaleźć adresu');
      }
    } finally {
      isGeocodingAddress = false;
    }
  }

  // Reverse geocoding when coordinates change
  async function handleCoordinatesReverseGeocode(): Promise<void> {
    if (!selectedCoordinates) return;

    const addressField = template.fields.find(f => f.type === 'address' && f.addressSync);
    if (!addressField) return;

    const result = await reverseGeocode(selectedCoordinates.lat, selectedCoordinates.lng);

    if (result.success && result.address) {
      formData = {
        ...formData,
        [addressField.key]: result.address
      };
    }
  }

  // Excel template download handler
  async function handleTemplateDownload(): Promise<void> {
    await executeAsyncOperation(
      () => excelService.downloadExcelTemplate(template),
      {
        errorContext: 'Template download',
        errorMessage: 'Błąd podczas pobierania szablonu'
      }
    );
  }

  // Excel import handler - now shows mapping modal first
  async function handleExcelImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const controller = importModal.startImportOperation('Analizowanie pliku Excel...');

    const result = await executeAsyncOperation(
      () => excelService.analyzeExcelFile(file, controller.signal),
      {
        errorContext: 'Analysis',
        errorMessage: 'Błąd podczas analizy pliku Excel',
        onFinally: () => {
          importModal.completeImportOperation();
          input.value = '';
        }
      }
    );

    if (result) {
      // Store temp ID (file is stored on server)
      importModal.currentTempId = result.tempId;
      importModal.excelHeaders = result.headers;
      importModal.excelSampleData = result.sampleData;
      importModal.columnMapping = {}; // Reset mapping

      // Show column mapping modal
      importModal.showColumnMappingModal = true;
    }
  }

  // Proceed with import after column mapping
  async function proceedWithImport(): Promise<void> {
    if (!importModal.currentTempId) {
      alert('Błąd: Brak danych pliku Excel. Proszę wybrać plik ponownie.');
      return;
    }

    const controller = importModal.startImportOperation('Importowanie danych...');

    const result = await executeAsyncOperation(
      () => excelService.importExcelWithMapping(
        importModal.currentTempId!,
        importModal.columnMapping,
        controller.signal
      ),
      {
        errorContext: 'Import',
        errorMessage: 'Błąd podczas importu pliku Excel',
        onFinally: () => {
          importModal.completeImportOperation();
          importModal.currentTempId = null;
        }
      }
    );

    if (result) {
      importModal.importedData = result.data;
      importModal.selectedImportRows = new Set();
      importModal.showColumnMappingModal = false;
      importModal.showImportModal = true;

      if (result.incompleteDataCount && result.incompleteDataCount > 0) {
        alert(`Uwaga: ${result.incompleteDataCount} pinezek będzie miało niekompletne dane (wymagane dodatkowe uzupełnienie w aplikacji)`);
      }
    }
  }

  // Cancel import handler
  function cancelImport(): void {
    if (importModal.importController) {
      importModal.importController.abort();
    }
  }

  // Excel export handler
  async function handleExcelExport(): Promise<void> {
    await executeAsyncOperation(
      () => excelService.exportToExcel(objects, template),
      {
        errorContext: 'Export',
        errorMessage: 'Błąd podczas eksportu do Excel'
      }
    );
  }

  // Import selected rows from Excel
  async function importSelectedRows(): Promise<void> {
    if (!validateRowSelection(importModal.selectedImportRows)) {
      alert('Proszę wybrać wiersze do zaimportowania');
      return;
    }

    const result = await executeAsyncOperation(
      () => processImportRows(
        importModal.selectedImportRows,
        importModal.importedData,
        template,
        onSave
      ),
      {
        errorContext: 'Import rows',
        errorMessage: 'Błąd podczas importowania wybranych wierszy'
      }
    );

    if (result) {
      importModal.showImportModal = false;
      importModal.importedData = [];
      importModal.selectedImportRows = new Set();

      alert(formatImportSuccessMessage(result));
    }
  }
</script>

{#if showForm}
  <div class="pin-form-panel">
    <!-- Import/Export buttons -->
    {#if showExcelFeatures}
    <div class="import-export-controls">
      <div class="import-controls">
        <button 
          type="button" 
          onclick={handleTemplateDownload}
          class="template-btn"
          title="Pobierz szablon Excel dostosowany do aktualnego schematu"
        >
<Icon name="Document" size={16} /> Pobierz szablon Excel
        </button>
        
        <input 
          type="file" 
          accept=".xlsx,.xls" 
          onchange={handleExcelImport}
          style="display: none;"
          id="excel-import"
          disabled={importModal.isImporting}
        >
        <label for="excel-import" class="import-btn" class:disabled={importModal.isImporting}>
<Icon name="Document" size={16} /> {importModal.isImporting ? 'Importowanie...' : 'Importuj z Excel'}
        </label>
        <small class="help-text">
          {#if importModal.isImporting}
            Trwa przetwarzanie pliku... 
            <button type="button" onclick={cancelImport} class="cancel-import-btn">
              Anuluj
            </button>
          {:else}
            Najpierw pobierz szablon, następnie importuj wypełniony plik
          {/if}
        </small>
      </div>
      
      {#if objects && objects.length > 0}
        <button 
          type="button" 
          onclick={handleExcelExport}
          class="export-btn"
        >
<Icon name="Document" size={16} /> Eksportuj do Excel
        </button>
      {/if}
    </div>
    {/if}

    {#if visibleFields.length === 0}
      <p>Brak widocznych pól. Dodaj najpierw pola do schematu.</p>
    {:else}
      {#each visibleFields as field}
        <div class="form-field">
          <span class="field-label" class:required-field={field.required}>{#if field.required}<span class="required-indicator">*</span>{/if}{field.displayLabel || field.label}</span>
          <div class="field-input">

            {#if field.key === 'location'}
              <!-- Special display for location field (GeoJSON coordinates) -->
              <div class="location-display">
                {#if selectedCoordinates}
                  <input
                    value="{selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}"
                    readonly
                    class="location-input"
                    placeholder="Kliknij na mapę aby wybrać lokalizację"
                  >
                  <button
                    type="button"
                    onclick={clearCoordinates}
                    class="clear-coords-btn"
                    title="Wyczyść współrzędne"
                  >
                    <Icon name="Close" size={16} />
                  </button>
                {:else}
                  <input
                    value=""
                    readonly
                    class="location-input"
                    placeholder="Kliknij na mapę aby wybrać lokalizację"
                  >
                {/if}
              </div>

            <!-- NEW FIELD TYPES - Use DynamicFieldRenderer for complex fields -->
            {:else if ['richtext', 'links', 'multidate', 'price', 'files', 'gallery', 'tags', 'category', 'selection'].includes(getFieldType(field)) || (getFieldType(field) === 'address' && field.config)}
              <DynamicFieldRenderer
                {field}
                {formData}
                {availableTags}
                onFieldChange={(fieldName, value) => formData[fieldName] = value}
                onGeocode={handleAddressGeocode}
                {getFieldValue}
                {getComplexFieldValue}
                {getTagValue}
                {getSelectionValue}
                {isGeocodingAddress}
              />

            {:else if field.type === 'address'}
              <div class="address-field">
                <div class="address-input-with-button">
                  <input 
                    type="text" 
                    value={getFieldValue(field.key)}
                    oninput={(e) => handleTextInput(field.key, e)}
                    required={field.required}
                    placeholder="Wpisz adres w Polsce, np. ul. Marszałkowska 1, Warszawa"
                  >
                  <button 
                    type="button"
                    onclick={() => handleAddressGeocode(field.key)}
                    disabled={!getFieldValue(field.key) || isGeocodingAddress}
                    class="geocode-btn"
                    title="Znajdź współrzędne dla adresu"
                  >
{#if isGeocodingAddress}<Icon name="Field" size={16} />{:else}<Icon name="Magnigier Glass" size={16} />{/if} 
                    {isGeocodingAddress ? 'Szukam...' : 'Znajdź na mapie'}
                  </button>
                </div>
                {#if field.addressSync}
                  <div class="sync-status">
                    <small class="help-text">
                      ⚡ Automatyczna synchronizacja z współrzędnymi włączona
                    </small>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}


      <div style="grid-column: 1 / -1; display: flex; gap: var(--space-2); margin-top: var(--space-2);">
        <button onclick={saveObject}>
          {#if editingObject}
            Aktualizuj Pinezkę
          {:else}
            Zapisz Pinezkę
          {/if}
        </button>

        {#if editingObject}
          <button type="button" class="cancel-btn" onclick={cancelEdit}>
            Anuluj
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

{#if showPinList}
<PinList
  {objects}
  {template}
  onEdit={editPin}
  onDelete={onDelete}
  onFocus={onFocusPin}
  showActions={true}
/>
{/if}

<!-- Column Mapping Modal -->
<ColumnMappingModal
  open={importModal.showColumnMappingModal}
  {template}
  excelHeaders={importModal.excelHeaders}
  excelSampleData={importModal.excelSampleData}
  excelAllData={[]}
  columnMapping={importModal.columnMapping}
  importInProgress={importModal.isImporting}
  onclose={() => {
    importModal.showColumnMappingModal = false;
    importModal.currentTempId = null;
  }}
  onimport={proceedWithImport}
  oncolumnmappingchange={(mapping) => importModal.columnMapping = mapping}
  onnewfield={(columnName) => {
    newFieldData = { name: '', label: columnName, type: 'text', required: false, forColumn: columnName };
    importModal.showCreateFieldModal = true;
  }}
  getFieldDisplayName={(field) => field.displayLabel || field.label}
/>

<!-- Excel Import Preview Modal -->
<ExcelImportPreviewModal
  open={importModal.showImportModal}
  importedData={importModal.importedData}
  selectedRows={importModal.selectedImportRows}
  onclose={() => importModal.showImportModal = false}
  onimport={importSelectedRows}
  onselectionchange={(newSelection) => importModal.selectedImportRows = newSelection}
/>

<style>
  .pin-form-panel {
    --panel-width: 420px;
    --base-unit: calc(var(--panel-width) / 16);
    --margin: var(--base-unit);

    position: relative;
    width: var(--panel-width);
    background: #FFFFFF;
    border: 1px solid #000000;
    border-radius: 0;
    padding: var(--margin);
    box-sizing: border-box;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .pin-form-panel::-webkit-scrollbar {
    display: none;
  }

  .form-field {
    margin-bottom: calc(var(--margin) * 0.75);
  }

  .field-label {
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    color: #000000;
    font-size: 13px;
    display: block;
    margin-bottom: 6px;
  }

  .field-label.required-field {
    font-weight: 600;
  }

  .required-indicator {
    color: #dc2626;
    margin-right: 4px;
  }

  .field-input {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    box-sizing: border-box;
  }

  /* Form field styles moved to individual field components */

  .form-field input[readonly] {
    background: #F5F5F5;
    color: #666;
  }

  .help-text {
    color: #6b7280;
    font-size: 12px;
    font-style: italic;
    margin: 0;
  }

  .location-display {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .location-input {
    flex: 1;
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-family: monospace;
  }

  .clear-coords-btn {
    padding: var(--space-2) var(--space-3);
    background: var(--color-danger);
    color: white;
    border: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .clear-coords-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .clear-coords-btn:disabled {
    background: var(--color-border);
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }
  

  button:not(.clear-coords-btn):not(.cancel-btn):not(.close-btn):not(.select-all-btn):not(.import-confirm-btn):not(.geocode-btn):not(.import-btn):not(.export-btn):not(.template-btn):not(.file-upload-btn):not(.cancel-import-btn) {
    background: #2563EB;
    color: white;
    border: 1px solid #000000;
    padding: 10px 16px;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  button:not(.clear-coords-btn):not(.cancel-btn):not(.close-btn):not(.select-all-btn):not(.import-confirm-btn):not(.geocode-btn):not(.import-btn):not(.export-btn):not(.template-btn):not(.file-upload-btn):not(.cancel-import-btn):hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .cancel-btn {
    background: #FFFFFF;
    color: #000000;
    border: 1px solid #000000;
    padding: 10px 16px;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: #F5F5F5;
  }
  
  /* Tag field styles moved to TagInput.svelte */

  /* Import/Export Controls */
  .import-export-controls {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: calc(var(--margin) * 0.75);
    padding: 12px;
    background: #FAFAFA;
    border-radius: 0;
    border: 1px solid #000000;
    flex-wrap: wrap;
    gap: 12px;
  }

  .import-controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .import-btn, .export-btn, .template-btn {
    background: #2563EB;
    color: white;
    padding: 8px 14px;
    border: 1px solid #000000;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-align: center;
    margin-right: 8px;
    margin-bottom: 6px;
  }

  .import-btn:hover, .export-btn:hover, .template-btn:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .import-btn.disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .import-btn.disabled:hover {
    background: #9ca3af;
    transform: none;
  }

  .template-btn {
    background: #7c3aed;
  }

  .template-btn:hover {
    background: #6d28d9;
  }

  .export-btn {
    background: #059669;
  }

  .export-btn:hover {
    background: #047857;
  }

  .cancel-import-btn {
    background: #ef4444;
    color: white;
    border: 1px solid #000000;
    padding: 4px 8px;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    margin-left: 8px;
  }

  .cancel-import-btn:hover {
    background: #dc2626;
  }

  .help-text {
    font-family: 'DM Sans', sans-serif;
    color: #666;
    font-size: 12px;
    font-style: italic;
    margin: 0;
  }

  /* Modal styles moved to ColumnMappingModal.svelte and ExcelImportPreviewModal.svelte */
</style>
