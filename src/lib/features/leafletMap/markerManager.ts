/**
 * Leaflet Marker Manager
 * Handles marker creation, rendering, and interaction for map pins.
 */

import type { MapObject, Tag, CategoryFieldData, Field, SelectionConfig, SelectionFieldData } from '$lib/types.js';

export interface MarkerOptions {
  isEditing?: boolean;
  isSelected?: boolean;
}

/**
 * Get pin color from object's category tag or selection field with isCategory
 */
export function getPinColor(obj: MapObject, tags?: Tag[], fields?: Field[]): string {
  // First, check for selection field with isCategory flag
  if (fields) {
    const categorySelectionField = fields.find(f =>
      f.fieldType === 'selection' &&
      (f.config as SelectionConfig | undefined)?.isCategory
    );

    if (categorySelectionField) {
      const fieldKey = categorySelectionField.key || categorySelectionField.fieldName;
      const selData = obj.data[fieldKey] as SelectionFieldData | undefined;
      const config = categorySelectionField.config as SelectionConfig | undefined;
      const options = config?.options || [];
      const mode = config?.mode || 'single';

      if (selData) {
        let primaryId: string | null = null;

        if (mode === 'single' && selData.selected) {
          primaryId = selData.selected;
        } else if (mode === 'hierarchical' && selData.primary) {
          primaryId = selData.primary;
        } else if (mode === 'multi' && selData.selections && selData.selections.length > 0) {
          primaryId = selData.selections[0];
        }

        if (primaryId) {
          const option = options.find(o => o.id === primaryId);
          if (option?.color) {
            return option.color;
          }
        }
      }
    }
  }

  // Fallback: Look for legacy category field in object data
  const categoryFieldData = Object.values(obj.data).find(
    (value): value is CategoryFieldData =>
      typeof value === 'object' &&
      value !== null &&
      'majorTag' in value &&
      typeof (value as any).majorTag === 'string'
  ) as CategoryFieldData | undefined;

  if (categoryFieldData?.majorTag && tags) {
    const tag = tags.find(t => t.id === categoryFieldData.majorTag);
    if (tag) {
      return tag.color;
    }
  }

  // Default color if no category or tag found
  return '#FF0000';
}

// Pin path reused across single markers and cluster icons
const PIN_PATH = 'M13.134 23.6579C13.134 22.6631 13.8739 21.8397 14.8213 21.5361C16.3387 21.05 17.766 20.2047 18.9702 19.0005C23.0095 14.9613 23.0095 8.4124 18.9702 4.37317C14.931 0.333943 8.38212 0.333943 4.3429 4.37317C0.30367 8.4124 0.30367 14.9613 4.3429 19.0005C5.54714 20.2047 6.97446 21.05 8.49184 21.5361C9.4392 21.8397 10.1791 22.6631 10.1791 23.6579V30.4934C10.1791 31.3095 10.8405 31.9708 11.6566 31.9708C12.4726 31.9708 13.134 31.3095 13.134 30.4934V23.6579Z';

// Tip of the pin in the original 23x33 viewBox — rotation pivot
const TIP_X = 11.65;
const TIP_Y = 32;

/**
 * Generate SVG pin markup with dynamic color
 */
export function createPinSvg(color: string, options: MarkerOptions = {}): string {
  const { isEditing = false, isSelected = false } = options;

  const svgContent = `
    <svg width="23" height="33" viewBox="0 0 23 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="${PIN_PATH}" fill="${color}" stroke="black" stroke-linecap="round"/>
    </svg>
  `;

  // Wrap in glow wrapper if editing or selected
  if (isEditing || isSelected) {
    return `<div class="glow-wrapper">${svgContent}</div>`;
  }

  return svgContent;
}

// Color palette for cluster pin variation — each cluster picks 3 in a shifted order
const CLUSTER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

// Simple hash from cluster lat/lng to get a deterministic seed per cluster
function clusterSeed(cluster: any): number {
  const ll = cluster.getLatLng();
  const raw = Math.abs(ll.lat * 1000 + ll.lng * 7000);
  return Math.floor(raw) % 1000;
}

/**
 * Build the cluster icon: 3 pin silhouettes fanned around their shared tip,
 * with a count badge on top. Each cluster gets a unique variation.
 */
export function createClusterIcon(L: any, cluster: any): any {
  const count = cluster.getChildCount();
  const seed = clusterSeed(cluster);

  // Pick 3 colors offset by seed
  const c0 = seed % CLUSTER_COLORS.length;
  const colors = [
    CLUSTER_COLORS[c0],
    CLUSTER_COLORS[(c0 + 2) % CLUSTER_COLORS.length],
    CLUSTER_COLORS[(c0 + 4) % CLUSTER_COLORS.length],
  ];

  // Base rotations with per-cluster jitter (±8° on each pin)
  const jitter = (n: number) => ((seed * n) % 17) - 8; // -8 to +8
  const pinsConfig = [
    { deg: -35 + jitter(3),  scale: 0.86 + (seed % 5) * 0.01,  color: colors[0] },
    { deg:  25 + jitter(7),  scale: 0.90 + (seed % 4) * 0.01,  color: colors[1] },
    { deg:  -5 + jitter(13), scale: 1.0,                        color: colors[2] },
  ];

  const pins = pinsConfig.map(({ deg, scale, color }) =>
    `<g transform="rotate(${deg} ${TIP_X} ${TIP_Y}) translate(${TIP_X} ${TIP_Y}) scale(${scale}) translate(${-TIP_X} ${-TIP_Y})">
      <path d="${PIN_PATH}" fill="${color}" stroke="black" stroke-width="${0.8 / scale}" stroke-linecap="round"/>
    </g>`
  ).join('');

  const badge = `
    <circle cx="${TIP_X}" cy="2" r="7.5" fill="white" stroke="black" stroke-width="0.8"/>
    <text x="${TIP_X}" y="2" text-anchor="middle" dominant-baseline="central"
          font-size="8.5" font-weight="bold" font-family="sans-serif" fill="#333">${count}</text>`;

  const svg = `<svg width="56" height="50" viewBox="-16 -7 52 42" xmlns="http://www.w3.org/2000/svg">${pins}${badge}</svg>`;

  return L.divIcon({
    className: 'cluster-icon',
    html: svg,
    iconSize: [56, 50],
    iconAnchor: [28, 48]
  });
}

/**
 * Create a Leaflet marker with custom pin icon
 */
export function createPinMarker(
  L: any,
  lat: number,
  lng: number,
  color: string,
  options: MarkerOptions = {}
): any {
  const { isEditing = false, isSelected = false } = options;

  const pinSvg = createPinSvg(color, options);

  const className = isEditing || isSelected
    ? 'object-marker editing-pin'
    : 'object-marker';

  return L.marker([lat, lng], {
    icon: L.divIcon({
      className,
      html: pinSvg,
      iconSize: [23, 33],
      iconAnchor: [11, 33]
    })
  });
}

/**
 * Create click handler for pin markers
 * Handles pan-to-center logic and detail panel opening
 */
export function createPinClickHandler(
  L: any,
  map: any,
  mapContainer: HTMLElement,
  obj: MapObject,
  lat: number,
  lng: number,
  onPinClick?: (obj: MapObject) => void,
  setPanCallback?: (callback: () => void) => void
): (e: any) => void {
  return (e: any) => {
    if (!onPinClick) return;

    // Prevent default popup behavior
    L.DomEvent.stopPropagation(e);

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
    if (setPanCallback) {
      setPanCallback(doPan);
    }

    // Open detail panel (parent will call doPan after panel is in DOM)
    onPinClick(obj);
  };
}

/**
 * Update all markers on the map using a MarkerClusterGroup
 * Clears existing markers/cluster and recreates them
 */
export function updateMapMarkers(
  L: any,
  map: any,
  mapContainer: HTMLElement,
  objects: MapObject[],
  markers: any[],
  editingObjectId: string | null,
  tags?: Tag[],
  fields?: Field[],
  onPinClick?: (obj: MapObject) => void,
  setPanCallback?: (callback: () => void) => void,
  existingClusterGroup?: any
): { markers: any[]; clusterGroup: any } {
  // Remove old cluster group (which removes all its markers from the map)
  if (existingClusterGroup) {
    map.removeLayer(existingClusterGroup);
  }
  // Also remove any individually-added markers (backward compat / first load)
  markers.forEach(marker => map.removeLayer(marker));

  const newMarkers: any[] = [];

  // Create cluster group if the plugin is available
  const hasCluster = typeof L.markerClusterGroup === 'function';
  const clusterGroup = hasCluster
    ? L.markerClusterGroup({
        maxClusterRadius: 35,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => createClusterIcon(L, cluster)
      })
    : null;

  // Add markers for objects with valid location
  objects.forEach(obj => {
    if (obj.location && obj.location.coordinates && obj.location.coordinates.length === 2) {
      const [lng, lat] = obj.location.coordinates;
      const isEditing = editingObjectId === obj.id;
      const pinColor = getPinColor(obj, tags, fields);

      const marker = createPinMarker(L, lat, lng, pinColor, { isEditing });

      // Add click handler
      const clickHandler = createPinClickHandler(
        L, map, mapContainer, obj, lat, lng, onPinClick, setPanCallback
      );
      marker.on('click', clickHandler);

      if (clusterGroup) {
        clusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
      }

      newMarkers.push(marker);
    }
  });

  if (clusterGroup) {
    map.addLayer(clusterGroup);
  }

  return { markers: newMarkers, clusterGroup };
}

/**
 * Create or update the selected position marker
 */
export function updateSelectedMarker(
  L: any,
  map: any,
  selectedCoordinates: { lat: number; lng: number } | null,
  currentMarker: any | null
): any | null {
  // Remove old marker if exists
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  if (!selectedCoordinates) {
    return null;
  }

  // Create new marker at selected coordinates with red color and glow
  const selectedPinSvg = createPinSvg('#FF0000', { isSelected: true });

  return L.marker([selectedCoordinates.lat, selectedCoordinates.lng], {
    icon: L.divIcon({
      className: 'selected-marker editing-pin',
      html: selectedPinSvg,
      iconSize: [23, 33],
      iconAnchor: [11, 33]
    })
  }).addTo(map);
}
