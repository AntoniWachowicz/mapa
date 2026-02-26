<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SavedObject, MapConfig, MapObject, GeoJSON, Tag, CategoryFieldData, Field } from './types.js';
  import * as mapBoundaries from './features/mapBoundaries/index.js';
  import { loadLeaflet, loadMarkerCluster, registerSmoothWheelZoom, TILE_PROVIDERS, getTileProvider } from './features/leafletMap/leafletUtils.js';
  import { updateMapMarkers, updateSelectedMarker } from './features/leafletMap/markerManager.js';
  import { createBoundsOverlay as createBoundsOverlayLayer, createBoundaryPolygon as createBoundaryPolygonLayer } from './features/mapBoundaries/boundaryRenderer.js';
  import { calculateMovementLine } from './features/mapInteraction/movementLineAnimator.js';
  import { createPinPositionTracker } from './features/mapInteraction/pinPositionTracker.js';

  interface Props {
    objects: MapObject[];
    onMapClick: (coordinates: {lat: number, lng: number}) => void;
    selectedCoordinates: {lat: number, lng: number} | null;
    focusCoordinates?: {lat: number, lng: number} | null;
    mapConfig: MapConfig;  // NEW: Add map config prop
    onPinClick?: (obj: MapObject) => void; // NEW: Pin click callback
    selectedObjectId?: string | null; // NEW: Track selected pin for detail view
    editingObjectId?: string | null; // NEW: Track pin being edited
    originalEditLocation?: {lat: number, lng: number} | null; // NEW: Original location when editing
    onPinPositionUpdate?: (x: number, y: number) => void; // NEW: Pin position callback
    panToPinCallback?: (() => void) | null; // NEW: Callback to trigger pan after panel renders
    tags?: Tag[]; // NEW: Pass tags to get category colors
    fields?: Field[]; // NEW: Pass fields to get isCategory selection field colors
  }

  let { objects, onMapClick, selectedCoordinates, focusCoordinates = null, mapConfig, onPinClick, selectedObjectId = null, editingObjectId = null, originalEditLocation = null, onPinPositionUpdate, panToPinCallback = $bindable(null), tags = [], fields = [] }: Props = $props();
  
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  let markers: any[] = [];
  let selectedMarker: any = null;
  let osmTileLayer: any = null;
  let customImageOverlay: any = null;
  let customTileLayer: any = null;
  let boundsOverlay: any = null;
  let boundaryPolygon: any = null;
  let clusterGroup: any = null;
  let mapInitialized = $state(false);
  let movementLine = $state({ path: '', show: false, duration: 2 });

  // Create pin position tracker
  const pinPositionTracker = createPinPositionTracker();

  let resizeObserver: ResizeObserver | null = null;

  onMount(async () => {
    L = await loadLeaflet();
    registerSmoothWheelZoom();
    await loadMarkerCluster();
    initializeMap();
    updateMarkers();

    // Watch for container size changes so Leaflet redraws tiles and overlays
    resizeObserver = new ResizeObserver(() => {
      if (map) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainer);
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    pinPositionTracker.stopContinuousUpdate();
    if (clusterGroup && map) {
      map.removeLayer(clusterGroup);
    }
    if (boundsOverlay && map) {
      map.removeLayer(boundsOverlay);
    }
    if (boundaryPolygon && map) {
      map.removeLayer(boundaryPolygon);
    }
  });

  // Create overlay to darken area outside bounds
  function createBoundsOverlay() {
    if (!map || !L || boundsOverlay) return;

    boundsOverlay = createBoundsOverlayLayer(L, map, mapConfig);

    // Add visible boundary outline for polygon boundaries
    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      createBoundaryPolygon();
    }
  }

  // Create visible boundary polygon outline
  function createBoundaryPolygon() {
    if (!map || !L || !mapConfig.polygonBoundary || boundaryPolygon) return;

    boundaryPolygon = createBoundaryPolygonLayer(L, map, mapConfig.polygonBoundary);
  }


  function initializeMap() {
    // Calculate bounds to fit from config
    let fitBounds;
    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      // Calculate bounds from polygon using helper function
      const polygonBounds = mapBoundaries.calculatePolygonBounds(mapConfig.polygonBoundary);
      fitBounds = [
        [polygonBounds.swLat, polygonBounds.swLng],
        [polygonBounds.neLat, polygonBounds.neLng]
      ];
    } else {
      // Use rectangle bounds
      fitBounds = [
        [mapConfig.swLat, mapConfig.swLng],
        [mapConfig.neLat, mapConfig.neLng]
      ];
    }

    // Initialize map and fit to bounds automatically
    map = L.map(mapContainer, {
      scrollWheelZoom: false,
      smoothWheelZoom: true,
      smoothSensitivity: 1
    });
    map.fitBounds(fitBounds, { padding: [50, 50] }); // Add padding for better view

    // Expand bounds by 100% margin to allow maximum panning flexibility
    // This allows the boundary edge to be positioned in the middle of the viewport
    const latRange = mapConfig.neLat - mapConfig.swLat;
    const lngRange = mapConfig.neLng - mapConfig.swLng;
    const marginLat = latRange * 1.0;
    const marginLng = lngRange * 1.0;

    const bounds = [
      [mapConfig.swLat - marginLat, mapConfig.swLng - marginLng], // SW with margin
      [mapConfig.neLat + marginLat, mapConfig.neLng + marginLng]  // NE with margin
    ];
    map.setMaxBounds(bounds);

    // Set zoom range - allow zooming out to see custom tiles but not too far
    map.setMinZoom(Math.max(10, mapConfig.maxCustomZoom - 6));  // Can zoom out to see custom map
    map.setMaxZoom(18); // Allow maximum detail zoom

    // Create base tile layer using selected style (default to OSM)
    const selectedProvider = getTileProvider(mapConfig.baseLayerStyle || 'osm');
    osmTileLayer = L.tileLayer(selectedProvider.url, {
      attribution: selectedProvider.attribution,
      maxZoom: selectedProvider.maxZoom || 18
    });

    // Create custom layer if URL provided and overlay is enabled
    if (mapConfig.customImageUrl && mapConfig.overlayEnabled !== false) {
      try {
        // Check if it's a tile URL pattern (contains {z}, {x}, {y})
        if (mapConfig.customImageUrl.includes('{z}') && mapConfig.customImageUrl.includes('{x}') && mapConfig.customImageUrl.includes('{y}')) {
          // Use tile layer for tile-based custom maps
          customTileLayer = L.tileLayer(mapConfig.customImageUrl, {
            maxZoom: mapConfig.maxCustomZoom,
            maxNativeZoom: mapConfig.maxCustomZoom,
            minZoom: 8,
            tileSize: 256,
            zoomOffset: 0,
            attribution: 'Custom Map',
            errorTileUrl: '',
            crossOrigin: false,
            opacity: 1
          });
        } else {
          // Use image overlay for single static images
          customImageOverlay = L.imageOverlay(mapConfig.customImageUrl, bounds);
        }
      } catch (error) {
        console.error('Error loading custom map layer:', error);
        // Fallback to OSM tiles
        osmTileLayer.addTo(map);
      }
    }
    
    // Determine which layer to show initially
    updateLayerBasedOnZoom();
    
    // Handle zoom changes for layer switching
    map.on('zoom', updateLayerBasedOnZoom);

    // Handle zoom animation start
    map.on('zoomstart', () => {
      startContinuousUpdate();
    });

    // Handle zoom animation end
    map.on('zoomend', () => {
      stopContinuousUpdate();
      updateSelectedPinPosition();

      if (boundsOverlay) {
        map.removeLayer(boundsOverlay);
        boundsOverlay = null;
      }
      if (boundaryPolygon) {
        map.removeLayer(boundaryPolygon);
        boundaryPolygon = null;
      }
      createBoundsOverlay();
    });

    // Handle panning
    map.on('move', updateSelectedPinPosition);

    // Handle other map view changes
    map.on('moveend', () => {
      if (boundsOverlay) {
        map.removeLayer(boundsOverlay);
        boundsOverlay = null;
      }
      if (boundaryPolygon) {
        map.removeLayer(boundaryPolygon);
        boundaryPolygon = null;
      }
      createBoundsOverlay();
    });

    // Create bounds overlay to show restricted areas
    createBoundsOverlay();

    // Handle map clicks
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;

      // Check if click is within bounds before allowing pin placement
      if (!mapBoundaries.isWithinBounds(
        lat,
        lng,
        mapConfig.boundaryType,
        { swLat: mapConfig.swLat, swLng: mapConfig.swLng, neLat: mapConfig.neLat, neLng: mapConfig.neLng },
        mapConfig.polygonBoundary
      )) {
        return;
      }

      onMapClick({ lat, lng });

      // Note: Selected marker is now updated by $effect watching selectedCoordinates
      // This ensures the marker updates properly when coordinates change
    });

    // Mark map as initialized
    mapInitialized = true;
  }
  
  function getTrackerOptions() {
    return { map, L, objects, selectedObjectId, onPinPositionUpdate };
  }

  function updateSelectedPinPosition() {
    pinPositionTracker.updatePosition(getTrackerOptions());
  }

  function startContinuousUpdate() {
    pinPositionTracker.startContinuousUpdate(getTrackerOptions());
  }

  function stopContinuousUpdate() {
    pinPositionTracker.stopContinuousUpdate();
  }

  function updateMovementLine() {
    if (!map || !L || !originalEditLocation || !selectedCoordinates) {
      movementLine = { path: '', show: false, duration: 2 };
      return;
    }

    movementLine = calculateMovementLine(map, originalEditLocation, selectedCoordinates);
  }

  function updateLayerBasedOnZoom() {
    if (!map || !L) return;

    const currentZoom = map.getZoom();
    const fadeStart = mapConfig.maxCustomZoom - 1; // Start fading at breakpoint - 1

    // Always show OSM tiles as base layer (for transparency to work)
    if (!map.hasLayer(osmTileLayer)) {
      map.addLayer(osmTileLayer);
      osmTileLayer.setZIndex(100); // OSM tiles on bottom
    }

    // Add custom layer if it exists and isn't already added
    if (customTileLayer && !map.hasLayer(customTileLayer)) {
      map.addLayer(customTileLayer);
      customTileLayer.setZIndex(200); // Custom tiles on top
    } else if (customImageOverlay && !map.hasLayer(customImageOverlay)) {
      map.addLayer(customImageOverlay);
    }

    // Simple opacity control - show or hide based on zoom
    if (customTileLayer) {
      const container = customTileLayer.getContainer();
      if (container) {
        // Set transition once
        container.style.transition = 'opacity 0.3s ease';

        // Simple logic: show below fadeStart, hide at/above fadeStart
        if (currentZoom < fadeStart) {
          container.style.opacity = '1';
        } else {
          container.style.opacity = '0';
        }
      }
    } else if (customImageOverlay) {
      const container = customImageOverlay.getElement();
      if (container) {
        container.style.transition = 'opacity 0.3s ease';

        if (currentZoom < fadeStart) {
          container.style.opacity = '1';
        } else {
          container.style.opacity = '0';
        }
      }
    }
  }
  
  function updateMarkers() {
    if (!map || !L) return;

    const result = updateMapMarkers(
      L,
      map,
      mapContainer,
      objects,
      markers,
      editingObjectId,
      tags,
      fields,
      onPinClick,
      (callback) => { panToPinCallback = callback; },
      clusterGroup
    );
    markers = result.markers;
    clusterGroup = result.clusterGroup;
  }
  
  // Update markers when objects or editing state changes
  $effect(() => {
    // Track dependencies
    objects;
    editingObjectId;
    selectedObjectId;
    if (map && L) {
      updateMarkers();
      updateSelectedPinPosition();
    }
  });
  
  // Update selected marker when selectedCoordinates changes
  $effect(() => {
    if (!mapInitialized || !map || !L) return;

    selectedMarker = updateSelectedMarker(L, map, selectedCoordinates, selectedMarker);
  });
  
  // Handle focus coordinates
  $effect(() => {
    if (focusCoordinates && map && L) {
      map.setView([focusCoordinates.lat, focusCoordinates.lng], 15);

      L.popup()
        .setLatLng([focusCoordinates.lat, focusCoordinates.lng])
        .setContent('Focused Pin')
        .openOn(map);
    }
  });

  // Handle movement line when editing
  $effect(() => {
    if (originalEditLocation && selectedCoordinates && map && L) {
      updateMovementLine();

      // Update on map move
      const updateHandler = () => updateMovementLine();
      map.on('move', updateHandler);
      map.on('zoom', updateHandler);

      return () => {
        map.off('move', updateHandler);
        map.off('zoom', updateHandler);
      };
    } else {
      movementLine = { path: '', show: false, duration: 2 };
    }
  });
</script>

<div bind:this={mapContainer} class="map-container"></div>

<!-- Movement line overlay when editing a pin -->
{#if originalEditLocation && selectedCoordinates && movementLine.path}
  <svg class="movement-line-overlay">
    <!-- Curved path (solid) with ID for animation reference -->
    <path
      id="movement-path"
      d={movementLine.path}
      stroke="var(--color-accent)"
      stroke-width="2"
      fill="none"
      opacity="0.7"
    />
    <!-- Animated arrow triangle using animateMotion -->
    <g>
      <polygon
        points="0,-6 10,0 0,6"
        fill="var(--color-accent)"
      >
        <animateMotion
          dur="{movementLine.duration}s"
          repeatCount="indefinite"
          rotate="auto"
          path={movementLine.path}
          calcMode="spline"
          keyTimes="0; 1"
          keySplines="0.65 0 1 1"
        />
      </polygon>
    </g>
  </svg>
{/if}

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
  }

  :global(.object-marker) {
    background: none !important;
    border: none !important;
  }

  :global(.cluster-icon) {
    background: none !important;
    border: none !important;
  }

  :global(.selected-marker) {
    background: none !important;
    border: none !important;
  }

  :global(.editing-pin) {
    background: none !important;
    border: none !important;
  }

  :global(.glow-wrapper) {
    animation: glow-pulse 1s ease-in-out infinite !important;
  }

  @keyframes glow-pulse {
    0%, 100% {
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 8px white) drop-shadow(0 0 16px white) drop-shadow(0 0 24px white);
    }
  }

  :global(.glow-wrapper) {
    animation: glow-pulse 1s ease-in-out infinite !important;
  }

  .movement-line-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 400;
  }

</style>