<script lang="ts">
  import type { Template, ProjectData, SavedObject, CategoryFieldData, Tag } from './types.js';
  import PinList from './PinList.svelte';
  import Icon from './Icon.svelte';
  
  interface Props {
    template: Template;
    objects: SavedObject[];
    selectedCoordinates?: {lat: number, lng: number} | null;
    onSave: (data: ProjectData, hasIncompleteData?: boolean) => Promise<void>;
    onUpdate?: (id: string, data: ProjectData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    showForm?: boolean;
    onClearCoordinates?: () => void;
    onFocusPin?: (coordinates: {lat: number, lng: number}) => void;
    showExcelFeatures?: boolean;
    showPinList?: boolean;
  }
  
  const { template, objects, selectedCoordinates = null, onSave, onDelete, onUpdate, showForm = true, onClearCoordinates, onFocusPin, showExcelFeatures = true, showPinList = true }: Props = $props();
  
  let formData = $state<ProjectData>({});
  let editingObject = $state<SavedObject | null>(null);
  let isGeocodingAddress = $state(false);
  let showImportModal = $state(false);
  let importedData = $state<any[]>([]);
  let selectedImportRows = $state<Set<number>>(new Set());
  let isImporting = $state(false);
  let importProgress = $state({ current: 0, total: 0, message: '' });
  let importController = $state<AbortController | null>(null);

  // Initialize form data when template changes
  $effect(() => {
    if (template?.fields) {
      const newFormData: ProjectData = {};
      template.fields.forEach((field) => {
        if (field.type === 'checkbox') {
          newFormData[field.key] = false;
        } else if (field.type === 'tags') {
          newFormData[field.key] = { majorTag: null, minorTags: [] } as CategoryFieldData;
        } else {
          newFormData[field.key] = '';
        }
      });
      formData = newFormData;
    }
  });
  
  // Auto-fill coordinates when selected
  $effect(() => {
    if (selectedCoordinates && template?.fields) {
      const coordField = template.fields.find(f => f.key === 'coordinates');
      if (coordField) {
        formData = {
          ...formData,
          [coordField.key]: `${selectedCoordinates.lat.toFixed(6)}, ${selectedCoordinates.lng.toFixed(6)}`
        };
        
        // Trigger reverse geocoding if there's an address field with sync enabled
        const addressField = template.fields.find(f => f.type === 'address' && f.addressSync);
        if (addressField) {
          handleCoordinatesReverseGeocode();
        }
      }
    }
  });

  // Clear coordinates from form data
  function clearCoordinates(): void {
    if (onClearCoordinates) {
      onClearCoordinates();
    }
    const coordField = template?.fields?.find(f => f.key === 'coordinates');
    if (coordField) {
      formData = {
        ...formData,
        [coordField.key]: ''
      };
    }
  }
  
  const visibleFields = $derived(template?.fields?.filter((f) => f.visible) ?? []);
  
  async function saveObject(): Promise<void> {
    if (!template?.fields) return;
    
    // Robust validation
    const emptyRequiredFields: string[] = [];
    
    for (const field of template.fields) {
      if (field.required && field.visible) {
        const value = formData[field.key];
        
        if (field.type === 'checkbox') {
          continue; // Checkboxes don't need validation
        } else if (['text', 'textarea', 'email', 'url', 'date', 'select', 'image', 'youtube', 'address'].includes(field.type)) {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        } else if (['number', 'currency', 'percentage'].includes(field.type)) {
          if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        } else if (field.type === 'tags') {
          const tagData = value as CategoryFieldData;
          if (!tagData || !tagData.majorTag) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        }
      }
    }
    
    if (emptyRequiredFields.length > 0) {
      alert(`Proszę wypełnić: ${emptyRequiredFields.join(', ')}`);
      return;
    }
    
    if (editingObject && onUpdate) {
      // Update existing object
      console.log('Updating object:', editingObject.id, formData); // ADD DEBUG
      await onUpdate(editingObject.id, formData);
      editingObject = null;
    } else {
      // Create new object
      console.log('Creating new object:', formData); // ADD DEBUG
      await onSave(formData);
    }
    
    // Reset form
    const resetData: ProjectData = {};
    template.fields.forEach((field) => {
      resetData[field.key] = field.type === 'checkbox' ? false : '';
    });
    formData = resetData;

    
  }
  
  function handleTextInput(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) formData[key] = target.value;
  }
  
  function handleNumberInput(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) formData[key] = Number(target.value);
  }
  
  function handleCheckboxChange(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) formData[key] = target.checked;
  }
  
  function getFieldValue(key: string): string | number {
    const value = formData[key];
    if (typeof value === 'boolean') return '';
    if (typeof value === 'object') return ''; // Handle CategoryFieldData
    return value || '';
  }
  
  function getCheckboxValue(key: string): boolean {
    const value = formData[key];
    return typeof value === 'boolean' ? value : false;
  }
  
  function getTagValue(key: string): CategoryFieldData {
    const value = formData[key] as CategoryFieldData;
    return value || { majorTag: null, minorTags: [] };
  }
  
  function handleTagChange(key: string, tagData: CategoryFieldData): void {
    formData = {
      ...formData,
      [key]: tagData
    };
  }
  
  // Get available tags (visible ones)
  const availableTags = $derived((template.tags || []).filter(t => t.visible).sort((a, b) => a.order - b.order));

  function editPin(obj: SavedObject): void {
    editingObject = obj;
    formData = { ...obj.data };
  }

  function cancelEdit(): void {
    editingObject = null;
    const resetData: ProjectData = {};
    template.fields.forEach((field) => {
      if (field.type === 'checkbox') {
        resetData[field.key] = false;
      } else if (field.type === 'tags') {
        resetData[field.key] = { majorTag: null, minorTags: [] } as CategoryFieldData;
      } else {
        resetData[field.key] = '';
      }
    });
    formData = resetData;
  }


  function handlePinClick(obj: SavedObject): void {
  if (onFocusPin) {
    const coordField = template.fields.find(f => f.key === 'coordinates');
    if (coordField && obj.data[coordField.key]) {
      const coordString = obj.data[coordField.key] as string;
      const parts = coordString.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          onFocusPin({lat, lng});
        }
      }
    }
  }
}

  // File upload handler
  async function handleImageUpload(fieldKey: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Proszę wybrać plik obrazu');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Plik jest za duży. Maksymalny rozmiar to 5MB');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        handleTextInput(fieldKey, { target: { value: result.imageUrl } } as any);
      } else {
        alert('Błąd podczas przesyłania obrazu');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Błąd podczas przesyłania obrazu');
    }
  }

  // Address geocoding handler
  async function handleAddressGeocode(fieldKey: string): Promise<void> {
    const addressValue = formData[fieldKey] as string;
    if (!addressValue || !addressValue.trim()) {
      return;
    }
    
    isGeocodingAddress = true;
    
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: addressValue.trim() })
      });
      
      const result = await response.json();
      
      if (result.success && result.coordinates) {
        // Update coordinates field
        const coordField = template.fields.find(f => f.key === 'coordinates');
        if (coordField) {
          const coordinatesString = `${result.coordinates.lat.toFixed(6)}, ${result.coordinates.lng.toFixed(6)}`;
          formData = {
            ...formData,
            [coordField.key]: coordinatesString
          };
        }
        
        // Update address with formatted version
        if (result.formattedAddress) {
          formData = {
            ...formData,
            [fieldKey]: result.formattedAddress
          };
        }
      } else {
        alert(result.error || 'Nie udało się znaleźć adresu');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Błąd podczas wyszukiwania adresu');
    } finally {
      isGeocodingAddress = false;
    }
  }

  // Reverse geocoding when coordinates change
  async function handleCoordinatesReverseGeocode(): Promise<void> {
    if (!selectedCoordinates) return;
    
    const addressField = template.fields.find(f => f.type === 'address' && f.addressSync);
    if (!addressField) return;
    
    try {
      const response = await fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lat: selectedCoordinates.lat,
          lng: selectedCoordinates.lng
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.address) {
        formData = {
          ...formData,
          [addressField.key]: result.address
        };
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }

  // Excel template download handler
  async function handleTemplateDownload(): Promise<void> {
    if (!template) {
      alert('Brak zdefiniowanego schematu');
      return;
    }
    
    try {
      const response = await fetch('/api/excel-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ template })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `szablon-pinezki-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Błąd podczas pobierania szablonu');
      }
    } catch (error) {
      console.error('Template download error:', error);
      alert('Błąd podczas pobierania szablonu');
    }
  }

  // Excel import handler with loading state
  async function handleExcelImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Proszę wybrać plik Excel (.xlsx lub .xls)');
      return;
    }
    
    isImporting = true;
    importProgress = { current: 0, total: 0, message: 'Wczytywanie pliku...' };
    importController = new AbortController();
    
    try {
      const formData = new FormData();
      formData.append('excel', file);
      
      importProgress.message = 'Analizowanie danych...';
      
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
        signal: importController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        importedData = result.data;
        selectedImportRows = new Set();
        showImportModal = true;
        
        if (result.incompleteDataCount > 0) {
          alert(`Uwaga: ${result.incompleteDataCount} pinezek będzie miało niekompletne dane (wymagane dodatkowe uzupełnienie w aplikacji)`);
        }
      } else {
        alert('Błąd podczas importu pliku Excel');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Import cancelled by user');
      } else {
        console.error('Import error:', error);
        alert('Błąd podczas importu pliku Excel: ' + error.message);
      }
    } finally {
      isImporting = false;
      importController = null;
      // Clear input
      input.value = '';
    }
  }

  // Cancel import handler
  function cancelImport(): void {
    if (importController) {
      importController.abort();
    }
  }

  // Excel export handler
  async function handleExcelExport(): Promise<void> {
    if (!template || !objects || objects.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }
    
    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          objects: objects,
          template: template
        })
      });
      
      if (response.ok) {
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `pinezki-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Błąd podczas eksportu do Excel');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Błąd podczas eksportu do Excel');
    }
  }

  // Import selected rows from Excel
  async function importSelectedRows(): Promise<void> {
    if (selectedImportRows.size === 0) {
      alert('Proszę wybrać wiersze do zaimportowania');
      return;
    }
    
    const selectedRowsCount = selectedImportRows.size;
    let importedCount = 0;
    
    try {
      // Sort row indices to process in order
      const sortedRowIndices = Array.from(selectedImportRows).sort((a, b) => a - b);
      
      for (const rowIndex of sortedRowIndices) {
        const rowData = importedData[rowIndex];
        if (rowData && rowData.coordinates) {
          // Create new object
          const newData: ProjectData = {};
          let hasIncompleteData = rowData.hasIncompleteData || false;
          
          // Map original data to template fields
          template.fields.forEach(field => {
            if (field.key === 'coordinates' && rowData.coordinates) {
              newData[field.key] = `${rowData.coordinates.lat.toFixed(6)}, ${rowData.coordinates.lng.toFixed(6)}`;
            } else if (field.type === 'checkbox') {
              // Try to map checkbox values
              const matchingKey = Object.keys(rowData.originalData).find(key => 
                key.toLowerCase().includes(field.key.toLowerCase()) ||
                field.key.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase() === (field.displayLabel || field.label).toLowerCase()
              );
              
              if (matchingKey && rowData.originalData[matchingKey]) {
                const value = String(rowData.originalData[matchingKey]).toLowerCase();
                newData[field.key] = value === 'tak' || value === 'true' || value === '1' || value === 'yes';
              } else {
                newData[field.key] = false;
              }
            } else if (field.type === 'tags') {
              // Tags can't be imported from Excel - mark as incomplete
              newData[field.key] = { majorTag: null, minorTags: [] };
              if (field.required) {
                hasIncompleteData = true;
              }
            } else {
              // Try to find matching field in imported data
              const matchingKey = Object.keys(rowData.originalData).find(key => 
                key.toLowerCase().includes(field.key.toLowerCase()) ||
                field.key.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase() === (field.displayLabel || field.label).toLowerCase()
              );
              
              if (matchingKey && rowData.originalData[matchingKey] !== undefined && rowData.originalData[matchingKey] !== '') {
                let value = rowData.originalData[matchingKey];
                
                // Type conversion based on field type
                if (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') {
                  const numValue = parseFloat(String(value));
                  value = isNaN(numValue) ? 0 : numValue;
                } else {
                  value = String(value);
                }
                
                newData[field.key] = value;
              } else {
                if (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') {
                  newData[field.key] = 0;
                } else {
                  newData[field.key] = '';
                }
                
                if (field.required) {
                  hasIncompleteData = true;
                }
              }
            }
          });
          
          // Save the object with incomplete data flag
          const savedData = await onSave(newData, hasIncompleteData);
          
          // If the save function returns the saved object with ID, mark it as incomplete
          // Note: This assumes onSave returns the saved object or we need to track it differently
          importedCount++;
        }
      }
      
      showImportModal = false;
      importedData = [];
      selectedImportRows = new Set();
      
      const incompleteCount = importedData.filter((row, index) => 
        sortedRowIndices.includes(index) && row.hasIncompleteData
      ).length;
      
      if (incompleteCount > 0) {
        alert(`Pomyślnie zaimportowano ${importedCount} pinezek. ${incompleteCount} pinezek ma niekompletne dane i zostanie oznaczone na mapie.`);
      } else {
        alert(`Pomyślnie zaimportowano ${importedCount} pinezek.`);
      }
      
    } catch (error) {
      console.error('Import rows error:', error);
      alert('Błąd podczas importowania wybranych wierszy: ' + (error instanceof Error ? error.message : 'Nieznany błąd'));
    }
  }
</script>

{#if showForm}
  <div class="form-section">
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
          disabled={isImporting}
        >
        <label for="excel-import" class="import-btn" class:disabled={isImporting}>
<Icon name="Document" size={16} /> {isImporting ? 'Importowanie...' : 'Importuj z Excel'}
        </label>
        <small class="help-text">
          {#if isImporting}
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
          <label>
            {field.displayLabel || field.label} {field.required ? '*' : ''}
            
            {#if field.type === 'text'}
              {#if field.key === 'coordinates'}
                <div class="input-with-button">
                  <input 
                    value={getFieldValue(field.key)} 
                    oninput={(e) => handleTextInput(field.key, e)}
                    required={field.required}
                    placeholder="Kliknij na mapę aby wybrać lokalizację"
                    readonly
                  >
                  <button
                    type="button"
                    onclick={clearCoordinates}
                    disabled={!getFieldValue(field.key)}
                    class="clear-coords-btn"
                    title="Wyczyść współrzędne"
                  >
                    <Icon name="Close" size={16} />
                  </button>
                </div>
              {:else}
                <input 
                  value={getFieldValue(field.key)} 
                  oninput={(e) => handleTextInput(field.key, e)}
                  required={field.required}
                >
              {/if}
            {:else if field.type === 'number'}
              <input 
                type="number" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleNumberInput(field.key, e)}
                required={field.required}
              >
            {:else if field.type === 'currency'}
              <div class="currency-field">
                <input 
                  type="number" 
                  step="0.01"
                  value={getFieldValue(field.key)}
                  oninput={(e) => handleNumberInput(field.key, e)}
                  required={field.required}
                  placeholder="0.00"
                >
                <span class="currency-symbol">zł</span>
              </div>
            {:else if field.type === 'percentage'}
              <div class="percentage-field">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={getFieldValue(field.key)}
                  oninput={(e) => handleNumberInput(field.key, e)}
                  required={field.required}
                  placeholder="0"
                >
                <span class="percentage-symbol">%</span>
              </div>
            {:else if field.type === 'email'}
              <input 
                type="email" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="nazwa@example.com"
              >
            {:else if field.type === 'url'}
              <input 
                type="url" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="https://example.com"
              >
            {:else if field.type === 'date'}
              <input 
                type="date" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
              >
            {:else if field.type === 'textarea'}
              <textarea 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="Wprowadź dłuższy tekst..."
                rows="4"
              ></textarea>
            {:else if field.type === 'select'}
              <select 
                value={getFieldValue(field.key)}
                onchange={(e) => handleTextInput(field.key, e)}
                required={field.required}
              >
                <option value="">Wybierz opcję...</option>
                {#each field.selectConfig?.options || [] as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {:else if field.type === 'image'}
              <div class="image-field">
                <div class="image-input-options">
                  <input 
                    type="url" 
                    value={getFieldValue(field.key)}
                    oninput={(e) => handleTextInput(field.key, e)}
                    required={field.required}
                    placeholder="https://example.com/obraz.jpg lub przesłij plik"
                  >
                  <span class="input-separator">lub</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onchange={(e) => handleImageUpload(field.key, e)}
                    class="file-input"
                    id="image-upload-{field.key}"
                  >
                  <label for="image-upload-{field.key}" class="file-upload-btn">
                    <Icon name="Document" size={16} /> Prześlij plik
                  </label>
                </div>
                {#if getFieldValue(field.key)}
                  <div class="image-preview">
                    <img src={String(getFieldValue(field.key))} alt="Podgląd" loading="lazy" />
                  </div>
                {/if}
              </div>
            {:else if field.type === 'youtube'}
              <input 
                type="url" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID lub https://youtu.be/VIDEO_ID"
              >
              {#if getFieldValue(field.key)}
                <div class="youtube-preview">
                  <small class="help-text">Film YouTube zostanie wyświetlony na liście pinezek</small>
                </div>
              {/if}
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
            {:else if field.type === 'checkbox'}
              <input 
                type="checkbox" 
                checked={getCheckboxValue(field.key)}
                onchange={(e) => handleCheckboxChange(field.key, e)}
              >
            {:else if field.type === 'tags'}
              <!-- Tag Selection UI -->
              {@const tagData = getTagValue(field.key)}
              {@const maxMinorTags = field.tagConfig?.maxMinorTags || 3}
              
              <div class="tag-field">
                <!-- Major Tag Selection -->
                <div class="major-tag-section">
                  <label class="tag-section-label">Główny tag (wymagany):</label>
                  <select 
                    value={tagData.majorTag || ''}
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement;
                      const newTagData = { ...tagData, majorTag: target.value || null };
                      handleTagChange(field.key, newTagData);
                    }}
                    class="tag-select"
                    required={field.required}
                  >
                    <option value="">Wybierz główny tag...</option>
                    {#each availableTags as tag}
                      <option value={tag.id}>{tag.displayName || tag.name}</option>
                    {/each}
                  </select>
                  
                  {#if tagData.majorTag}
                    {@const selectedTag = availableTags.find(t => t.id === tagData.majorTag)}
                    {#if selectedTag}
                      <div class="tag-preview major" style="background-color: {selectedTag.color}">
                        {selectedTag.displayName || selectedTag.name}
                      </div>
                    {/if}
                  {/if}
                </div>
                
                <!-- Minor Tags Selection -->
                <div class="minor-tags-section">
                  <label class="tag-section-label">Dodatkowe tagi (max {maxMinorTags}):</label>
                  <div class="minor-tags-grid">
                    {#each availableTags as tag}
                      {@const isSelected = tagData.minorTags.includes(tag.id)}
                      {@const isMajor = tagData.majorTag === tag.id}
                      {@const canSelect = !isMajor && (isSelected || tagData.minorTags.length < maxMinorTags)}
                      
                      <label class="tag-checkbox" class:disabled={!canSelect}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onchange={(e) => {
                            const target = e.target as HTMLInputElement;
                            let newMinorTags = [...tagData.minorTags];
                            
                            if (target.checked) {
                              if (!newMinorTags.includes(tag.id)) {
                                newMinorTags.push(tag.id);
                              }
                            } else {
                              newMinorTags = newMinorTags.filter(id => id !== tag.id);
                            }
                            
                            const newTagData = { ...tagData, minorTags: newMinorTags };
                            handleTagChange(field.key, newTagData);
                          }}
                        >
                        <div class="tag-preview minor" style="background-color: {tag.color}" class:major={isMajor}>
                          {tag.displayName || tag.name}
                          {#if isMajor}
                            <span class="major-indicator">Główny</span>
                          {/if}
                        </div>
                      </label>
                    {/each}
                  </div>
                  
                  <div class="tag-counter">
                    {tagData.minorTags.length} / {maxMinorTags} wybranych
                  </div>
                </div>
              </div>
            {/if}
          </label>
        </div>
      {/each}
      
      <button onclick={saveObject}>
        {#if editingObject}
          <Icon name="Checkmark" size={16} /> Aktualizuj Pinezkę
        {:else}
          <Icon name="Pin" size={16} /> Zapisz Pinezkę
        {/if}
      </button>

      {#if editingObject}
        <button type="button" class="cancel-btn" onclick={cancelEdit}>
          <Icon name="Close" size={16} /> Anuluj
        </button>
      {/if}
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

<!-- Excel Import Modal -->
{#if showImportModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Import danych z Excel</h3>
        <button type="button" onclick={() => showImportModal = false} class="close-btn">
          <Icon name="Close" size={20} />
        </button>
      </div>
      
      <div class="modal-body">
        <p>Znaleziono <strong>{importedData.length}</strong> wierszy do zaimportowania.</p>
        {#if importedData.filter(row => row.hasIncompleteData).length > 0}
          {@const incompleteRows = importedData.filter(row => row.hasIncompleteData).length}
          <div class="warning-box">
<Icon name="Cross" size={16} /> <strong>Uwaga:</strong> {incompleteRows} wierszy będzie miało niekompletne dane. 
            Pinezki z niekompletnymi danymi zostaną oznaczone na mapie.
          </div>
        {/if}
        <p>Wybierz które wiersze chcesz zaimportować:</p>
        
        <div class="import-data-table">
          <div class="table-controls">
            <button 
              type="button" 
              onclick={() => {
                if (selectedImportRows.size === importedData.length) {
                  selectedImportRows = new Set();
                } else {
                  selectedImportRows = new Set(importedData.map((_, i) => i));
                }
              }}
              class="select-all-btn"
            >
              {selectedImportRows.size === importedData.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
            </button>
            <span class="selection-count">
              Wybrano: {selectedImportRows.size} / {importedData.length}
            </span>
          </div>
          
          <div class="import-table-scroll">
            <table class="import-table">
              <thead>
                <tr>
                  <th>Wybierz</th>
                  <th>Współrzędne</th>
                  <th>Dane</th>
                </tr>
              </thead>
              <tbody>
                {#each importedData as row, i}
                  <tr class:selected={selectedImportRows.has(i)} class:incomplete={row.hasIncompleteData}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedImportRows.has(i)}
                        onchange={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.checked) {
                            selectedImportRows.add(i);
                          } else {
                            selectedImportRows.delete(i);
                          }
                          selectedImportRows = new Set(selectedImportRows);
                        }}
                      >
                      {#if row.hasIncompleteData}
<span class="incomplete-indicator" title="Pinezka będzie miała niekompletne dane"><Icon name="Cross" size={12} /></span>
                      {/if}
                    </td>
                    <td>
                      {#if row.coordinates}
                        <span class="coordinates">
                          {row.coordinates.lat.toFixed(4)}, {row.coordinates.lng.toFixed(4)}
                        </span>
                      {:else}
                        <span class="no-coordinates">Brak współrzędnych</span>
                      {/if}
                    </td>
                    <td>
                      <div class="row-data">
                        {#each Object.entries(row.originalData) as [key, value]}
                          <div class="data-item">
                            <strong>{key}:</strong> {value}
                          </div>
                        {/each}
                        {#if row.hasIncompleteData}
                          <div class="data-item incomplete-notice">
<em><Icon name="Cross" size={12} /> Wymaga uzupełnienia po imporcie</em>
                          </div>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" onclick={() => showImportModal = false} class="cancel-btn">
          Anuluj
        </button>
        <button type="button" onclick={importSelectedRows} class="import-confirm-btn">
          Importuj wybrane ({selectedImportRows.size})
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .form-section {
    margin-bottom: 0;
    padding: var(--space-3);
    background: transparent;
  }

  /* Compact mode for even tighter spacing */
  .form-section.compact {
    padding: var(--space-2);
  }

  .form-section.compact .form-field {
    margin-bottom: var(--space-2);
  }

  .form-section.compact .form-field label {
    margin-bottom: 2px;
  }
  
  .form-field {
    margin-bottom: var(--space-3);
  }

  .form-field label {
    display: block;
    margin-bottom: var(--space-1);
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
  }
  
  .form-field input, .form-field select {
    width: 100%;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: var(--color-background);
    transition: border-color var(--transition-fast);
    box-sizing: border-box;
  }

  .form-field input:focus, .form-field select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-field input[readonly] {
    background: var(--color-surface);
    color: var(--color-text-secondary);
  }

  .form-field textarea {
    width: 100%;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: var(--color-background);
    transition: border-color var(--transition-fast);
    box-sizing: border-box;
    resize: vertical;
    min-height: 60px;
  }

  .form-field textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .currency-field, .percentage-field {
    display: flex;
    align-items: center;
    position: relative;
  }

  .currency-field input, .percentage-field input {
    padding-right: 40px;
  }

  .currency-symbol, .percentage-symbol {
    position: absolute;
    right: 12px;
    color: #6b7280;
    font-weight: 600;
    pointer-events: none;
  }

  .image-preview {
    margin-top: 8px;
    border-radius: 8px;
    overflow: hidden;
    max-width: 300px;
    border: 1px solid #e5e7eb;
  }

  .image-preview img {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
    display: block;
  }

  .youtube-preview {
    margin-top: 8px;
    padding: 8px 12px;
    background: #f3f4f6;
    border-radius: 6px;
    border: 1px solid #d1d5db;
  }

  .help-text {
    color: #6b7280;
    font-size: 12px;
    font-style: italic;
    margin: 0;
  }

  .input-with-button {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .input-with-button input {
    flex: 1;
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
  
  
  button:not(.clear-coords-btn):not(.cancel-btn) {
    background: var(--color-accent);
    color: white;
    border: none;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-base);
    cursor: pointer;
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
  }

  button:not(.clear-coords-btn):not(.cancel-btn):hover {
    opacity: 0.9;
  }

  .cancel-btn {
    background: var(--color-border);
    color: var(--color-text-primary);
    border: none;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-base);
    cursor: pointer;
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
    margin-left: var(--space-2);
  }

  .cancel-btn:hover {
    opacity: 0.8;
  }
  
  /* Tag field styles */
  .tag-field {
    margin-top: var(--space-1);
    padding: var(--space-2);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
  }

  .major-tag-section {
    margin-bottom: var(--space-3);
  }
  
  .tag-section-label {
    display: block !important;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-1);
  }
  
  .tag-select {
    width: 100%;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    background: var(--color-background);
    font-size: var(--text-sm);
    margin-bottom: var(--space-1);
  }
  
  .tag-select:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  
  .tag-preview {
    padding: 6px 12px;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    display: inline-block;
    margin-top: 4px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  
  .tag-preview.major {
    border: 2px solid rgba(255, 255, 255, 0.8);
  }
  
  .tag-preview.minor {
    font-size: 12px;
    padding: 4px 8px;
    position: relative;
  }
  
  .tag-preview.minor.major {
    opacity: 0.5;
    position: relative;
  }
  
  .major-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #dc2626;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }
  
  .minor-tags-section {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-2);
  }
  
  .minor-tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }
  
  .tag-checkbox {
    display: flex !important;
    align-items: center;
    cursor: pointer;
    margin: 0 !important;
    padding: 4px;
    border-radius: 6px;
    transition: background-color 0.2s;
  }
  
  .tag-checkbox:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .tag-checkbox.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tag-checkbox.disabled:hover {
    background: none;
  }
  
  .tag-checkbox input[type="checkbox"] {
    margin-right: 8px;
    width: auto !important;
  }
  
  .tag-counter {
    font-size: 12px;
    color: #6b7280;
    text-align: right;
  }

  /* Import/Export Controls */
  .import-export-controls {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    flex-wrap: wrap;
    gap: 16px;
  }

  .import-controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .import-btn, .export-btn, .template-btn {
    background: #3b82f6;
    color: white;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    margin-right: 8px;
    margin-bottom: 8px;
  }

  .import-btn:hover, .export-btn:hover, .template-btn:hover {
    background: #2563eb;
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
    background: #8b5cf6;
  }

  .template-btn:hover {
    background: #7c3aed;
  }

  .export-btn {
    background: #10b981;
  }

  .export-btn:hover {
    background: #059669;
  }

  .cancel-import-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-left: 8px;
  }

  .cancel-import-btn:hover {
    background: #dc2626;
  }

  /* Address Field */
  .address-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .address-input-with-button {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .address-input-with-button input {
    flex: 1;
  }

  .geocode-btn {
    background: #8b5cf6;
    color: white;
    border: none;
    padding: 12px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-width: 140px;
  }

  .geocode-btn:hover:not(:disabled) {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  .geocode-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .sync-status {
    padding: 6px 12px;
    background: #ecfdf5;
    border: 1px solid #d1fae5;
    border-radius: 6px;
  }

  /* Image Field Enhancements */
  .image-field {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .image-input-options {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .image-input-options input[type="url"] {
    flex: 1;
    min-width: 200px;
  }

  .input-separator {
    font-size: 14px;
    color: #6b7280;
    font-style: italic;
  }

  .file-input {
    display: none;
  }

  .file-upload-btn {
    background: #f59e0b;
    color: white;
    padding: 10px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-block;
    white-space: nowrap;
  }

  .file-upload-btn:hover {
    background: #d97706;
    transform: translateY(-1px);
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 90vw;
    max-height: 90vh;
    width: 800px;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #9ca3af;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    padding: 24px;
    flex: 1;
    overflow: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    border-radius: 0 0 12px 12px;
  }

  /* Import Table */
  .import-data-table {
    margin-top: 16px;
  }

  .table-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .select-all-btn {
    background: #6366f1;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .select-all-btn:hover {
    background: #5856eb;
  }

  .selection-count {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
  }

  .import-table-scroll {
    max-height: 400px;
    overflow: auto;
    border: 1px solid #d1d5db;
    border-radius: 6px;
  }

  .import-table {
    width: 100%;
    border-collapse: collapse;
  }

  .import-table th {
    background: #f9fafb;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
  }

  .import-table td {
    padding: 12px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }

  .import-table tr.selected {
    background: #eff6ff;
  }

  .import-table tr:hover {
    background: #f8fafc;
  }

  .coordinates {
    font-family: monospace;
    font-size: 12px;
    background: #ecfdf5;
    padding: 4px 6px;
    border-radius: 4px;
    color: #065f46;
  }

  .no-coordinates {
    font-size: 12px;
    color: #ef4444;
    font-style: italic;
  }

  .row-data {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 300px;
  }

  .data-item {
    font-size: 12px;
    padding: 2px 0;
  }

  .data-item strong {
    color: #374151;
  }

  .import-confirm-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .import-confirm-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .import-confirm-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  /* Warning and Incomplete Data Styles */
  .warning-box {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #92400e;
  }

  .import-table tr.incomplete {
    background-color: #fef3c7 !important;
  }

  .import-table tr.incomplete:hover {
    background-color: #fde68a !important;
  }

  .import-table tr.incomplete.selected {
    background-color: #fed7aa !important;
  }

  .incomplete-indicator {
    margin-left: 8px;
    font-size: 14px;
    color: #f59e0b;
  }

  .incomplete-notice {
    color: #92400e !important;
    font-size: 11px !important;
    margin-top: 4px;
    padding: 2px 6px;
    background: #fed7aa;
    border-radius: 3px;
  }
  
  
</style>