<script lang="ts">
  import MapComponent from '$lib/MapComponent.svelte';
  import PinManager from '$lib/PinManager.svelte';
  import PinList from '$lib/PinList.svelte';
  import Icon from '$lib/Icon.svelte';
  import type { Template, SavedObject, MapObject, MapConfig, CategoryFieldData, ProjectData } from '$lib/types.js';

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

  console.log('[MAP PAGE CLIENT] Received objects:', objects.length);
  console.log('[MAP PAGE CLIENT] Objects data:', objects);
  let focusCoordinates = $state<{lat: number, lng: number} | null>(null);
  let selectedCoordinates = $state<{lat: number, lng: number} | null>(null);
  let selectedObject = $state<SavedObject | null>(null); // Currently selected pin for detail view
  let sidebarWidth = $state(400); // Default sidebar width in pixels
  let isDragging = $state(false);
  let isPinSectionCollapsed = $state(false); // New state for pin section collapse
  let detailPanelEl: HTMLDivElement | null = null; // Reference to detail panel
  let mapViewEl: HTMLDivElement | null = null; // Reference to map view
  let connectionLine = $state({ x1: 0, y1: 0, x2: 0, y2: 0 }); // Connection line coordinates

  // Filter and sort state
  let filterText = $state('');
  let sortField = $state('');
  let filteredObjects = $state<SavedObject[]>([]);

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
  }

  function clearSelectedCoordinates(): void {
    selectedCoordinates = null;
  }

  function togglePinSection(): void {
    isPinSectionCollapsed = !isPinSectionCollapsed;
  }

  function handleEditPin(obj: SavedObject): void {
    // Expand the pin section when editing
    if (isPinSectionCollapsed) {
      isPinSectionCollapsed = false;
    }
    // TODO: Pass the editing object to PinManager
    // This would require adding state management for edited object
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
          // Clear selected coordinates after successful save
          selectedCoordinates = null;
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
      const response = await fetch(`/api/objects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the object in our local state
          objects = objects.map(obj => obj.id === id ? result.object : obj);
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

    if (field.type === 'currency') {
      return `${Number(value).toLocaleString('pl-PL')} zł`;
    } else if (field.type === 'date') {
      try {
        return new Date(value).toLocaleDateString('pl-PL');
      } catch {
        return String(value);
      }
    } else {
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
    <!-- Pin Addition Section Header (Always Visible) -->
    <div class="pin-section-header">
      <h3>
        <Icon name="Pin" size={16} />
        Dodaj nową pinezkę
      </h3>
      <button class="toggle-btn" onclick={togglePinSection} title={isPinSectionCollapsed ? 'Rozwiń sekcję dodawania' : 'Zwiń sekcję dodawania'}>
        <Icon name={isPinSectionCollapsed ? 'Chevron/Down' : 'Chevron/Up'} size={16} />
      </button>
    </div>

    <!-- Pin Addition Section Content (Collapsible) -->
    {#if !isPinSectionCollapsed}
      <div class="pin-manager-container">
        <PinManager
          {template}
          objects={filteredObjects}
          {selectedCoordinates}
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
    {/if}

    <!-- Filters Section (Always Visible) -->
    <div class="filters">
      <div class="filter-group">
        <label>Filtruj <Icon name="Divider-1" size={12} /></label>
        <input
          type="text"
          bind:value={filterText}
          placeholder="Wyszukaj..."
          class="filter-input"
        >
      </div>

      <div class="filter-group">
        <label>Sortuj <Icon name="Divider-1" size={12} /></label>
        <select bind:value={sortField} class="sort-select">
          <option value="">Wybierz pole...</option>
          {#each template.fields.filter(f => f.visible) as field}
            <option value={field.key}>{field.displayLabel || field.label}</option>
          {/each}
        </select>
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
      onPinPositionUpdate={handlePinPositionUpdate}
      bind:panToPinCallback
    />

    <!-- Detail Panel -->
    {#if selectedObject}
      <div class="detail-panel" bind:this={detailPanelEl}>
        <div class="detail-header">
          <h3>Szczegóły pinezki</h3>
          <button class="close-btn" onclick={closeDetailPanel}>
            <Icon name="Close" size={16} />
          </button>
        </div>
        <div class="detail-content">
          <!-- Show fields including location -->
          {#each template.fields.filter(f => f.visible) as field}
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
                {:else}
                  {formatFieldValue(field, selectedObject.data[field.key])}
                {/if}
              </div>
            </div>
          {/each}
        </div>
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
  </div>
</div>

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
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0; /* Don't shrink */
  }

  .filter-group {
    margin-bottom: var(--space-4);
  }

  .filter-group:last-child {
    margin-bottom: 0;
  }

  .filter-group label {
    display: block;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
  }

  .filter-input,
  .sort-select {
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
  .sort-select:focus {
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

  /* Detail Panel */
  .detail-panel {
    position: absolute;
    left: 20px;
    top: 20px;
    width: 320px;
    max-height: calc(100% - 40px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
    z-index: 1000;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    background: var(--color-surface);
  }

  .detail-header h3 {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
  }

  .close-btn {
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

  .close-btn:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }

  .detail-content {
    padding: var(--space-3);
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
</style>