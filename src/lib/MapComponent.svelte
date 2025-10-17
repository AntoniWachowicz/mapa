<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SavedObject, MapConfig, MapObject, GeoJSON, Tag, CategoryFieldData } from './types.js';
  
  interface Props {
    objects: MapObject[];
    onMapClick: (coordinates: {lat: number, lng: number}) => void;
    selectedCoordinates: {lat: number, lng: number} | null;
    focusCoordinates?: {lat: number, lng: number} | null;
    mapConfig: MapConfig;  // NEW: Add map config prop
    onPinClick?: (obj: MapObject) => void; // NEW: Pin click callback
    selectedObjectId?: string | null; // NEW: Track selected pin
    onPinPositionUpdate?: (x: number, y: number) => void; // NEW: Pin position callback
    panToPinCallback?: (() => void) | null; // NEW: Callback to trigger pan after panel renders
    tags?: Tag[]; // NEW: Pass tags to get category colors
  }

  let { objects, onMapClick, selectedCoordinates, focusCoordinates = null, mapConfig, onPinClick, selectedObjectId = null, onPinPositionUpdate, panToPinCallback = $bindable(null), tags = [] }: Props = $props();
  
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
  let isZooming = false;
  let animationFrameId: number | null = null;
  let mapInitialized = $state(false);
  
  onMount(async () => {
    await loadLeaflet();
    initializeMap();
    updateMarkers();
  });

  onDestroy(() => {
    stopContinuousUpdate();
    if (boundsOverlay && map) {
      map.removeLayer(boundsOverlay);
    }
    if (boundaryPolygon && map) {
      map.removeLayer(boundaryPolygon);
    }
  });

  // Get pin color based on category
  function getPinColor(obj: MapObject): string {
    // Look for category field in object data
    const categoryField = Object.values(obj.data).find(
      (value): value is CategoryFieldData =>
        typeof value === 'object' &&
        value !== null &&
        'majorTag' in value &&
        typeof (value as any).majorTag === 'string'
    ) as CategoryFieldData | undefined;

    if (categoryField?.majorTag && tags) {
      const tag = tags.find(t => t.id === categoryField.majorTag);
      if (tag) {
        return tag.color;
      }
    }

    // Default color if no category or tag found
    return '#FF0000';
  }

  // Check if coordinates are within the configured bounds
  function isWithinBounds(lat: number, lng: number): boolean {
    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      return isPointInPolygon(lat, lng, mapConfig.polygonBoundary);
    }

    // Default rectangle boundary check
    return lat >= mapConfig.swLat && lat <= mapConfig.neLat &&
           lng >= mapConfig.swLng && lng <= mapConfig.neLng;
  }

  // Point-in-polygon algorithm using ray casting
  function isPointInPolygon(lat: number, lng: number, polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
    if (polygon.type === 'Polygon') {
      return checkPolygon(lat, lng, polygon.coordinates[0]);
    } else if (polygon.type === 'MultiPolygon') {
      // Check if point is in any of the polygons
      return polygon.coordinates.some(polygonCoords =>
        checkPolygon(lat, lng, polygonCoords[0])
      );
    }
    return false;
  }

  // Helper function to check if point is in a single polygon
  function checkPolygon(lat: number, lng: number, coordinates: number[][]): boolean {
    let isInside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i][0]; // longitude
      const yi = coordinates[i][1]; // latitude
      const xj = coordinates[j][0]; // longitude
      const yj = coordinates[j][1]; // latitude

      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        isInside = !isInside;
      }
    }

    return isInside;
  }

  // Create overlay to darken area outside bounds
  function createBoundsOverlay() {
    if (!map || !L || boundsOverlay) return;

    const mapBounds = map.getBounds();
    const worldBounds = [
      [mapBounds.getSouth() - 10, mapBounds.getWest() - 10],
      [mapBounds.getNorth() + 10, mapBounds.getEast() + 10]
    ];

    // Create outer ring (world bounds)
    const outerRing = [
      [worldBounds[0][0], worldBounds[0][1]], // SW
      [worldBounds[1][0], worldBounds[0][1]], // NW
      [worldBounds[1][0], worldBounds[1][1]], // NE
      [worldBounds[0][0], worldBounds[1][1]], // SE
      [worldBounds[0][0], worldBounds[0][1]]  // back to SW
    ];

    let holes: any[] = [];

    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      // Use polygon coordinates for the inner hole(s)
      if (mapConfig.polygonBoundary.type === 'Polygon') {
        holes = [mapConfig.polygonBoundary.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])];
      } else if (mapConfig.polygonBoundary.type === 'MultiPolygon') {
        holes = mapConfig.polygonBoundary.coordinates.map((polygonCoords: number[][][]) =>
          polygonCoords[0].map((coord: number[]) => [coord[1], coord[0]])
        );
      }
    } else {
      // Use rectangle bounds for the inner hole
      holes = [[
        [mapConfig.swLat, mapConfig.swLng], // SW
        [mapConfig.neLat, mapConfig.swLng], // NW
        [mapConfig.neLat, mapConfig.neLng], // NE
        [mapConfig.swLat, mapConfig.neLng], // SE
        [mapConfig.swLat, mapConfig.swLng]  // back to SW
      ]];
    }

    boundsOverlay = L.polygon([outerRing, ...holes], {
      color: 'transparent',
      weight: 0,
      fillColor: '#000000',
      fillOpacity: 0.3,
      interactive: false  // Allow clicks to pass through
    }).addTo(map);

    // Add visible boundary outline for polygon boundaries
    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      createBoundaryPolygon();
    }
  }

  // Create visible boundary polygon outline
  function createBoundaryPolygon() {
    if (!map || !L || !mapConfig.polygonBoundary || boundaryPolygon) return;

    let allCoordinates: any[] = [];

    if (mapConfig.polygonBoundary.type === 'Polygon') {
      allCoordinates = [mapConfig.polygonBoundary.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])];
    } else if (mapConfig.polygonBoundary.type === 'MultiPolygon') {
      allCoordinates = mapConfig.polygonBoundary.coordinates.map((polygonCoords: number[][][]) =>
        polygonCoords[0].map((coord: number[]) => [coord[1], coord[0]])
      );
    }

    boundaryPolygon = L.polygon(allCoordinates, {
      color: '#007bff',
      weight: 3,
      fillOpacity: 0,
      interactive: false
    }).addTo(map);
  }


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
    // Calculate center from config
    const center = [
      (mapConfig.swLat + mapConfig.neLat) / 2,
      (mapConfig.swLng + mapConfig.neLng) / 2
    ];

    // Use breakpoint - 3 as default zoom (close but can see the custom map)
    const calculatedDefaultZoom = Math.max(
      mapConfig.defaultZoom,
      Math.min(mapConfig.maxCustomZoom - 3, 14) // 3 zoom levels below breakpoint for good view
    );

    // Initialize map with calculated zoom
    map = L.map(mapContainer).setView(center, calculatedDefaultZoom);

    // Expand bounds by 5% margin to match the custom tiles
    const latRange = mapConfig.neLat - mapConfig.swLat;
    const lngRange = mapConfig.neLng - mapConfig.swLng;
    const marginLat = latRange * 0.05;
    const marginLng = lngRange * 0.05;

    const bounds = [
      [mapConfig.swLat - marginLat, mapConfig.swLng - marginLng], // SW with margin
      [mapConfig.neLat + marginLat, mapConfig.neLng + marginLng]  // NE with margin
    ];
    map.setMaxBounds(bounds);

    // Set zoom range - allow zooming out to see custom tiles but not too far
    map.setMinZoom(Math.max(10, mapConfig.maxCustomZoom - 6));  // Can zoom out to see custom map
    map.setMaxZoom(18); // Allow maximum detail zoom

    // Create OpenStreetMap tile layer (but don't add it yet)
    osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
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
      isZooming = true;
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
      if (!isWithinBounds(lat, lng)) {
        return;
      }

      onMapClick({ lat, lng });

      // Note: Selected marker is now updated by $effect watching selectedCoordinates
      // This ensures the marker updates properly when coordinates change
    });

    // Mark map as initialized
    mapInitialized = true;
  }
  
  function updateSelectedPinPosition() {
    if (!map || !L || !selectedObjectId || !onPinPositionUpdate) return;

    // Find the selected object
    const selectedObj = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj || !selectedObj.location) return;

    // Extract lat/lng from GeoJSON Point: coordinates are [lng, lat]
    const [lng, lat] = selectedObj.location.coordinates;

    // Convert lat/lng to pixel coordinates
    const point = map.latLngToContainerPoint([lat, lng]);

    // Call the callback with pixel position (bottom-middle of pin icon)
    // Adjust 4px up to align with the actual visible bottom of the icon
    onPinPositionUpdate(point.x, point.y - 4);
  }

  function startContinuousUpdate() {
    if (animationFrameId !== null) return; // Already running

    const animate = () => {
      if (isZooming) {
        updateSelectedPinPosition();
        animationFrameId = requestAnimationFrame(animate);
      } else {
        animationFrameId = null;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
  }

  function stopContinuousUpdate() {
    isZooming = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
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

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Add markers for objects with valid location
    objects.forEach(obj => {
      if (obj.location && obj.location.coordinates && obj.location.coordinates.length === 2) {
        // Extract lat/lng from GeoJSON Point: coordinates are [lng, lat]
        const [lng, lat] = obj.location.coordinates;

        const titleField = obj.data.title || obj.data.name || Object.values(obj.data)[0];

        // Check if this pin is selected
        const isSelected = selectedObjectId === obj.id;

        // Get pin color from category
        const pinColor = getPinColor(obj);

        // Create SVG with dynamic color
        const pinSvg = `
          <svg width="23" height="33" viewBox="0 0 23 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.134 23.6579C13.134 22.6631 13.8739 21.8397 14.8213 21.5361C16.3387 21.05 17.766 20.2047 18.9702 19.0005C23.0095 14.9613 23.0095 8.4124 18.9702 4.37317C14.931 0.333943 8.38212 0.333943 4.3429 4.37317C0.30367 8.4124 0.30367 14.9613 4.3429 19.0005C5.54714 20.2047 6.97446 21.05 8.49184 21.5361C9.4392 21.8397 10.1791 22.6631 10.1791 23.6579V30.4934C10.1791 31.3095 10.8405 31.9708 11.6566 31.9708C12.4726 31.9708 13.134 31.3095 13.134 30.4934V23.6579Z" fill="${isSelected ? '#00FF00' : pinColor}" stroke="black" stroke-linecap="round"/>
          </svg>
        `;

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: isSelected ? 'object-marker selected-pin' : 'object-marker',
            html: pinSvg,
            iconSize: [23, 33],
            iconAnchor: [11, 33]
          })
        })
        .addTo(map);

        // Add click handler to emit pin selection and pan to center
        marker.on('click', (e: any) => {
          if (onPinClick) {
            // Prevent default popup behavior
            L.DomEvent.stopPropagation(e);

            // Store the current selected ID before changing it
            const previousSelectedId = selectedObjectId;

            // Create pan function that will be called after panel renders
            const doPan = () => {
              // Get map container dimensions
              const mapContainerRect = mapContainer.getBoundingClientRect();
              const mapCenterX = mapContainerRect.width / 2;
              const mapCenterY = mapContainerRect.height / 2;

              // Convert pin's lat/lng to container pixel coordinates
              const pinPoint = map.latLngToContainerPoint([lat, lng]);

              // Calculate offset needed to center the pin in the map container
              const offsetX = mapCenterX - pinPoint.x;
              const offsetY = mapCenterY - pinPoint.y;

              // Pan by the offset
              map.panBy([-offsetX, -offsetY], { animate: true, duration: 0.3 });
            };

            // Set the callback so parent can trigger it after panel renders
            panToPinCallback = doPan;

            // Open detail panel (parent will call doPan after panel is in DOM)
            onPinClick(obj);
          }
        });

        markers.push(marker);
      }
    });

    // Don't auto-fit bounds when updating markers - this causes unwanted zoom/pan
  }
  
  // Update markers when objects or selection changes
  $effect(() => {
    // Track dependencies
    objects;
    selectedObjectId;
    if (map && L) {
      updateMarkers();
      updateSelectedPinPosition();
    }
  });
  
  // Update selected marker when selectedCoordinates changes
  $effect(() => {
    if (!mapInitialized || !map || !L) return;

    if (selectedCoordinates) {
      // Remove old marker if exists
      if (selectedMarker) {
        map.removeLayer(selectedMarker);
      }

      // Create new marker at selected coordinates (green for new placement)
      const selectedPinSvg = `
        <svg width="23" height="33" viewBox="0 0 23 33" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.134 23.6579C13.134 22.6631 13.8739 21.8397 14.8213 21.5361C16.3387 21.05 17.766 20.2047 18.9702 19.0005C23.0095 14.9613 23.0095 8.4124 18.9702 4.37317C14.931 0.333943 8.38212 0.333943 4.3429 4.37317C0.30367 8.4124 0.30367 14.9613 4.3429 19.0005C5.54714 20.2047 6.97446 21.05 8.49184 21.5361C9.4392 21.8397 10.1791 22.6631 10.1791 23.6579V30.4934C10.1791 31.3095 10.8405 31.9708 11.6566 31.9708C12.4726 31.9708 13.134 31.3095 13.134 30.4934V23.6579Z" fill="#00FF00" stroke="black" stroke-linecap="round"/>
        </svg>
      `;

      selectedMarker = L.marker([selectedCoordinates.lat, selectedCoordinates.lng], {
        icon: L.divIcon({
          className: 'selected-marker',
          html: selectedPinSvg,
          iconSize: [23, 33],
          iconAnchor: [11, 33]
        })
      }).addTo(map);
    } else if (selectedMarker) {
      // Clear marker if no coordinates selected
      map.removeLayer(selectedMarker);
      selectedMarker = null;
    }
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
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
  }
  
  :global(.object-marker) {
    background: none;
    border: none;
    font-size: 20px;
  }
  
  :global(.selected-marker) {
    background: none;
    border: none;
    font-size: 20px;
    filter: hue-rotate(120deg);
  }

  :global(.selected-pin) {
    animation: pin-pulse 1s ease-in-out infinite;
  }

  @keyframes :global(pin-pulse) {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-5px) scale(1.1);
    }
  }

</style>