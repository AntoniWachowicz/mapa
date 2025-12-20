/**
 * Table Resize Feature Module
 * Public API for table column resizing functionality.
 */

// Re-export resize functions
export {
  calculateContentBasedWidth,
  calculateInitialWidths,
  initResizeCallbacks,
  startResize,
  getIsResizing
} from './columnResizer.svelte.js';
