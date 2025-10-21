<script lang="ts">
  import MapComponent from '$lib/MapComponent.svelte';
  import PinManager from '$lib/PinManager.svelte';
  import PinList from '$lib/PinList.svelte';
  import Icon from '$lib/Icon.svelte';
  import type { Template, SavedObject, MapObject, MapConfig, CategoryFieldData, ProjectData, PriceData, TagsFieldData, AddressData, LinkData, FileData, GalleryData, MultiDateData, GeoJSON } from '$lib/types.js';

  interface PageData {
    template: Template;
    objects: SavedObject[];
    mapConfig: MapConfig;
  }

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  let template = $state<Template>(data.template || { fields: [] });
  let objects = $state<SavedObject[]>(data.objects || []);
  let mapConfig = $state<MapConfig>(data.mapConfig);

  let focusCoordinates = $state<{lat: number, lng: number} | null>(null);
  let selectedCoordinates = $state<{lat: number, lng: number} | null>(null);
  let selectedObject = $state<SavedObject | null>(null); // Currently selected pin for detail view
  let showAdditionPanel = $state(false); // Track if addition panel is shown
  let sidebarWidth = $state(400); // Default sidebar width in pixels
  let isDragging = $state(false);
  let isPinSectionCollapsed = $state(false); // New state for pin section collapse
  let detailPanelEl: HTMLDivElement | null = null; // Reference to detail panel
  let mapViewEl: HTMLDivElement | null = null; // Reference to map view
  let connectionLine = $state({ x1: 0, y1: 0, x2: 0, y2: 0 }); // Connection line coordinates
  let lightboxImageUrl = $state<string | null>(null); // Image lightbox state

  // Filter and sort state
  let filterText = $state('');
  let sortField = $state('');
  let filteredObjects = $state<SavedObject[]>([]);
  let showFilterInput = $state(false);
  let showSortSelect = $state(false);

  // Initialize filtered objects
  filteredObjects = objects;
  $effect(() => {
    filteredObjects = [...objects];
  });

  function handleFilter(): void {
    let filtered = objects;

    // Text filter
    if (filterText.trim()) {
      filtered = filtered.filter(obj => {
        const searchTerm = filterText.toLowerCase();
        return template.fields.some(field => {
          if (!field.key) return false;
          const value = obj.data[field.key];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm);
          }
          return false;
        });
      });
    }

    filteredObjects = filtered;
  }

  function handleSort(): void {
    if (!sortField) return;

    filteredObjects = [...filteredObjects].sort((a, b) => {
      const aValue = a.data[sortField] || '';
      const bValue = b.data[sortField] || '';
      return String(aValue).localeCompare(String(bValue));
    });
  }

  function focusOnPin(obj: SavedObject): void {
    if (obj.location && obj.location.coordinates && obj.location.coordinates.length === 2) {
      const [lng, lat] = obj.location.coordinates;
      focusCoordinates = { lat, lng };
      setTimeout(() => {
        focusCoordinates = null;
      }, 100);
    }
  }

  function handleMapClick(coordinates: {lat: number, lng: number}): void {
    selectedCoordinates = coordinates;
    showAdditionPanel = true;
    // Close detail panel when opening addition panel
    selectedObject = null;
  }

  function clearSelectedCoordinates(): void {
    selectedCoordinates = null;
  }

  function closeAdditionPanel(): void {
    showAdditionPanel = false;
    selectedCoordinates = null;
    editingObject = null; // Clear editing object when closing panel
    originalEditLocation = null; // Clear original location
  }

  function togglePinSection(): void {
    isPinSectionCollapsed = !isPinSectionCollapsed;
  }

  let editingObject = $state<SavedObject | null>(null); // Object being edited
  let originalEditLocation = $state<{lat: number, lng: number} | null>(null); // Original location before editing

  function handleEditPin(obj: SavedObject): void {
    // Set the object to be edited
    editingObject = obj;

    // Set coordinates from the object's location and store original location
    if (obj.location && obj.location.coordinates && obj.location.coordinates.length === 2) {
      const [lng, lat] = obj.location.coordinates;
      selectedCoordinates = { lat, lng };
      originalEditLocation = { lat, lng }; // Store original location
    }

    // Open the addition panel for editing
    showAdditionPanel = true;

    // Close detail panel when opening edit mode
    selectedObject = null;
  }

  function handleFocusPin(coordinates: {lat: number, lng: number}): void {
    focusCoordinates = coordinates;
    setTimeout(() => {
      focusCoordinates = null;
    }, 100);
  }

  function handlePinClick(obj: MapObject): void {
    selectedObject = obj;
    // Update connection line after a short delay to allow DOM to update
    setTimeout(updateConnectionLine, 50);
  }

  function handlePinClickWithPan(obj: MapObject): void {
    const wasAlreadySelected = selectedObject?.id === obj.id;

    // First, open the detail panel
    selectedObject = obj;

    // Wait minimal time for detail panel to render, then request the pan
    setTimeout(() => {
      if (panToPinCallback) {
        panToPinCallback();
      }
      // Update connection line after pan starts
      setTimeout(updateConnectionLine, 100);
    }, 10);
  }

  let panToPinCallback: (() => void) | null = null;

  function closeDetailPanel(): void {
    selectedObject = null;
    // Clear the pan callback to prevent any panning when closing
    panToPinCallback = null;
  }

  function openImageLightbox(imageUrl: string): void {
    lightboxImageUrl = imageUrl;
  }

  function closeLightbox(): void {
    lightboxImageUrl = null;
  }

  function handlePinPositionUpdate(x: number, y: number): void {
    if (!detailPanelEl || !mapViewEl) return;

    // Get detail panel position (bottom-right corner)
    const panelRect = detailPanelEl.getBoundingClientRect();
    const mapViewRect = mapViewEl.getBoundingClientRect();

    // Panel bottom-right corner (relative to map view)
    const x1 = panelRect.right - mapViewRect.left;
    const y1 = panelRect.bottom - mapViewRect.top;

    // Pin position (already in map view coordinates)
    const x2 = x;
    const y2 = y;

    connectionLine = { x1, y1, x2, y2 };
  }

  function updateConnectionLine(): void {
    // This will be triggered by the MapComponent's onPinPositionUpdate callback
    // We just need to update the detail panel position here
    if (!selectedObject || !detailPanelEl || !mapViewEl) return;

    const panelRect = detailPanelEl.getBoundingClientRect();
    const mapViewRect = mapViewEl.getBoundingClientRect();

    const x1 = panelRect.right - mapViewRect.left;
    const y1 = panelRect.bottom - mapViewRect.top;

    // Keep x2, y2 from current state (will be updated by pin position callback)
    connectionLine = { x1, y1, x2: connectionLine.x2, y2: connectionLine.y2 };
  }

  // Pin management functions
  async function handleSavePin(data: ProjectData, hasIncompleteData?: boolean): Promise<void> {
    try {
      // Create GeoJSON location from selectedCoordinates
      if (!selectedCoordinates) {
        alert('Brak wybranych współrzędnych. Kliknij mapę, aby wybrać lokalizację.');
        return;
      }

      const location: GeoJSON.Point = {
        type: 'Point',
        coordinates: [selectedCoordinates.lng, selectedCoordinates.lat] // GeoJSON uses [lng, lat]
      };

      const response = await fetch('/api/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location, data, hasIncompleteData })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Add the new object to our local state
          objects = [...objects, result.object];
          // Clear selected coordinates and close addition panel after successful save
          selectedCoordinates = null;
          showAdditionPanel = false;
          editingObject = null;
        } else {
          alert('Błąd podczas zapisywania pinezki');
        }
      } else {
        alert('Błąd podczas zapisywania pinezki');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Błąd podczas zapisywania pinezki');
    }
  }

  async function handleUpdatePin(id: string, data: ProjectData): Promise<void> {
    try {
      // Create location from selectedCoordinates if available
      let location: GeoJSON.Point | undefined;
      if (selectedCoordinates) {
        location = {
          type: 'Point',
          coordinates: [selectedCoordinates.lng, selectedCoordinates.lat]
        };
      }

      const response = await fetch(`/api/objects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, location })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the object in our local state
          objects = objects.map(obj => obj.id === id ? result.object : obj);
          // Clear editing state and close addition panel after successful update
          selectedCoordinates = null;
          showAdditionPanel = false;
          editingObject = null;
        } else {
          alert('Błąd podczas aktualizacji pinezki');
        }
      } else {
        alert('Błąd podczas aktualizacji pinezki');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Błąd podczas aktualizacji pinezki');
    }
  }

  async function handleDeletePin(id: string): Promise<void> {
    if (!confirm('Czy na pewno chcesz usunąć tę pinezkę?')) {
      return;
    }

    try {
      const response = await fetch(`/api/objects/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove the object from our local state
          objects = objects.filter(obj => obj.id !== id);
        } else {
          alert('Błąd podczas usuwania pinezki');
        }
      } else {
        alert('Błąd podczas usuwania pinezki');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Błąd podczas usuwania pinezki');
    }
  }

  function formatFieldValue(field: any, value: any): string {
    if (!value && value !== 0) return '';

    const fieldType = field.fieldType || field.type;

    // Handle complex field types
    switch (fieldType) {
      case 'price':
        if (typeof value === 'object' && 'funding' in value) {
          const priceData = value as PriceData;
          if (priceData.total) {
            return `${Number(priceData.total).toLocaleString('pl-PL')} ${priceData.currency || 'PLN'}`;
          }
          if (priceData.funding && priceData.funding.length > 0) {
            const total = priceData.funding.reduce((sum, f) => sum + (f.amount || 0), 0);
            return `${total.toLocaleString('pl-PL')} ${priceData.currency || 'PLN'}`;
          }
        }
        return '';

      case 'category':
        if (typeof value === 'object' && 'majorTag' in value) {
          const categoryData = value as CategoryFieldData;
          if (categoryData.majorTag) {
            const tag = template.tags.find(t => t.id === categoryData.majorTag || t.name === categoryData.majorTag);
            return tag ? (tag.displayName || tag.name) : categoryData.majorTag;
          }
        }
        return '';

      case 'tags':
        if (typeof value === 'object' && 'selectedTags' in value) {
          const tagsData = value as TagsFieldData;
          if (tagsData.selectedTags && tagsData.selectedTags.length > 0) {
            return tagsData.selectedTags.map(tagId => {
              const tag = template.tags.find(t => t.id === tagId || t.name === tagId);
              return tag ? (tag.displayName || tag.name) : tagId;
            }).join(', ');
          }
        }
        return '';

      case 'address':
        if (typeof value === 'object') {
          const addressData = value as AddressData;
          const parts = [];
          if (addressData.street) parts.push(addressData.street);
          if (addressData.number) parts.push(addressData.number);
          if (addressData.postalCode || addressData.city) {
            const cityPart = [];
            if (addressData.postalCode) cityPart.push(addressData.postalCode);
            if (addressData.city) cityPart.push(addressData.city);
            parts.push(cityPart.join(' '));
          }
          if (addressData.gmina) parts.push(`gm. ${addressData.gmina}`);
          return parts.join(', ');
        }
        return '';

      case 'links':
        if (Array.isArray(value)) {
          const links = value as LinkData[];
          return links.map(link => link.text || link.url).join(', ');
        }
        return '';

      case 'files':
        if (Array.isArray(value)) {
          const files = value as FileData[];
          return files.map(file => file.originalName || file.filename).join(', ');
        }
        return '';

      case 'gallery':
        if (typeof value === 'object' && 'items' in value) {
          const galleryData = value as GalleryData;
          if (galleryData.items && galleryData.items.length > 0) {
            return `${galleryData.items.length} ${galleryData.items.length === 1 ? 'element' : 'elementy'}`;
          }
        }
        return '';

      case 'multidate':
        if (typeof value === 'object') {
          const multiDateData = value as MultiDateData;
          const dates = Object.entries(multiDateData)
            .filter(([_, date]) => date !== null)
            .map(([key, date]) => {
              try {
                return new Date(date!).toLocaleDateString('pl-PL');
              } catch {
                return String(date);
              }
            });
          return dates.join(', ');
        }
        return '';

      case 'richtext':
        if (typeof value === 'string') {
          // Strip HTML tags for display
          const stripped = value.replace(/<[^>]*>/g, '');
          return stripped.length > 200 ? stripped.substring(0, 200) + '...' : stripped;
        }
        return String(value);

      case 'currency':
        return `${Number(value).toLocaleString('pl-PL')} zł`;

      case 'date':
        try {
          return new Date(value).toLocaleDateString('pl-PL');
        } catch {
          return String(value);
        }

      default:
        return String(value);
    }
  }

  // Filter objects that have valid GeoJSON location
  const validMapObjects = $derived(() => {
    if (!template?.fields) return [];

    const result: MapObject[] = [];
    for (const obj of filteredObjects) {
      // Check if object has valid GeoJSON Point location
      if (obj.location && obj.location.type === 'Point' &&
          obj.location.coordinates && obj.location.coordinates.length === 2) {
        result.push(obj as MapObject);
      }
    }
    return result;
  });

  // Update filters when inputs change
  $effect(() => {
    handleFilter();
  });

  $effect(() => {
    handleSort();
  });

  // Resize functionality
  function startResize(e: MouseEvent): void {
    isDragging = true;
    e.preventDefault();

    function handleMouseMove(e: MouseEvent): void {
      if (!isDragging) return;

      const newWidth = Math.max(250, Math.min(800, e.clientX));
      sidebarWidth = newWidth;
    }

    function handleMouseUp(): void {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
</script>

<svelte:head>
  <title>Mapa</title>
</svelte:head>

<div class="map-container">
  <div class="sidebar" style="width: {sidebarWidth}px;">
    <!-- Filters Section (Always Visible) -->
    <div class="filters">
      {#if showFilterInput}
        <input
          type="text"
          bind:value={filterText}
          placeholder="Wyszukaj..."
          class="filter-input"
          autofocus
        >
      {/if}
      {#if showSortSelect}
        <select bind:value={sortField} class="sort-select-full">
          <option value="">Sortuj według...</option>
          {#each template.fields.filter(f => f.visible) as field}
            <option value={field.key}>{field.displayLabel || field.label}</option>
          {/each}
        </select>
      {/if}
      <div class="filter-controls">
        <button
          class="filter-icon-btn"
          class:active={showFilterInput}
          title="Filtruj"
          onclick={() => showFilterInput = !showFilterInput}
        >
          <Icon name="Magnigier Glass" size={18} />
        </button>
        <button
          class="filter-icon-btn"
          class:active={showSortSelect}
          title="Sortuj"
          onclick={() => showSortSelect = !showSortSelect}
        >
          <Icon name="List/Arrow Up-down" size={18} />
        </button>
      </div>
    </div>

    <!-- List Section (Scrollable) -->
    <div class="list-container">
      <PinList
        objects={filteredObjects}
        {template}
        onEdit={handleEditPin}
        onDelete={handleDeletePin}
        onFocus={handleFocusPin}
        showActions={true}
      />
    </div>
  </div>

  <div class="resize-handle" onmousedown={startResize} class:dragging={isDragging}></div>

  <div class="map-view" bind:this={mapViewEl}>
    <MapComponent
      objects={validMapObjects()}
      onMapClick={handleMapClick}
      {selectedCoordinates}
      focusCoordinates={focusCoordinates}
      {mapConfig}
      onPinClick={handlePinClickWithPan}
      selectedObjectId={selectedObject?.id || null}
      editingObjectId={editingObject?.id || null}
      {originalEditLocation}
      onPinPositionUpdate={handlePinPositionUpdate}
      bind:panToPinCallback
      tags={template.tags || []}
    />

    <!-- Detail Panel Container -->
    {#if selectedObject}
      {@const categoryField = template.fields.find(f => f.fieldType === 'category' || f.type === 'category')}
      {@const categoryData = categoryField ? selectedObject.data[categoryField.key || categoryField.fieldName] : null}
      {@const categoryTag = categoryData && typeof categoryData === 'object' && 'majorTag' in categoryData ? template.tags.find(t => t.id === categoryData.majorTag || t.name === categoryData.majorTag) : null}
      {@const categoryColor = categoryTag?.color || '#666666'}
      {@const titleField = template.fields.find(f => f.fieldType === 'title' || f.key === 'title')}
      {@const titleValue = titleField ? selectedObject.data[titleField.key || titleField.fieldName] : ''}

      <div class="detail-container">
        <div class="detail-panel" bind:this={detailPanelEl} style="--category-color: {categoryColor}">
          <div class="detail-header-new">
            <h3 class="detail-title">{titleValue || 'Bez tytułu'}</h3>
            {#if categoryTag}
              <div class="category-badge" style="background-color: {categoryColor}">
                {categoryTag.displayName || categoryTag.name}
              </div>
            {/if}
            <button class="close-btn-new" onclick={closeDetailPanel}>
              <Icon name="Close" size={16} />
            </button>
          </div>
          <div class="detail-content-new">
            <!-- Show fields excluding title and category (already in header) -->
            {#each template.fields.filter(f => f.visible && f.fieldType !== 'title' && f.key !== 'title' && f.fieldType !== 'category' && f.type !== 'category') as field}
              <div class="detail-field">
                <label>{field.displayLabel || field.label}:</label>
                <div class="detail-value" class:location-value={field.key === 'location'}>
                  {#if field.key === 'location'}
                    <!-- Special display for location field -->
                    {#if selectedObject.location && selectedObject.location.coordinates}
                      {selectedObject.location.coordinates[1].toFixed(6)}, {selectedObject.location.coordinates[0].toFixed(6)}
                    {:else}
                      <span class="no-location">Brak lokalizacji</span>
                    {/if}
                  {:else if (field.fieldType || field.type) === 'gallery'}
                    <!-- Special display for gallery field -->
                    {@const galleryData = selectedObject.data[field.key || field.fieldName] as GalleryData}
                    {#if galleryData && galleryData.items && galleryData.items.length > 0}
                      <div class="gallery-preview-detail">
                        {#each galleryData.items as item}
                          {#if item.type === 'image'}
                            <button
                              class="gallery-thumbnail"
                              onclick={() => openImageLightbox(item.url)}
                              type="button"
                            >
                              <img src={item.url} alt={item.caption || ''} />
                            </button>
                          {/if}
                        {/each}
                      </div>
                    {:else}
                      <span class="no-data">Brak zdjęć</span>
                    {/if}
                  {:else}
                    {formatFieldValue(field, field.key ? selectedObject.data[field.key] : undefined)}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          <div class="gradient-overlay"></div>
        </div>

        <!-- Edit Button -->
        <button
          class="floating-edit-btn"
          onclick={() => selectedObject && handleEditPin(selectedObject)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M4 5C4 3.34315 5.34315 2 7 2H12.7574C13.553 2 14.3161 2.31607 14.8787 2.87868L19.1213 7.12132C19.6839 7.68393 20 8.44699 20 9.24264V19C20 20.6569 18.6569 22 17 22H7C5.34315 22 4 20.6569 4 19V5ZM14 9C13.4477 9 13 8.55228 13 8V5.20711C13 4.76165 13.5386 4.53857 13.8536 4.85355L17.1464 8.14645C17.4614 8.46143 17.2383 9 16.7929 9H14ZM8.29289 15.7071C8.10536 15.8946 8 16.149 8 16.4142V18.5C8 18.7761 8.22386 19 8.5 19H10.5858C10.851 19 11.1054 18.8946 11.2929 18.7071L15.2929 14.7071C15.6834 14.3166 15.6834 13.6834 15.2929 13.2929L13.7071 11.7071C13.3166 11.3166 12.6834 11.3166 12.2929 11.7071L8.29289 15.7071Z" fill="white"/>
          </svg>
          <span>Edytuj</span>
        </button>
      </div>

      <!-- Connection Line SVG -->
      <svg class="connection-line">
        <line
          x1={connectionLine.x1}
          y1={connectionLine.y1}
          x2={connectionLine.x2}
          y2={connectionLine.y2}
          stroke="var(--color-accent)"
          stroke-width="2"
          opacity="0.6"
        />
      </svg>
    {/if}

    <!-- Addition Panel -->
    {#if showAdditionPanel && selectedCoordinates}
      <div class="addition-panel">
        <div class="addition-panel-header">
          <h3>
            {editingObject ? "Edytuj pinezkę" : "Dodaj nową pinezkę"}
          </h3>
          <button class="close-btn-addition" onclick={closeAdditionPanel}>
            <Icon name="Close" size={16} />
          </button>
        </div>
        <div class="addition-panel-content">
          <PinManager
            {template}
            objects={filteredObjects}
            {selectedCoordinates}
            {editingObject}
            onSave={handleSavePin}
            onUpdate={handleUpdatePin}
            onDelete={handleDeletePin}
            onClearCoordinates={clearSelectedCoordinates}
            onFocusPin={handleFocusPin}
            showForm={true}
            showExcelFeatures={false}
            showPinList={false}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Image Lightbox -->
{#if lightboxImageUrl}
  <div class="lightbox-overlay" onclick={closeLightbox}>
    <button class="lightbox-close" onclick={closeLightbox} type="button">
      <Icon name="Close" size={32} />
    </button>
    <div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
      <img src={lightboxImageUrl} alt="Powiększone zdjęcie" />
    </div>
  </div>
{/if}

<style>
  .map-container {
    display: flex;
    height: calc(100vh - var(--nav-height));
    background: var(--color-background);
  }

  .sidebar {
    background: var(--color-background);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: calc(100vh - var(--nav-height));
    overflow: hidden; /* Prevent sidebar itself from scrolling */
  }

  /* Filters Section - Always visible */
  .filters {
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0; /* Don't shrink */
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .filter-controls {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-2);
  }

  .filter-icon-btn {
    background: transparent;
    border: none;
    padding: var(--space-2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .filter-icon-btn:hover {
    color: var(--color-text-primary);
  }

  .filter-icon-btn.active {
    color: var(--color-accent);
  }

  .filter-input,
  .sort-select-full {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: var(--color-background);
    transition: border-color var(--transition-fast);
  }

  .filter-input:focus,
  .sort-select-full:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  /* Pin Section Header - Always visible */
  .pin-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0; /* Don't shrink */
  }

  .pin-section-header h3 {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toggle-btn {
    background: none;
    border: none;
    padding: var(--space-1);
    border-radius: var(--radius-base);
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-btn:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }

  /* Pin Manager Container - Collapsible */
  .pin-manager-container {
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0; /* Don't shrink */
  }

  /* List Container - Scrollable */
  .list-container {
    flex: 1; /* Take up remaining space */
    overflow-y: auto; /* Only this section scrolls */
    min-height: 0; /* Allow flex shrinking */
  }

  .resize-handle {
    width: 4px;
    background: var(--color-border);
    cursor: col-resize;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
  }

  .resize-handle:hover,
  .resize-handle.dragging {
    background: var(--color-accent);
  }


  .map-view {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  /* Detail Panel Container */
  .detail-container {
    position: absolute;
    left: 20px;
    top: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Detail Panel */
  .detail-panel {
    position: relative;
    width: 420px;
    max-height: calc(100vh - 120px);
    background: var(--color-surface);
    border: 1px solid #000000;
    border-radius: 5px 5px 0px 5px;
    overflow: hidden;
  }

  .detail-header-new {
    position: relative;
    padding: var(--space-4);
    padding-right: 40px;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: var(--space-3);
    align-items: start;
  }

  .detail-title {
    grid-column: 1;
    grid-row: 1;
    margin: 0;
    font-family: var(--font-ui);
    font-size: 20px;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: 1.3;
    word-break: break-word;
  }

  .category-badge {
    grid-column: 2;
    grid-row: 1;
    padding: 6px 12px;
    border-radius: 8px;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: var(--font-weight-medium);
    color: white;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn-new {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .close-btn-new:hover {
    background: rgba(255, 255, 255, 1);
    color: var(--color-text-primary);
    border-color: rgba(0, 0, 0, 0.2);
  }

  .detail-content-new {
    padding: 0 var(--space-4) var(--space-4) var(--space-4);
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }

  .gradient-overlay {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 180px;
    height: 180px;
    background: radial-gradient(
      circle at bottom right,
      var(--category-color) 0%,
      rgba(255, 255, 255, 0) 70%
    );
    opacity: 0.25;
    pointer-events: none;
    border-radius: 0 0 0 0;
  }

  .detail-field {
    margin-bottom: var(--space-3);
  }

  .detail-field:last-child {
    margin-bottom: 0;
  }

  .detail-field label {
    display: block;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-1);
  }

  .detail-value {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    word-break: break-word;
  }

  .detail-value.location-value {
    font-family: monospace;
    background: #ecfdf5;
    padding: 4px 8px;
    border-radius: 4px;
    color: #065f46;
  }

  .no-location {
    color: #9ca3af;
    font-style: italic;
  }

  /* Floating Edit Button */
  .floating-edit-btn {
    background: var(--color-accent);
    color: white;
    border: 1px solid #000000;
    padding: var(--space-2) var(--space-3);
    border-radius: 5px;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    align-self: flex-start;
  }

  .floating-edit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .floating-edit-btn:active {
    transform: translateY(0px);
  }

  .floating-edit-btn svg {
    flex-shrink: 0;
  }

  /* Connection Line */
  .connection-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999;
  }

  /* Addition Panel */
  .addition-panel {
    position: absolute;
    right: 20px;
    top: 20px;
    min-width: 420px;
    max-width: calc(100vw - 40px);
    width: max-content;
    max-height: calc(100% - 40px);
    background: #ffffff;
    border: 1px solid #000000;
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  .addition-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    border-bottom: 1px solid #000000;
    background: #ffffff;
    flex-shrink: 0;
  }

  .addition-panel-header h3 {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-primary);
  }

  .close-btn-addition {
    background: none;
    border: none;
    padding: var(--space-1);
    border-radius: var(--radius-base);
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn-addition:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }

  .addition-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
    box-sizing: border-box;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .map-container {
      flex-direction: column;
    }

    .sidebar {
      width: 100% !important;
      height: 40vh;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
    }

    .resize-handle {
      display: none;
    }

    .map-view {
      height: 60vh;
    }

    .pin-manager-container {
      padding: var(--space-2);
    }
  }

  /* Gallery Preview in Detail Panel */
  .gallery-preview-detail {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .gallery-thumbnail {
    width: auto;
    height: 100px;
    border: 2px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    background: none;
    padding: 0;
  }

  .gallery-thumbnail:hover {
    border-color: var(--color-accent);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .gallery-thumbnail img {
    height: 100%;
    width: auto;
    display: block;
    object-fit: cover;
  }

  .no-data {
    color: #9ca3af;
    font-style: italic;
    font-size: var(--text-sm);
  }

  /* Image Lightbox */
  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20000;
    padding: 40px;
    backdrop-filter: blur(4px);
  }

  .lightbox-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .lightbox-content img {
    max-width: 100%;
    max-height: calc(90vh - 40px);
    width: auto;
    height: auto;
    display: block;
    border-radius: 8px;
  }

  .lightbox-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 20001;
  }

  .lightbox-close:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }
</style>