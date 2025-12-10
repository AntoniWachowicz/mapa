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
  import RichTextInput from './fields/RichTextInput.svelte';
  import LinksInput from './fields/LinksInput.svelte';
  import MultiDateInput from './fields/MultiDateInput.svelte';
  import AddressInput from './fields/AddressInput.svelte';
  import PriceInput from './fields/PriceInput.svelte';
  import FilesInput from './fields/FilesInput.svelte';
  import GalleryInput from './fields/GalleryInput.svelte';
  
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
  let showImportModal = $state(false);
  let importedData = $state<any[]>([]);
  let selectedImportRows = $state<Set<number>>(new Set());
  let isImporting = $state(false);
  let importProgress = $state({ current: 0, total: 0, message: '' });
  let importController = $state<AbortController | null>(null);

  // Column mapping state
  let showColumnMappingModal = $state(false);
  let excelHeaders = $state<string[]>([]);
  let excelSampleData = $state<Record<string, any>[]>([]);
  let columnMapping = $state<Record<string, string>>({});  // { "Excel Column": "fieldKey" | "latitude" | "longitude" | "geocode" | "ignore" }
  // Store temp file ID from server (file is stored server-side)
  let currentTempId = $state<string | null>(null);
  let showCreateFieldModal = $state(false);
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
      const newFormData: ProjectData = {};
      template.fields.forEach((field) => {
        const fieldType = field.fieldType || field.type;
        const fieldName = field.fieldName || field.key;

        switch (fieldType) {
          case 'title':
          case 'richtext':
            newFormData[fieldName] = '';
            break;

          case 'files':
            newFormData[fieldName] = [];
            break;

          case 'gallery':
            newFormData[fieldName] = { items: [] } as GalleryData;
            break;

          case 'multidate':
            const multiDateConfig = field.config as MultiDateConfig;
            // Pre-populate with null dates for all configured date fields
            const initialDates: MultiDateData = {};
            multiDateConfig?.dateFields?.forEach(dateField => {
              initialDates[dateField.key] = null;
            });
            newFormData[fieldName] = initialDates;
            break;

          case 'address':
            const addressConfig = field.config as AddressConfig;
            // Pre-populate with empty strings for all configured address fields
            const initialAddress: AddressData = {};
            addressConfig?.displayFields?.forEach(fieldKey => {
              initialAddress[fieldKey as keyof AddressData] = '';
            });
            newFormData[fieldName] = initialAddress;
            break;

          case 'links':
            newFormData[fieldName] = [];
            break;

          case 'price':
            const priceConfig = field.config as PriceConfig;
            // Pre-populate funding sources from config
            const initialFunding = priceConfig?.defaultFundingSources?.map(source => ({
              source: source,
              amount: 0
            })) || [];
            newFormData[fieldName] = {
              currency: priceConfig?.currency || 'PLN',
              funding: initialFunding,
              showTotal: priceConfig?.showTotal ?? true,
              showBreakdown: priceConfig?.showPercentages ?? true
            } as PriceData;
            break;

          case 'tags':
          case 'category':
            newFormData[fieldName] = { selectedTags: [], majorTag: null, minorTags: [] } as any;
            break;

          // Legacy field types
          case 'checkbox':
            newFormData[fieldName] = false;
            break;

          default:
            newFormData[fieldName] = '';
        }
      });
      formData = newFormData;
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

    // Robust validation
    const emptyRequiredFields: string[] = [];

    for (const field of template.fields) {
      if (field.required && field.visible) {
        const fieldType = field.fieldType || field.type;
        const fieldName = field.fieldName || field.key;

        // Special handling for location field
        if (fieldType === 'location' || field.key === 'location') {
          if (!selectedCoordinates) {
            emptyRequiredFields.push(field.label || field.displayLabel);
          }
          continue;
        }

        const value = formData[fieldName];

        // NEW FIELD TYPES VALIDATION
        if (fieldType === 'title' || fieldType === 'richtext') {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.label);
          }
        } else if (fieldType === 'files') {
          if (!Array.isArray(value) || value.length === 0) {
            emptyRequiredFields.push(field.label);
          }
        } else if (fieldType === 'gallery') {
          const gallery = value as GalleryData;
          if (!gallery || !gallery.items || gallery.items.length === 0) {
            emptyRequiredFields.push(field.label);
          }
        } else if (fieldType === 'multidate') {
          const config = field.config as MultiDateConfig;
          const dates = value as MultiDateData;
          const hasRequiredDates = config?.dateFields
            ?.filter(df => df.required)
            .every(df => dates && dates[df.key]);
          if (!hasRequiredDates) {
            emptyRequiredFields.push(field.label);
          }
        } else if (fieldType === 'address' && field.config) {
          const addrConfig = field.config as AddressConfig;
          const addr = value as AddressData;
          const hasRequiredAddr = addrConfig?.requiredFields
            ?.every(rf => addr && addr[rf]);
          if (!hasRequiredAddr) {
            emptyRequiredFields.push(field.label);
          }
        } else if (fieldType === 'links') {
          if (!Array.isArray(value) || value.length === 0) {
            emptyRequiredFields.push(field.label);
          }
        } else if (fieldType === 'price') {
          const priceData = value as PriceData;
          if (!priceData || !priceData.funding || priceData.funding.length === 0) {
            emptyRequiredFields.push(field.label);
          }
        }
        // LEGACY FIELD TYPES VALIDATION
        else if (field.type === 'checkbox') {
          continue; // Checkboxes don't need validation
        } else if (['text', 'textarea', 'email', 'url', 'date', 'select', 'image', 'youtube', 'address'].includes(field.type || '')) {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        } else if (['number', 'currency', 'percentage'].includes(field.type || '')) {
          if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        } else if (field.type === 'tags' || field.type === 'category') {
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
      await onUpdate(editingObject.id, formData);
      editingObject = null;
    } else {
      // Create new object
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

  function getComplexFieldValue(key: string): any {
    return formData[key];
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

  // Address geocoding handler - No longer updates coordinates field
  // Coordinates are now handled separately via selectedCoordinates in GeoJSON format
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

  // Excel import handler - now shows mapping modal first
  async function handleExcelImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Proszę wybrać plik Excel (.xlsx lub .xls)');
      return;
    }

    isImporting = true;
    importProgress = { current: 0, total: 0, message: 'Analizowanie pliku Excel...' };
    importController = new AbortController();

    try {
      const formData = new FormData();
      formData.append('excel', file);

      // Analyze the Excel file (server stores it temporarily)
      const response = await fetch('/api/analyze-excel', {
        method: 'POST',
        body: formData,
        signal: importController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Store temp ID (file is stored on server)
        currentTempId = result.tempId;
        excelHeaders = result.headers;
        excelSampleData = result.sampleData;
        columnMapping = {}; // Reset mapping

        // Show column mapping modal
        showColumnMappingModal = true;
      } else {
        alert('Błąd podczas analizy pliku Excel');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Analysis cancelled by user');
      } else {
        console.error('Analysis error:', error);
        alert('Błąd podczas analizy pliku Excel: ' + error.message);
      }
    } finally {
      isImporting = false;
      importController = null;
      // Clear input
      input.value = '';
    }
  }

  // Proceed with import after column mapping
  async function proceedWithImport(): Promise<void> {
    if (!currentTempId) {
      alert('Błąd: Brak danych pliku Excel. Proszę wybrać plik ponownie.');
      return;
    }

    isImporting = true;
    importProgress = { current: 0, total: 0, message: 'Importowanie danych...' };
    importController = new AbortController();

    try {
      // Send JSON with tempId (file is already on server)
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempId: currentTempId, columnMapping }),
        signal: importController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        importedData = result.data;
        selectedImportRows = new Set();
        showColumnMappingModal = false;
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
      currentTempId = null;
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
          // Note: coordinates are no longer stored in form data, they're in GeoJSON location
          template.fields.forEach(field => {
            if (field.type === 'checkbox') {
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

            <!-- NEW FIELD TYPES -->
            {:else if (field.fieldType || field.type) === 'richtext'}
              <RichTextInput
                value={String(getFieldValue(field.fieldName || field.key))}
                config={field.config as RichTextConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
              />

            {:else if (field.fieldType || field.type) === 'links'}
              <LinksInput
                value={getComplexFieldValue(field.fieldName || field.key) as LinkData[]}
                config={field.config as LinksConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
              />

            {:else if (field.fieldType || field.type) === 'multidate'}
              <MultiDateInput
                value={getComplexFieldValue(field.fieldName || field.key) as MultiDateData}
                config={field.config as MultiDateConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
              />

            {:else if (field.fieldType || field.type) === 'address' && field.config}
              <AddressInput
                value={getComplexFieldValue(field.fieldName || field.key) as AddressData}
                config={field.config as AddressConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
                onGeocode={() => handleAddressGeocode(field.fieldName || field.key)}
              />

            {:else if (field.fieldType || field.type) === 'price'}
              <PriceInput
                value={getComplexFieldValue(field.fieldName || field.key) as PriceData}
                config={field.config as PriceConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
              />

            {:else if (field.fieldType || field.type) === 'files'}
              <FilesInput
                value={getComplexFieldValue(field.fieldName || field.key) as FileData[]}
                config={field.config as FilesConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
              />

            {:else if (field.fieldType || field.type) === 'gallery'}
              <GalleryInput
                value={getComplexFieldValue(field.fieldName || field.key) as GalleryData}
                config={field.config as GalleryConfig}
                required={field.required}
                oninput={(val) => formData[field.fieldName || field.key] = val}
              />

            <!-- LEGACY FIELD TYPES -->
            {:else if field.type === 'text'}
              <input
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
              >
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
            {:else if field.type === 'tags' || (field.fieldType || field.type) === 'category'}
              <!-- Tag/Category Selection UI -->
              {@const tagData = getTagValue(field.fieldName || field.key)}
              {@const maxMinorTags = field.tagConfig?.maxMinorTags || 3}

              <div class="tag-field">
                <!-- Major Tag Selection -->
                <div class="sub-field">
                  <span class="sub-field-label">Główny tag (wymagany)</span>
                  <select 
                    value={tagData.majorTag || ''}
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement;
                      const newTagData = { ...tagData, majorTag: target.value || null };
                      handleTagChange(field.fieldName || field.key, newTagData);
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
                  <div class="sub-field">
                    <span class="sub-field-label">Dodatkowe tagi (max {maxMinorTags})</span>
                    <div class="minor-tags-container">
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
                            handleTagChange(field.fieldName || field.key, newTagData);
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
                </div>
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
{#if showColumnMappingModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Mapowanie kolumn Excel</h3>
        <button type="button" onclick={() => {
          showColumnMappingModal = false;
          currentTempId = null;
        }} class="close-btn">
          <Icon name="Close" size={20} />
        </button>
      </div>

      <div class="modal-body">
        <p>Zmapuj kolumny z pliku Excel do pól w schemacie lub specjalnych celów (współrzędne, geokodowanie).</p>
        <p class="help-text">Plik zawiera {excelSampleData.length} przykładowych wierszy z {excelHeaders.length} kolumnami.</p>

        <div class="mapping-table">
          <div class="mapping-header">
            <div class="mapping-col col-excel">Kolumna Excel</div>
            <div class="mapping-col col-sample">Przykładowe dane</div>
            <div class="mapping-col col-map-to">Mapuj do</div>
          </div>

          <div class="mapping-rows">
            {#each excelHeaders as header, index}
              <div class="mapping-row">
                <div class="mapping-col col-excel">
                  <strong>{header}</strong>
                </div>
                <div class="mapping-col col-sample">
                  <div class="sample-data">
                    {#each excelSampleData.slice(0, 3) as sample}
                      {#if sample[header]}
                        <div class="sample-item">{String(sample[header]).substring(0, 50)}{String(sample[header]).length > 50 ? '...' : ''}</div>
                      {:else}
                        <div class="sample-item empty">—</div>
                      {/if}
                    {/each}
                  </div>
                </div>
                <div class="mapping-col col-map-to">
                  <select
                    value={columnMapping[header] || 'ignore'}
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement;
                      if (target.value === 'create_new') {
                        // Show create field modal
                        newFieldData = { name: '', label: header, type: 'text', required: false, forColumn: header };
                        showCreateFieldModal = true;
                      } else {
                        columnMapping = {
                          ...columnMapping,
                          [header]: target.value
                        };
                      }
                    }}
                    class="mapping-select"
                  >
                    <option value="ignore">⊗ Ignoruj</option>
                    <optgroup label="Specjalne">
                      <option value="latitude">📍 Szerokość geograficzna (Latitude)</option>
                      <option value="longitude">📍 Długość geograficzna (Longitude)</option>
                      <option value="geocode">🔍 Adres do geokodowania</option>
                    </optgroup>
                    <optgroup label="Pola schematu">
                      {#each template.fields.filter(f => f.visible) as field}
                        <option value={field.key}>{field.displayLabel || field.label}</option>
                      {/each}
                    </optgroup>
                    <option value="create_new">➕ Utwórz nowe pole</option>
                  </select>

                  {#if columnMapping[header] && columnMapping[header] !== 'ignore'}
                    <div class="mapping-preview">
                      {#if columnMapping[header] === 'latitude'}
                        → Szerokość geograficzna
                      {:else if columnMapping[header] === 'longitude'}
                        → Długość geograficzna
                      {:else if columnMapping[header] === 'geocode'}
                        → Adres (geokodowanie)
                      {:else}
                        {@const field = template.fields.find(f => f.key === columnMapping[header])}
                        {#if field}
                          → {field.displayLabel || field.label}
                        {/if}
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="mapping-summary">
          <h4>Podsumowanie mapowania:</h4>
          <ul>
            <li><strong>Zmapowane kolumny:</strong> {Object.values(columnMapping).filter(v => v !== 'ignore').length}</li>
            <li><strong>Ignorowane kolumny:</strong> {Object.values(columnMapping).filter(v => v === 'ignore').length + (excelHeaders.length - Object.keys(columnMapping).length)}</li>
            {#if Object.values(columnMapping).includes('latitude') && Object.values(columnMapping).includes('longitude')}
              <li class="success">✓ Współrzędne będą importowane bezpośrednio</li>
            {:else if Object.values(columnMapping).includes('geocode')}
              <li class="warning">⚠ Adresy wymagają ręcznego geokodowania po imporcie</li>
            {:else}
              <li class="warning">⚠ Brak współrzędnych - wszystkie pinezki będą bez lokalizacji</li>
            {/if}
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" onclick={() => {
          showColumnMappingModal = false;
          currentTempId = null;
        }} class="cancel-btn">
          Anuluj
        </button>
        <button type="button" onclick={proceedWithImport} class="import-confirm-btn">
          Kontynuuj import
        </button>
      </div>
    </div>
  </div>
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

  .sub-field {
    margin-bottom: 8px;
  }

  .sub-field-label {
    font-family: 'DM Sans', sans-serif;
    font-weight: 400;
    color: #666;
    font-size: 12px;
    display: block;
    margin-bottom: 4px;
  }

  .form-field input,
  .form-field select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #000000;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    background: #FFFFFF;
    color: #000000;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 1px #000000;
  }

  .form-field input[readonly] {
    background: #F5F5F5;
    color: #666;
  }

  .form-field textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #000000;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    background: #FFFFFF;
    color: #000000;
    transition: all 0.2s;
    box-sizing: border-box;
    resize: vertical;
    min-height: 80px;
    line-height: 1.5;
  }

  .form-field textarea:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 1px #000000;
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
  
  /* Tag field styles */
  .tag-field {
    margin-top: 8px;
    padding: 12px;
    background: #FAFAFA;
    border: 1px solid #000000;
    border-radius: 0;
  }

  .major-tag-section {
    margin-bottom: 12px;
  }

  .minor-tags-container {
    width: 100%;
  }

  .tag-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #000000;
    border-radius: 0;
    background: #FFFFFF;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .tag-select:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 1px #000000;
  }

  .tag-preview {
    padding: 6px 12px;
    border-radius: 0;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    display: inline-block;
    margin-top: 6px;
  }

  .tag-preview.major {
    border: 2px solid rgba(0, 0, 0, 0.3);
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
    border-radius: 0;
    line-height: 1;
    font-family: 'DM Sans', sans-serif;
  }

  .minor-tags-section {
    margin-top: 12px;
  }

  .minor-tags-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag-checkbox {
    display: flex !important;
    align-items: center;
    cursor: pointer;
    margin: 0 !important;
    padding: 6px;
    border-radius: 0;
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
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    color: #666;
    text-align: right;
  }

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
    background: #2563EB;
    color: white;
    border: 1px solid #000000;
    padding: 10px 14px;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-width: 140px;
  }

  .geocode-btn:hover:not(:disabled) {
    background: #1d4ed8;
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
    border: 1px solid #10b981;
    border-radius: 0;
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
    gap: 8px;
    flex-wrap: wrap;
  }

  .image-input-options input[type="url"] {
    flex: 1;
    min-width: 200px;
  }

  .input-separator {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #666;
    font-style: italic;
  }

  .file-input {
    display: none;
  }

  .file-upload-btn {
    background: #f59e0b;
    color: white;
    padding: 8px 12px;
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
    white-space: nowrap;
  }

  .file-upload-btn:hover {
    background: #d97706;
    transform: translateY(-1px);
  }

  .image-preview {
    margin-top: 8px;
    border-radius: 0;
    overflow: hidden;
    max-width: 300px;
    border: 2px solid #000000;
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
    border: 1px solid #000000;
    border-radius: 0;
  }

  .location-display {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .location-input {
    flex: 1;
    background: #F5F5F5;
    color: #666;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
  }

  .clear-coords-btn {
    padding: 10px 14px;
    background: #ef4444;
    color: white;
    border: 1px solid #000000;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .clear-coords-btn:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .clear-coords-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
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
    border: 2px solid #000000;
    border-radius: 0;
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
    border-bottom: 1px solid #000000;
  }

  .modal-header h3 {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #000000;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 4px;
    border-radius: 0;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #F5F5F5;
    color: #000000;
  }

  .modal-body {
    padding: 24px;
    flex: 1;
    overflow: auto;
    font-family: 'DM Sans', sans-serif;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #000000;
    background: #FAFAFA;
    border-radius: 0;
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
    background: #FAFAFA;
    border: 1px solid #000000;
    border-radius: 0;
  }

  .select-all-btn {
    background: #6366f1;
    color: white;
    border: 1px solid #000000;
    padding: 6px 12px;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
  }

  .select-all-btn:hover {
    background: #5856eb;
  }

  .selection-count {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .import-table-scroll {
    max-height: 400px;
    overflow: auto;
    border: 2px solid #000000;
    border-radius: 0;
  }

  .import-table {
    width: 100%;
    border-collapse: collapse;
  }

  .import-table th {
    background: #FAFAFA;
    padding: 12px;
    text-align: left;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    color: #000000;
    border-bottom: 2px solid #000000;
    position: sticky;
    top: 0;
  }

  .import-table td {
    font-family: 'DM Sans', sans-serif;
    padding: 12px;
    border-bottom: 1px solid #E5E5E5;
    vertical-align: top;
  }

  .import-table tr.selected {
    background: #EFF6FF;
  }

  .import-table tr:hover {
    background: #F8FAFC;
  }

  .coordinates {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    background: #ecfdf5;
    padding: 4px 8px;
    border-radius: 0;
    color: #065f46;
    border: 1px solid #10b981;
  }

  .no-coordinates {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    color: #ef4444;
    font-style: italic;
  }

  .row-data {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 300px;
  }

  .data-item {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    padding: 2px 0;
  }

  .data-item strong {
    color: #000000;
  }

  .import-confirm-btn {
    background: #10b981;
    color: white;
    border: 1px solid #000000;
    padding: 10px 20px;
    border-radius: 0;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
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
    border: 2px solid #f59e0b;
    border-radius: 0;
    padding: 12px;
    margin-bottom: 16px;
    font-family: 'DM Sans', sans-serif;
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
    font-family: 'DM Sans', sans-serif;
    color: #92400e !important;
    font-size: 11px !important;
    margin-top: 4px;
    padding: 4px 8px;
    background: #fed7aa;
    border-radius: 0;
    border: 1px solid #f59e0b;
  }

  /* Column Mapping Modal Styles */
  .mapping-table {
    margin-top: 16px;
    border: 2px solid #000000;
    border-radius: 0;
  }

  .mapping-header {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1.5fr;
    gap: 12px;
    background: #FAFAFA;
    padding: 12px;
    border-bottom: 2px solid #000000;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 13px;
  }

  .mapping-rows {
    max-height: 400px;
    overflow-y: auto;
  }

  .mapping-row {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1.5fr;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid #E5E5E5;
    transition: background-color 0.2s;
  }

  .mapping-row:hover {
    background: #F8FAFC;
  }

  .mapping-row:last-child {
    border-bottom: none;
  }

  .mapping-col {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .col-excel strong {
    color: #000000;
    font-weight: 600;
  }

  .sample-data {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sample-item {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    padding: 4px 8px;
    background: #F5F5F5;
    border: 1px solid #E5E5E5;
    border-radius: 0;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sample-item.empty {
    font-style: italic;
    color: #999;
  }

  .mapping-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #000000;
    border-radius: 0;
    background: #FFFFFF;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
  }

  .mapping-select:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 1px #2563EB;
  }

  .mapping-preview {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    padding: 6px 8px;
    background: #EFF6FF;
    border: 1px solid #2563EB;
    border-radius: 0;
    color: #1d4ed8;
    font-weight: 500;
  }

  .mapping-summary {
    margin-top: 24px;
    padding: 16px;
    background: #FAFAFA;
    border: 2px solid #000000;
    border-radius: 0;
  }

  .mapping-summary h4 {
    margin: 0 0 12px 0;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: #000000;
  }

  .mapping-summary ul {
    margin: 0;
    padding-left: 20px;
  }

  .mapping-summary li {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    margin-bottom: 6px;
    color: #666;
  }

  .mapping-summary li.success {
    color: #059669;
    font-weight: 600;
  }

  .mapping-summary li.warning {
    color: #f59e0b;
    font-weight: 600;
  }
</style>