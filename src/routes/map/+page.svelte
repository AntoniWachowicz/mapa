<script lang="ts">
  import MapComponent from '$lib/MapComponent.svelte';
  import PinManager from '$lib/PinManager.svelte';
  import type { Template, ProjectData, SavedObject, MapObject, MapConfig, TagFieldData } from '$lib/types.js';
  
  interface PageData {
    template: Template;
    objects: SavedObject[];
    mapConfig: MapConfig;  // NEW: Add map config to page data
  }
  
  interface Props {
    data: PageData;
  }
  
  const { data }: Props = $props();
  
  let template = $state<Template>(data.template || { fields: [] });
  let objects = $state<SavedObject[]>(data.objects || []);
  let mapConfig = $state<MapConfig>(data.mapConfig);  // NEW: Map config state
  let selectedCoordinates = $state<{lat: number, lng: number} | null>(null);
  let focusCoordinates = $state<{lat: number, lng: number} | null>(null);
  
  // Split pane state
  let splitContainer: HTMLDivElement;
  let isDragging = $state(false);
  let splitPosition = $state(50);
  
  function handleMapClick(coordinates: {lat: number, lng: number}): void {
    selectedCoordinates = coordinates;
  }
  
  async function saveObject(objectData: ProjectData, hasIncompleteData?: boolean): Promise<void> {
    if (selectedCoordinates) {
      const coordField = template.fields.find(f => f.key === 'coordinates');
      if (coordField) {
        objectData[coordField.key] = `${selectedCoordinates.lat.toFixed(6)}, ${selectedCoordinates.lng.toFixed(6)}`;
      }
    }
    
    const formData = new FormData();
    formData.set('data', JSON.stringify(objectData));
    if (hasIncompleteData) {
      formData.set('hasIncompleteData', 'true');
    }
    
    await fetch('/schema-builder?/createObject', {
      method: 'POST',
      body: formData
    });
    
    location.reload();
  }
  
  async function updateObject(id: string, objectData: ProjectData): Promise<void> {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('data', JSON.stringify(objectData));
    
    await fetch('/schema-builder?/updateObject', {
      method: 'POST',
      body: formData
    });
    
    location.reload();
  }
  
  async function deleteObject(id: string): Promise<void> {
    const formData = new FormData();
    formData.set('id', id);
    
    await fetch('/schema-builder?/deleteObject', {
      method: 'POST',
      body: formData
    });
    
    location.reload();
  }
  
  function clearCoordinates(): void {
    selectedCoordinates = null;
  }
  
  function focusOnPin(coordinates: {lat: number, lng: number}): void {
    focusCoordinates = coordinates;
    setTimeout(() => {
      focusCoordinates = null;
    }, 100);
  }
  
  // Split pane handlers
  function handleMouseDown(event: MouseEvent): void {
    isDragging = true;
    event.preventDefault();
  }
  
  function handleMouseMove(event: MouseEvent): void {
    if (isDragging && splitContainer) {
      const rect = splitContainer.getBoundingClientRect();
      const newPosition = ((event.clientX - rect.left) / rect.width) * 100;
      splitPosition = Math.max(20, Math.min(80, newPosition));
    }
  }
  
  function handleMouseUp(): void {
    isDragging = false;
  }
  
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      splitPosition = Math.max(20, splitPosition - 5);
    } else if (event.key === 'ArrowRight') {
      splitPosition = Math.min(80, splitPosition + 5);
    }
  }
  
  // Parse coordinates for map
  function parseCoordinates(coordString: string | number | boolean | TagFieldData): {lat: number, lng: number} | null {
    if (typeof coordString !== 'string') return null;
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  }
  
  const validMapObjects = $derived(() => {
    const coordField = template?.fields?.find(f => f.key === 'coordinates');
    if (!coordField || !template?.fields) return [];
    
    const result: MapObject[] = [];
    for (const obj of objects) {
      const coordinates = parseCoordinates(obj.data[coordField.key]);
      if (coordinates !== null) {
        result.push({ ...obj, coordinates });
      }
    }
    return result;
  });
</script>

<svelte:head>
  <title>Widok Mapy - Mapa Builder</title>
</svelte:head>

<svelte:window 
  onmousemove={handleMouseMove} 
  onmouseup={handleMouseUp}
/>

<div class="page-container">
  <h1>Widok Mapy</h1>
  
  <div class="split-container" bind:this={splitContainer}>
    <!-- Form Panel (now on left) -->
    <div class="form-panel" style="width: {splitPosition}%">
      <div class="form-container">
        <PinManager 
          template={template} 
          objects={objects}
          selectedCoordinates={selectedCoordinates}
          onSave={saveObject}
          onUpdate={updateObject}
          onDelete={deleteObject}
          onClearCoordinates={clearCoordinates}
          onFocusPin={focusOnPin}
          showForm={true}
        />
      </div>
    </div>
    
    <!-- Draggable Divider -->
    <button 
      class="divider"
      aria-label="Resize panels"
      onmousedown={handleMouseDown}
      onkeydown={handleKeyDown}
    >
      <span class="divider-handle">⋮⋮</span>
    </button>
    
    <!-- Map Panel (now on right) -->
    <div class="map-panel" style="width: {100 - splitPosition}%">
      <MapComponent 
        objects={validMapObjects()}
        onMapClick={handleMapClick}
        selectedCoordinates={selectedCoordinates}
        focusCoordinates={focusCoordinates}
        mapConfig={mapConfig}
      />
    </div>
  </div>
</div>

<style>
  .page-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
  }
  
  .split-container {
    flex: 1;
    display: flex;
    height: calc(100vh - 120px);
    position: relative;
    gap: 2px;
    background: #e5e7eb;
    border-radius: 12px;
    margin: 16px;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  .map-panel {
    height: 100%;
    overflow: hidden;
    background: #ffffff;
    border-radius: 0 10px 10px 0;
  }
  
  .divider {
    width: 4px;
    background: linear-gradient(to bottom, #e5e7eb, #d1d5db, #e5e7eb);
    border: none;
    cursor: col-resize;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    position: relative;
    flex-shrink: 0;
  }
  
  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
    background: #9ca3af;
    border-radius: 2px;
    opacity: 0;
    transition: all 0.2s ease;
  }
  
  .divider:hover,
  .divider:focus {
    background: linear-gradient(to bottom, #d1d5db, #9ca3af, #d1d5db);
    outline: none;
    width: 6px;
  }
  
  .divider:hover::before {
    opacity: 1;
    background: #6b7280;
  }
  
  .divider-handle {
    display: none;
  }
  
  .form-panel {
    height: 100%;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 10px 0 0 10px;
    border-right: 1px solid #f1f5f9;
  }
  
  .form-container {
    padding: 24px 32px 32px 32px;
    height: calc(100% - 80px);
    display: flex;
    flex-direction: column;
  }
  
  h1 {
    margin: 0;
    padding: 24px 32px 20px 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.025em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-bottom: none;
  }
</style>