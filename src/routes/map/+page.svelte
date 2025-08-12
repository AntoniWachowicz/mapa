<script lang="ts">
  import MapComponent from '$lib/MapComponent.svelte';
  import PinManager from '$lib/PinManager.svelte';
  import type { Template, ProjectData, SavedObject, MapObject, MapConfig } from '$lib/types.js';
  
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
  
  async function saveObject(objectData: ProjectData): Promise<void> {
    if (selectedCoordinates) {
      const coordField = template.fields.find(f => f.key === 'coordinates');
      if (coordField) {
        objectData[coordField.key] = `${selectedCoordinates.lat.toFixed(6)}, ${selectedCoordinates.lng.toFixed(6)}`;
      }
    }
    
    const formData = new FormData();
    formData.set('data', JSON.stringify(objectData));
    
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
  function parseCoordinates(coordString: string | number | boolean): {lat: number, lng: number} | null {
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
  <title>Map View</title>
</svelte:head>

<svelte:window 
  onmousemove={handleMouseMove} 
  onmouseup={handleMouseUp}
/>

<div class="page-container">
  <h1>Map View</h1>
  
  <div class="split-container" bind:this={splitContainer}>
    <!-- Map Panel -->
    <div class="map-panel" style="width: {splitPosition}%">
      <MapComponent 
        objects={validMapObjects()}
        onMapClick={handleMapClick}
        selectedCoordinates={selectedCoordinates}
        focusCoordinates={focusCoordinates}
        mapConfig={mapConfig}
      />
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
    
    <!-- Form Panel -->
    <div class="form-panel" style="width: {100 - splitPosition}%">
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
  </div>
</div>

<style>
  .page-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .split-container {
    flex: 1;
    display: flex;
    height: calc(100vh - 80px);
    position: relative;
  }
  
  .map-panel {
    height: 100%;
    overflow: hidden;
  }
  
  .divider {
    width: 8px;
    background-color: #ccc;
    border: none;
    cursor: col-resize;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  
  .divider:hover,
  .divider:focus {
    background-color: #999;
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
  
  .divider-handle {
    color: #666;
    font-size: 12px;
    line-height: 1;
    user-select: none;
    pointer-events: none;
  }
  
  .form-panel {
    height: 100%;
    overflow-y: auto;
  }
  
  .form-container {
    padding: 20px;
  }
  
  h1 {
    margin: 0;
    padding: 20px;
    background: white;
    border-bottom: 1px solid #eee;
  }
</style>