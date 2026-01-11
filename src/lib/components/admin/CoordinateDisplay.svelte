<script lang="ts">
  /**
   * Coordinate Display Overlay Component
   * Displays a draggable corner coordinate input for map bounds configuration
   */

  interface Props {
    label: 'SW' | 'NE' | 'NW' | 'SE';
    x: number;
    y: number;
    transform: string;
    lat: number;
    lng: number;
    disabled?: boolean;
    onLatChange: (value: number) => void;
    onLngChange: (value: number) => void;
  }

  const {
    label,
    x,
    y,
    transform,
    lat,
    lng,
    disabled = false,
    onLatChange,
    onLngChange
  }: Props = $props();
</script>

<div
  class="coordinate-overlay"
  style="left: {x}px; top: {y}px; transform: {transform};"
>
  <div class="coord-display">
    <div class="coord-label">{label}</div>
    <div class="coord-value">
      <input
        type="number"
        step="0.000001"
        value={lat}
        oninput={(e) => onLatChange(Number((e.target as HTMLInputElement).value))}
        class="coord-input"
        disabled={disabled}
      >
    </div>
    <div class="coord-value">
      <input
        type="number"
        step="0.000001"
        value={lng}
        oninput={(e) => onLngChange(Number((e.target as HTMLInputElement).value))}
        class="coord-input"
        disabled={disabled}
      >
    </div>
  </div>
</div>
