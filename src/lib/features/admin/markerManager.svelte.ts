/**
 * Marker Manager for Admin Map
 * Manages corner and center markers for map bounds configuration.
 * Uses Svelte 5 runes for reactive state management.
 */

export type Corner = 'sw' | 'ne' | 'nw' | 'se';

/**
 * Creates and manages map markers for boundary editing.
 */
export function createMarkerManager() {
  // Marker references
  let centerMarker = $state<any>(null);
  let swMarker = $state<any>(null);
  let neMarker = $state<any>(null);
  let nwMarker = $state<any>(null);
  let seMarker = $state<any>(null);

  // Dragging state
  let isDragging = $state(false);
  let dragCorner = $state<Corner | null>(null);

  /**
   * Create a draggable corner marker
   */
  function createDraggableMarker(
    L: any,
    map: any,
    position: [number, number],
    corner: Corner,
    onDragStart: (corner: Corner) => void,
    onDrag: (corner: Corner, lat: number, lng: number) => void,
    onDragEnd: () => void
  ): any {
    const marker = L.marker(position, {
      icon: L.divIcon({
        className: `corner-marker ${corner}-marker`,
        html: `<div class="corner-handle"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      }),
      draggable: true
    }).addTo(map);

    marker.on('dragstart', () => {
      isDragging = true;
      dragCorner = corner;
      onDragStart(corner);
    });

    marker.on('drag', (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      onDrag(corner, lat, lng);
    });

    marker.on('dragend', () => {
      isDragging = false;
      dragCorner = null;
      onDragEnd();
    });

    return marker;
  }

  /**
   * Initialize all corner markers
   */
  function initializeMarkers(
    L: any,
    map: any,
    swLat: number,
    swLng: number,
    neLat: number,
    neLng: number,
    onDragStart: (corner: Corner) => void,
    onDrag: (corner: Corner, lat: number, lng: number) => void,
    onDragEnd: () => void
  ): void {
    swMarker = createDraggableMarker(L, map, [swLat, swLng], 'sw', onDragStart, onDrag, onDragEnd);
    neMarker = createDraggableMarker(L, map, [neLat, neLng], 'ne', onDragStart, onDrag, onDragEnd);
    nwMarker = createDraggableMarker(L, map, [neLat, swLng], 'nw', onDragStart, onDrag, onDragEnd);
    seMarker = createDraggableMarker(L, map, [swLat, neLng], 'se', onDragStart, onDrag, onDragEnd);
  }

  /**
   * Update marker positions (except the one being dragged)
   */
  function updateMarkerPositions(
    swLat: number,
    swLng: number,
    neLat: number,
    neLng: number,
    centerLat: number,
    centerLng: number,
    excludeCorner?: Corner
  ): void {
    if (swMarker && excludeCorner !== 'sw') swMarker.setLatLng([swLat, swLng]);
    if (neMarker && excludeCorner !== 'ne') neMarker.setLatLng([neLat, neLng]);
    if (nwMarker && excludeCorner !== 'nw') nwMarker.setLatLng([neLat, swLng]);
    if (seMarker && excludeCorner !== 'se') seMarker.setLatLng([swLat, neLng]);
    if (centerMarker) centerMarker.setLatLng([centerLat, centerLng]);
  }

  /**
   * Clear all markers from the map
   */
  function clearMarkers(): void {
    if (swMarker) {
      swMarker.remove();
      swMarker = null;
    }
    if (neMarker) {
      neMarker.remove();
      neMarker = null;
    }
    if (nwMarker) {
      nwMarker.remove();
      nwMarker = null;
    }
    if (seMarker) {
      seMarker.remove();
      seMarker = null;
    }
    if (centerMarker) {
      centerMarker.remove();
      centerMarker = null;
    }
  }

  /**
   * Set center marker
   */
  function setCenterMarker(marker: any): void {
    centerMarker = marker;
  }

  // Return reactive state and methods
  return {
    // State
    get centerMarker() { return centerMarker; },
    get swMarker() { return swMarker; },
    get neMarker() { return neMarker; },
    get nwMarker() { return nwMarker; },
    get seMarker() { return seMarker; },
    get isDragging() { return isDragging; },
    get dragCorner() { return dragCorner; },

    // Methods
    createDraggableMarker,
    initializeMarkers,
    updateMarkerPositions,
    clearMarkers,
    setCenterMarker
  };
}

export type MarkerManager = ReturnType<typeof createMarkerManager>;
