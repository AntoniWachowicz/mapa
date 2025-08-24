<script lang="ts">
  import { onMount } from 'svelte';
  import type { MapConfig } from '$lib/types.js';
  
  interface PageData {
    mapConfig: MapConfig;
  }
  
  interface Props {
    data: PageData;
  }
  
  const { data }: Props = $props();
  
  let config = $state<MapConfig>({...data.mapConfig});
  let saving = $state(false);
  let message = $state('');
  
  // Map setup
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  let boundsRectangle: any = null;
  let centerMarker: any = null;
  let swMarker: any = null;
  let neMarker: any = null;
  
  // Corner selection state
  let settingCorner = $state<'sw' | 'ne' | null>(null);
  
  // Real-time zoom tracking
  let currentZoom = $state(12); // Will be updated when map initializes
  let showingCustomImage = $state(true);
  
  // Calculated center for display
  const center = $derived(({
    lat: (config.swLat + config.neLat) / 2,
    lng: (config.swLng + config.neLng) / 2
  }));
  
  onMount(async () => {
    await loadLeaflet();
    initializeMap();
    updateMapVisualization();
  });
  
  async function loadLeaflet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        L = (window as any).L;
        resolve(L);
      };
      document.head.appendChild(script);
    });
  }
  
  function initializeMap() {
    // Initialize map centered on current bounds
    map = L.map(mapContainer).setView([center.lat, center.lng], config.defaultZoom);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Handle map clicks for setting corners
    map.on('click', handleMapClick);
    
    // Track zoom changes for real-time feedback
    map.on('zoom', () => {
      currentZoom = map.getZoom();
      showingCustomImage = currentZoom <= config.maxCustomZoom && !!config.customImageUrl;
    });
  }
  
  function handleMapClick(e: any) {
    const { lat, lng } = e.latlng;
    
    if (settingCorner === 'sw') {
      config.swLat = lat;
      config.swLng = lng;
      settingCorner = null;
      updateMapVisualization();
    } else if (settingCorner === 'ne') {
      config.neLat = lat;
      config.neLng = lng;
      settingCorner = null;
      updateMapVisualization();
    }
  }
  
  function startSettingCorner(corner: 'sw' | 'ne') {
    settingCorner = corner;
    message = corner === 'sw' ? 'Click on the map to set Southwest corner' : 'Click on the map to set Northeast corner';
  }
  
  function updateMapVisualization() {
    if (!map || !L) return;
    
    // Clear existing visualizations
    if (boundsRectangle) map.removeLayer(boundsRectangle);
    if (centerMarker) map.removeLayer(centerMarker);
    if (swMarker) map.removeLayer(swMarker);
    if (neMarker) map.removeLayer(neMarker);
    
    // Create bounds rectangle
    const bounds = [
      [config.swLat, config.swLng],
      [config.neLat, config.neLng]
    ];
    
    boundsRectangle = L.rectangle(bounds, {
      color: '#007bff',
      weight: 2,
      fillOpacity: 0.2
    }).addTo(map);
    
    // Add corner markers
    swMarker = L.marker([config.swLat, config.swLng], {
      icon: L.divIcon({
        className: 'corner-marker sw-marker',
        html: 'SW',
        iconSize: [30, 20],
        iconAnchor: [15, 10]
      })
    }).addTo(map);
    
    neMarker = L.marker([config.neLat, config.neLng], {
      icon: L.divIcon({
        className: 'corner-marker ne-marker',
        html: 'NE',
        iconSize: [30, 20],
        iconAnchor: [15, 10]
      })
    }).addTo(map);
    
    // Add center marker
    centerMarker = L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: 'center-marker',
        html: '🎯',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    
    // Auto-adjust zoom to fit bounds with some padding
    setTimeout(() => {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [20, 20] });
      
      // Update the zoom setting to match what looks good
      config.defaultZoom = map.getZoom();
    }, 100);
  }
  
  // Update visualization when config changes
  $effect(() => {
    if (map && L) {
      updateMapVisualization();
    }
  });
  
  async function saveConfig(): Promise<void> {
  saving = true;
  message = '';
  
  try {
    // Basic validation
    if (config.swLat >= config.neLat) {
      throw new Error('Szerokość geograficzna południowo-zachodnia musi być mniejsza niż północno-wschodnia');
    }
    if (config.swLng >= config.neLng) {
      throw new Error('Długość geograficzna południowo-zachodnia musi być mniejsza niż północno-wschodnia');
    }
    
    const formData = new FormData();
    formData.set('config', JSON.stringify(config));
    
    const response = await fetch('?/updateMapConfig', {
      method: 'POST',
      body: formData
    });
    
    // FIX: Don't try to parse JSON, SvelteKit actions return form responses
    if (response.ok) {
      message = 'Konfiguracja mapy została zapisana pomyślnie!';
    } else {
      throw new Error('Nie udało się zapisać konfiguracji');
    }
  } catch (error) {
    message = `Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
  } finally {
    saving = false;
  }
}
  
  function resetToDefaults(): void {
    config = {
      swLat: 40.700,
      swLng: -74.020,
      neLat: 40.720,
      neLng: -74.000,
      defaultZoom: 12,
      maxCustomZoom: 14,
      customImageUrl: undefined
    };
    updateMapVisualization();
  }
  
  function fitToCurrentBounds(): void {
    if (map && L) {
      const bounds = [
        [config.swLat, config.swLng],
        [config.neLat, config.neLng]
      ];
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [20, 20] });
    }
  }

  // Helper function to get zoom level description
  function getZoomDescription(zoom: number): string {
    if (zoom <= 3) return "Kontynent/Świat";
    if (zoom <= 6) return "Kraj";
    if (zoom <= 9) return "Region";
    if (zoom <= 12) return "Miasto";
    if (zoom <= 15) return "Dzielnica";
    if (zoom <= 18) return "Ulica/Budynek";
    return "Maksymalny szczegół";
  }

  // Update zoom tracking when config changes
  $effect(() => {
    if (map) {
      currentZoom = map.getZoom();
      showingCustomImage = currentZoom <= config.maxCustomZoom && !!config.customImageUrl;
    }
  });
</script>

<svelte:head>
  <title>Konfiguracja Mapy - Admin</title>
</svelte:head>

<div class="admin-container">
  <h1>🗺️ Konfiguracja Mapy</h1>
  
  <div class="admin-layout">
    <!-- Left Panel: Interactive Map -->
    <div class="map-panel">
      <h2>Interactive Map Setup</h2>
      <p>Click the buttons below, then click on the map to set corners:</p>
      
      <div class="map-controls">
        <button 
          onclick={() => startSettingCorner('sw')}
          class:active={settingCorner === 'sw'}
          disabled={saving}
        >
          <!-- 📍 Set Southwest Corner --> 📍 Ustaw Południowo-Zachodni Róg
        </button>
        
        <button 
          onclick={() => startSettingCorner('ne')}
          class:active={settingCorner === 'ne'}
          disabled={saving}
        >
          <!-- 📍 Set Northeast Corner --> 📍 Ustaw Północno-Wschodni Róg
        </button>
        
        <button onclick={fitToCurrentBounds} disabled={saving}>
          <!-- 🔍 Fit to Bounds --> 🔍 Dopasuj do Granic
        </button>
      </div>
      
      <div class="map-container" bind:this={mapContainer}></div>
      
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-color sw"></span> <!-- Southwest Corner --> Południowo-Zachodni Róg
        </div>
        <div class="legend-item">
          <span class="legend-color ne"></span> <!-- Northeast Corner --> Północno-Wschodni Róg
        </div>
        <div class="legend-item">
          <span class="legend-emoji">🎯</span> <!-- Auto-calculated Center --> Środek
        </div>
        <div class="legend-item">
          <span class="legend-color bounds"></span> <!-- User Bounds --> Granice
        </div>
      </div>
    </div>
    
    <!-- Right Panel: Configuration Form -->
    <div class="config-panel">
      <h2><!-- Current Settings --> Aktualne Ustawienia</h2>
      
      <div class="coordinate-display">
        <div class="coord-group">
          <h3><!-- Southwest Corner --> Południowo-Zachodni Róg</h3>
          <div class="coord-inputs">
            <label>
              <!-- Latitude: --> Szerokość:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.swLat}
                disabled={saving}
              >
            </label>
            <label>
              <!-- Longitude: --> Długość:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.swLng}
                disabled={saving}
              >
            </label>
          </div>
        </div>
        
        <div class="coord-group">
          <h3><!-- Northeast Corner --> Północno-Wschodni Róg</h3>
          <div class="coord-inputs">
            <label>
              <!-- Latitude: --> Szerokość:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.neLat}
                disabled={saving}
              >
            </label>
            <label>
              <!-- Longitude: --> Długość:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.neLng}
                disabled={saving}
              >
            </label>
          </div>
        </div>
      </div>
      
      <div class="info-display">
        <h3>Automatycznie Obliczony Środek</h3>
        <p>Lat: {center.lat.toFixed(6)}, Lng: {center.lng.toFixed(6)}</p>
      </div>
      
      <h3>Ustawienia Przybliżenia</h3>
      
      <!-- Current zoom display -->
      {#if map}
        <div class="current-zoom-display">
          <div class="zoom-indicator">
            <strong>Obecny zoom na mapie: {currentZoom}</strong>
            <span class="zoom-description">({getZoomDescription(currentZoom)})</span>
          </div>
          <div class="layer-indicator" class:custom={showingCustomImage} class:osm={!showingCustomImage}>
            {showingCustomImage ? '🖼️ Pokazuje niestandardowy obraz' : '🗺️ Pokazuje szczegółową mapę'}
          </div>
        </div>
      {/if}
      
      <div class="zoom-controls">
        <label class="zoom-control">
          <div class="control-header">
            <span class="control-title">Początkowy Poziom i Maksymalne Oddalenie</span>
            <span class="control-value">{config.defaultZoom} - {getZoomDescription(config.defaultZoom)}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="18" 
            bind:value={config.defaultZoom}
            disabled={saving}
            class="zoom-slider"
          >
          <div class="control-description">Poziom przybliżenia przy pierwszym załadowaniu mapy (również maksymalne oddalenie dla użytkowników)</div>
        </label>
        
        <label class="zoom-control">
          <div class="control-header">
            <span class="control-title">Próg Przełączenia na Szczegółową Mapę</span>
            <span class="control-value">{config.maxCustomZoom} - {getZoomDescription(config.maxCustomZoom)}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="18" 
            bind:value={config.maxCustomZoom}
            disabled={saving}
            class="zoom-slider"
          >
          <div class="control-description">Powyżej tego poziomu zostanie wyświetlona szczegółowa mapa zamiast niestandardowego obrazu</div>
        </label>
      </div>
      
      <div class="zoom-behavior-explanation">
        <h4>Jak działają ustawienia przybliżenia:</h4>
        <ul>
          <li><strong>Poziom {config.defaultZoom}</strong> - Początkowy widok i maksymalne oddalenie dla użytkowników</li>
          <li><strong>Poziom {config.defaultZoom} do {config.maxCustomZoom}</strong> - Pokazuje Twój niestandardowy obraz (jeśli dodany)</li>
          <li><strong>Poziom {config.maxCustomZoom + 1} do 18</strong> - Pokazuje szczegółową mapę OpenStreetMap</li>
          <li>Użytkownicy mogą przybliżać do poziomu 18, ale nie mogą oddalić się bardziej niż poziom {config.defaultZoom}</li>
        </ul>
      </div>
      
      <h3>Obraz Niestandardowy</h3>
      
      <label>
        URL obrazu (opcjonalne):
        <input 
          type="text" 
          bind:value={config.customImageUrl}
          placeholder="/uploads/map-images/custom-map.png"
          disabled={saving}
        >
      </label>
      
      <p class="help-text">
        Prześlij swoją niestandardową ilustrację do folderu static i wprowadź tutaj ścieżkę.
        Obraz zostanie rozciągnięty, aby pasował do granic zdefiniowanych powyżej.
      </p>
      
      <div class="form-actions">
        <button onclick={saveConfig} disabled={saving}>
          {saving ? 'Zapisywanie...' : 'Zapisz Ustawienia'}
        </button>
        
        <button onclick={resetToDefaults} disabled={saving}>
          <!-- Reset to Defaults --> Przywróć Ustawienia Podstawowe
        </button>
      </div>
      
      {#if message}
        <div class="message" class:error={message.includes('Error')}>
          {message}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px;
    background: #ffffff;
    min-height: calc(100vh - 120px);
  }
  
  .admin-layout {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 40px;
    margin-top: 32px;
  }
  
  .map-panel {
    background: #ffffff;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
  }
  
  .config-panel {
    background: #ffffff;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
    height: fit-content;
  }
  
  .map-controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }
  
  .map-controls button {
    padding: 12px 20px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    transition: all 0.2s ease;
  }
  
  .map-controls button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .map-controls button.active {
    background: #1f2937;
    color: #ffffff;
    border-color: #1f2937;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .map-container {
    width: 100%;
    height: 500px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 15px;
  }
  
  .map-legend {
    display: flex;
    gap: 20px;
    font-size: 12px;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 2px;
  }
  
  .legend-color.sw {
    background: #28a745;
  }
  
  .legend-color.ne {
    background: #dc3545;
  }
  
  .legend-color.bounds {
    background: rgba(0, 123, 255, 0.2);
    border: 2px solid #007bff;
  }
  
  .legend-emoji {
    font-size: 16px;
  }
  
  .coordinate-display {
    margin-bottom: 20px;
  }
  
  .coord-group {
    margin-bottom: 15px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #f9f9f9;
  }
  
  .coord-group h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #333;
  }
  
  .coord-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .info-display {
    background: #e3f2fd;
    padding: 15px;
    border-radius: 6px;
    margin: 20px 0;
  }
  
  .info-display h3 {
    margin-top: 0;
  }
  
  label {
    display: block;
    margin-bottom: 15px;
    font-weight: 600;
  }
  
  input[type="number"], input[type="text"] {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 14px;
    background: #ffffff;
    transition: border-color 0.2s ease;
  }
  
  input[type="number"]:focus, input[type="text"]:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }
  
  input[type="range"] {
    width: 80%;
    margin-right: 10px;
  }
  
  .help-text {
    font-size: 12px;
    color: #666;
    margin-top: 10px;
  }
  
  .form-actions {
    display: flex;
    gap: 15px;
    margin-top: 30px;
  }
  
  .form-actions button {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .form-actions button:first-child {
    background: #1f2937;
    color: #ffffff;
    transition: all 0.2s ease;
  }
  
  .form-actions button:first-child:hover:not(:disabled) {
    background: #111827;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .form-actions button:last-child {
    background: #6b7280;
    color: #ffffff;
    transition: all 0.2s ease;
  }
  
  .form-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .message {
    padding: 12px;
    border-radius: 4px;
    margin-top: 15px;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .message.error {
    background: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }
  
  /* Custom marker styles */
  :global(.corner-marker) {
    background: white;
    border: 2px solid;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    font-size: 10px;
    line-height: 16px;
  }
  
  :global(.sw-marker) {
    border-color: #28a745;
    color: #28a745;
  }
  
  :global(.ne-marker) {
    border-color: #dc3545;
    color: #dc3545;
  }
  
  :global(.center-marker) {
    background: none;
    border: none;
    font-size: 20px;
  }

  /* Zoom feedback styles */
  .current-zoom-display {
    background: #f0f9ff;
    border: 2px solid #0ea5e9;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .zoom-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .zoom-indicator strong {
    color: #0c4a6e;
    font-size: 16px;
  }

  .zoom-description {
    color: #0369a1;
    font-weight: 500;
    background: rgba(14, 165, 233, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .layer-indicator {
    padding: 8px 12px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
  }

  .layer-indicator.custom {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #f59e0b;
  }

  .layer-indicator.osm {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #22c55e;
  }

  .zoom-controls {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .zoom-control {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s ease;
  }

  .zoom-control:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .control-title {
    font-weight: 600;
    color: #1f2937;
    font-size: 16px;
  }

  .control-value {
    font-weight: 500;
    color: #6b7280;
    background: #f3f4f6;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 14px;
  }

  .zoom-slider {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #e5e7eb;
    outline: none;
    margin: 12px 0;
  }

  .zoom-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .zoom-slider::-webkit-slider-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
  }

  .zoom-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .control-description {
    color: #6b7280;
    font-size: 13px;
    line-height: 1.4;
    font-style: italic;
  }

  .zoom-behavior-explanation {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
  }

  .zoom-behavior-explanation h4 {
    color: #1e293b;
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .zoom-behavior-explanation ul {
    margin: 0;
    padding-left: 20px;
  }

  .zoom-behavior-explanation li {
    margin-bottom: 8px;
    color: #475569;
    line-height: 1.5;
  }

  .zoom-behavior-explanation li:last-child {
    margin-bottom: 0;
  }

  .zoom-behavior-explanation strong {
    color: #1e293b;
    font-weight: 600;
  }
  
  @media (max-width: 1200px) {
    .admin-layout {
      grid-template-columns: 1fr;
    }
    
    .config-panel {
      order: -1;
    }
  }
</style>