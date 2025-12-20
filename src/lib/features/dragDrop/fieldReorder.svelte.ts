/**
 * Field Reorder Module
 * Manages drag-and-drop state and logic for reordering fields in the schema builder.
 * Uses Svelte 5 runes for reactive state management.
 */

// Drag state
let draggedFieldIndex = $state<number | null>(null);
let dragOverIndex = $state<number | null>(null);

/**
 * Get current dragged field index
 */
export function getDraggedFieldIndex(): number | null {
  return draggedFieldIndex;
}

/**
 * Get current drag over index
 */
export function getDragOverIndex(): number | null {
  return dragOverIndex;
}

/**
 * Start dragging a field
 */
export function startDrag(event: DragEvent, index: number): void {
  draggedFieldIndex = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', '');
  }
}

/**
 * Handle drag over event
 */
export function handleDragOver(event: DragEvent, index: number): void {
  event.preventDefault();
  dragOverIndex = index;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

/**
 * Handle drag leave event
 */
export function handleDragLeave(): void {
  dragOverIndex = null;
}

/**
 * Handle drop event and reorder fields
 * Returns new fields array if drop was valid, null otherwise
 */
export function handleDrop<T>(
  event: DragEvent,
  dropIndex: number,
  fields: T[],
  canMoveSource: (field: T) => boolean,
  canMoveTarget: (field: T) => boolean
): T[] | null {
  event.preventDefault();

  if (draggedFieldIndex === null || draggedFieldIndex === dropIndex) {
    draggedFieldIndex = null;
    dragOverIndex = null;
    return null;
  }

  const draggedField = fields[draggedFieldIndex];
  const targetField = fields[dropIndex];

  // Check if move is allowed
  if (!canMoveTarget(targetField) || !canMoveSource(draggedField)) {
    draggedFieldIndex = null;
    dragOverIndex = null;
    return null;
  }

  // Create new array with moved field
  const newFields = [...fields];
  const [movedField] = newFields.splice(draggedFieldIndex, 1);
  newFields.splice(dropIndex, 0, movedField);

  draggedFieldIndex = null;
  dragOverIndex = null;

  return newFields;
}

/**
 * Reset drag state
 */
export function resetDragState(): void {
  draggedFieldIndex = null;
  dragOverIndex = null;
}
