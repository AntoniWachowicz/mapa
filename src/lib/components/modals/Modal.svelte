<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import '$lib/styles/modal.css';
  import type { Snippet } from 'svelte';

  interface Props {
    /** Whether the modal is open */
    open?: boolean;
    /** Modal title */
    title?: string;
    /** Show close button in header */
    showCloseButton?: boolean;
    /** Close on overlay click */
    closeOnOverlayClick?: boolean;
    /** Close on escape key */
    closeOnEscape?: boolean;
    /** Custom z-index */
    zIndex?: number;
    /** Custom padding */
    padding?: string;
    /** Custom max width */
    maxWidth?: string;
    /** Custom max height */
    maxHeight?: string;
    /** Additional CSS class for modal content */
    class?: string;
    /** Event handler for close */
    onclose?: () => void;
    /** Default slot content */
    children?: Snippet;
    /** Footer slot content */
    footer?: Snippet;
  }

  const {
    open = true,
    title,
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    zIndex = 1000,
    padding = '0',
    maxWidth = '90vw',
    maxHeight = '90vh',
    class: className = '',
    onclose,
    children,
    footer
  }: Props = $props();

  function handleOverlayClick() {
    if (closeOnOverlayClick && onclose) {
      onclose();
    }
  }

  function handleEscapeKey(e: KeyboardEvent) {
    if (closeOnEscape && e.key === 'Escape' && onclose) {
      onclose();
    }
  }

  function handleContentClick(e: MouseEvent) {
    // Prevent overlay click from closing when clicking content
    e.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleEscapeKey} />

{#if open}
  <div
    class="modal-overlay"
    onclick={handleOverlayClick}
    style:--modal-z-index={zIndex}
    style:--modal-padding={padding}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
  >
    <div
      class="modal-content {className}"
      onclick={handleContentClick}
      style:--modal-max-width={maxWidth}
      style:--modal-max-height={maxHeight}
    >
      {#if title || showCloseButton}
        <div class="modal-header">
          {#if title}
            <h2 id="modal-title" class="modal-title">{title}</h2>
          {/if}
          {#if showCloseButton && onclose}
            <button
              type="button"
              class="modal-close-btn"
              onclick={onclose}
              aria-label="Zamknij"
            >
              <Icon name="Close" size={20} />
            </button>
          {/if}
        </div>
      {/if}

      <div class="modal-body">
        {@render children?.()}
      </div>

      {#if footer}
        <div class="modal-footer">
          {@render footer?.()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .modal-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: color 0.15s;
    border-radius: 4px;
  }

  .modal-close-btn:hover {
    color: #111827;
    background: #f3f4f6;
  }

  .modal-body {
    padding: 20px;
    overflow: auto;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
  }
</style>
