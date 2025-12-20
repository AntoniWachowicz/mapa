/**
 * Drag-Drop Feature Module
 * Public API for field reordering via drag-and-drop
 */

export {
  getDraggedFieldIndex,
  getDragOverIndex,
  startDrag,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  resetDragState
} from './fieldReorder.svelte.js';
