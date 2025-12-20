/**
 * Table Column Resizer
 * Manages column resizing with requestAnimationFrame for smooth performance.
 * Uses Svelte 5 runes for reactive state management.
 */

import type { SavedObject } from '$lib/types.js';

// Resize state using Svelte 5 runes
let isResizing = $state(false);
let resizeStartX = $state(0);
let resizeLeftColumn = $state('');
let resizeInitialLeftWidth = $state(0);
let resizeRAF = $state<number | null>(null);
let pendingMouseX = $state<number | null>(null);

// Callbacks for updating external state
let onWidthChange: ((key: string, width: number) => void) | null = null;
let onResizeComplete: ((columnKey: string) => void) | null = null;
let onPreventClick: (() => void) | null = null;

/**
 * Get current column widths
 */
export function getCurrentWidths(): Record<string, number> {
  // This will be managed externally in the component
  return {};
}

/**
 * Check if currently resizing
 */
export function getIsResizing(): boolean {
  return isResizing;
}

/**
 * Calculate content-based width for a column
 * @param field - The field configuration
 * @param objects - Sample objects to measure content
 * @param formatValue - Function to format cell values for measurement
 * @returns Width in pixels
 */
export function calculateContentBasedWidth(
  field: any,
  objects: SavedObject[],
  formatValue: (field: any, value: any) => string
): number {
  const MAX_WIDTH_CH = 25; // Max width for columns
  const MIN_WIDTH_PX = 100; // Minimum width
  const PADDING_CH = 2; // Extra space for padding/breathing room
  const SAMPLE_SIZE = 100; // Only sample first 100 rows for performance
  const MAX_HEADER_WIDTH_CH = 15; // Allow headers longer than this to wrap

  // Calculate header width (field name + type)
  const headerText = `${field.name || field.key} (${field.type})`;
  // Don't force long headers to fit on one line - allow them to wrap
  const headerLength = Math.min(headerText.length, MAX_HEADER_WIDTH_CH);
  let maxContentLength = headerLength;

  // Sample only first N objects for performance
  const sampleObjects = objects.slice(0, SAMPLE_SIZE);

  sampleObjects.forEach(obj => {
    const value = obj.data[field.key];
    if (!value) return;

    // Get text representation of the field value
    const textValue = formatValue(field, value);
    if (textValue && textValue !== '—') {
      // For multi-line fields, use the longest line
      const lines = String(textValue).split('\n');
      const longestLine = Math.max(...lines.map(line => line.length));
      maxContentLength = Math.max(maxContentLength, longestLine);
    }
  });

  // Calculate width in ch, apply max constraint
  const widthInCh = Math.min(maxContentLength + PADDING_CH, MAX_WIDTH_CH);

  // Convert ch to pixels (approximate: 1ch ≈ 8px in Space Mono)
  const widthInPx = widthInCh * 8;

  // Apply minimum constraint
  return Math.max(widthInPx, MIN_WIDTH_PX);
}

/**
 * Calculate initial widths for all columns
 * @param fields - Array of field definitions
 * @param objects - Objects to measure
 * @param formatValue - Function to format cell values
 * @returns Record mapping field keys to widths in pixels
 */
export function calculateInitialWidths(
  fields: any[],
  objects: SavedObject[],
  formatValue: (field: any, value: any) => string
): Record<string, number> {
  const widths: Record<string, number> = {};

  fields
    .filter(f => f.visible && f.type !== 'location' && f.fieldType !== 'location')
    .forEach(field => {
      widths[field.key] = calculateContentBasedWidth(field, objects, formatValue);
    });

  return widths;
}

/**
 * Initialize resize system with callbacks
 */
export function initResizeCallbacks(callbacks: {
  onWidthChange: (key: string, width: number) => void;
  onResizeComplete: (columnKey: string) => void;
  onPreventClick: () => void;
}) {
  onWidthChange = callbacks.onWidthChange;
  onResizeComplete = callbacks.onResizeComplete;
  onPreventClick = callbacks.onPreventClick;
}

/**
 * Handle mouse move during resize
 */
function handleResize(e: MouseEvent) {
  if (!isResizing || !resizeLeftColumn) return;

  e.preventDefault();
  pendingMouseX = e.pageX;

  if (resizeRAF !== null) return;

  resizeRAF = requestAnimationFrame(() => {
    if (pendingMouseX === null) {
      resizeRAF = null;
      return;
    }

    const deltaX = pendingMouseX - resizeStartX;

    // Calculate new width for left column only - right columns get pushed
    const newLeftWidth = Math.round(resizeInitialLeftWidth + deltaX);

    // Only proceed if column remains above minimum width
    if (newLeftWidth >= 100) {
      if (onWidthChange) {
        onWidthChange(resizeLeftColumn, newLeftWidth);
      }
    }

    resizeRAF = null;
    pendingMouseX = null;
  });
}

/**
 * Stop resizing
 */
function stopResize(e: MouseEvent) {
  e.preventDefault();
  isResizing = false;

  // Set flag to prevent click events from triggering sort immediately after resize
  if (onPreventClick) {
    onPreventClick();
  }

  // Mark only the left column as manually resized
  if (resizeLeftColumn && onResizeComplete) {
    onResizeComplete(resizeLeftColumn);
  }

  resizeLeftColumn = '';
  resizeInitialLeftWidth = 0;
  pendingMouseX = null;
  if (resizeRAF !== null) {
    cancelAnimationFrame(resizeRAF);
    resizeRAF = null;
  }
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

/**
 * Start column resize operation
 * @param e - Mouse event
 * @param leftFieldKey - Key of the column being resized
 * @param currentWidth - Current width of the column
 */
export function startResize(e: MouseEvent, leftFieldKey: string, currentWidth: number) {
  e.preventDefault();
  e.stopPropagation();
  isResizing = true;
  resizeStartX = e.pageX;
  resizeLeftColumn = leftFieldKey;
  resizeInitialLeftWidth = currentWidth;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}
