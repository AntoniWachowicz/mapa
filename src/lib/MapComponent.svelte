<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SavedObject, MapConfig, MapObject, GeoJSON, Tag, CategoryFieldData } from './types.js';
  import * as mapBoundaries from './features/mapBoundaries/index.js';

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
  }

  let { objects, onMapClick, selectedCoordinates, focusCoordinates = null, mapConfig, onPinClick, selectedObjectId = null, editingObjectId = null, originalEditLocation = null, onPinPositionUpdate, panToPinCallback = $bindable(null), tags = [] }: Props = $props();
  
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
  let movementLine = $state({ path: '', show: false, duration: 2 });

  // Tile provider configurations
  const tileProviders: Record<string, { url: string; attribution: string; maxZoom?: number }> = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    watercolor: {
      url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
      attribution: '© Stamen Design, © OpenStreetMap contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxZoom: 19
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap contributors, © OpenStreetMap contributors'
    }
  };
  
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
    map = L.map(mapContainer);
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
    const selectedProvider = tileProviders[mapConfig.baseLayerStyle || 'osm'];
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

  function updateMovementLine() {
    if (!map || !L || !originalEditLocation || !selectedCoordinates) {
      movementLine = { path: '', show: false, duration: 2 };
      return;
    }

    // Check if locations are different (moved at least 5 pixels)
    const startPoint = map.latLngToContainerPoint([originalEditLocation.lat, originalEditLocation.lng]);
    const endPoint = map.latLngToContainerPoint([selectedCoordinates.lat, selectedCoordinates.lng]);
    const distance = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));

    if (distance < 5) {
      // Locations are too close, don't show line
      movementLine = { path: '', show: false, duration: 2 };
      return;
    }

    // Calculate control point for the curve - always bend above (negative Y direction)
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;

    // Find the higher point (lower Y value = higher on screen)
    const higherY = Math.min(startPoint.y, endPoint.y);

    // Use 30% of the distance as the bend offset, always curve upward from the higher point
    const bendOffset = distance * 0.3;
    const controlX = midX;
    const controlY = higherY - bendOffset;

    // Create quadratic bezier curve path
    const path = `M ${startPoint.x} ${startPoint.y} Q ${controlX} ${controlY} ${endPoint.x} ${endPoint.y}`;

    // Calculate approximate curve length using numerical integration
    // For a quadratic Bezier curve, we can approximate the arc length
    const curveLength = approximateBezierLength(
      startPoint.x, startPoint.y,
      controlX, controlY,
      endPoint.x, endPoint.y
    );

    // Set velocity to 100 pixels per second for consistent speed
    const pixelsPerSecond = 100;
    const duration = curveLength / pixelsPerSecond;

    // SVG animateMotion handles the animation with a steeper ease-in curve
    // Using keySplines="0.65 0 1 1" for faster acceleration
    movementLine = { path, show: true, duration };
  }

  // Approximate the length of a quadratic Bezier curve
  function approximateBezierLength(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
    // Use 10 segments for approximation
    const segments = 10;
    let length = 0;
    let prevX = x0;
    let prevY = y0;

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const oneMinusT = 1 - t;

      // Quadratic Bezier formula
      const x = oneMinusT * oneMinusT * x0 + 2 * oneMinusT * t * x1 + t * t * x2;
      const y = oneMinusT * oneMinusT * y0 + 2 * oneMinusT * t * y1 + t * t * y2;

      // Add distance from previous point
      length += Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));

      prevX = x;
      prevY = y;
    }

    return length;
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

        // Check if this pin is being edited
        const isEditing = editingObjectId === obj.id;

        // Get pin color from category
        const pinColor = getPinColor(obj);

        // Create SVG with dynamic color - keep original color, add glow wrapper when editing
        const pinSvg = isEditing ? `
          <div class="glow-wrapper">
            <svg width="23" height="33" viewBox="0 0 23 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.134 23.6579C13.134 22.6631 13.8739 21.8397 14.8213 21.5361C16.3387 21.05 17.766 20.2047 18.9702 19.0005C23.0095 14.9613 23.0095 8.4124 18.9702 4.37317C14.931 0.333943 8.38212 0.333943 4.3429 4.37317C0.30367 8.4124 0.30367 14.9613 4.3429 19.0005C5.54714 20.2047 6.97446 21.05 8.49184 21.5361C9.4392 21.8397 10.1791 22.6631 10.1791 23.6579V30.4934C10.1791 31.3095 10.8405 31.9708 11.6566 31.9708C12.4726 31.9708 13.134 31.3095 13.134 30.4934V23.6579Z" fill="${pinColor}" stroke="black" stroke-linecap="round"/>
            </svg>
          </div>
        ` : `
          <svg width="23" height="33" viewBox="0 0 23 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.134 23.6579C13.134 22.6631 13.8739 21.8397 14.8213 21.5361C16.3387 21.05 17.766 20.2047 18.9702 19.0005C23.0095 14.9613 23.0095 8.4124 18.9702 4.37317C14.931 0.333943 8.38212 0.333943 4.3429 4.37317C0.30367 8.4124 0.30367 14.9613 4.3429 19.0005C5.54714 20.2047 6.97446 21.05 8.49184 21.5361C9.4392 21.8397 10.1791 22.6631 10.1791 23.6579V30.4934C10.1791 31.3095 10.8405 31.9708 11.6566 31.9708C12.4726 31.9708 13.134 31.3095 13.134 30.4934V23.6579Z" fill="${pinColor}" stroke="black" stroke-linecap="round"/>
          </svg>
        `;

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: isEditing ? 'object-marker editing-pin' : 'object-marker',
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

    if (selectedCoordinates) {
      // Remove old marker if exists
      if (selectedMarker) {
        map.removeLayer(selectedMarker);
      }

      // Create new marker at selected coordinates with glow wrapper
      const selectedPinSvg = `
        <div class="glow-wrapper">
          <svg width="23" height="33" viewBox="0 0 23 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.134 23.6579C13.134 22.6631 13.8739 21.8397 14.8213 21.5361C16.3387 21.05 17.766 20.2047 18.9702 19.0005C23.0095 14.9613 23.0095 8.4124 18.9702 4.37317C14.931 0.333943 8.38212 0.333943 4.3429 4.37317C0.30367 8.4124 0.30367 14.9613 4.3429 19.0005C5.54714 20.2047 6.97446 21.05 8.49184 21.5361C9.4392 21.8397 10.1791 22.6631 10.1791 23.6579V30.4934C10.1791 31.3095 10.8405 31.9708 11.6566 31.9708C12.4726 31.9708 13.134 31.3095 13.134 30.4934V23.6579Z" fill="#FF0000" stroke="black" stroke-linecap="round"/>
          </svg>
        </div>
      `;

      selectedMarker = L.marker([selectedCoordinates.lat, selectedCoordinates.lng], {
        icon: L.divIcon({
          className: 'selected-marker editing-pin',
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