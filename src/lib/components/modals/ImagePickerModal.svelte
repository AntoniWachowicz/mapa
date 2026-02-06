<script lang="ts">
  /**
   * ImagePickerModal
   * Modal for selecting images from the gallery to add to a field.
   */
  import Modal from './Modal.svelte';
  import Icon from '$lib/Icon.svelte';

  interface ImageData {
    id: string;
    url: string;
    originalName: string;
  }

  interface Props {
    open: boolean;
    availableImages: ImageData[];
    selectedImageIds: Set<string>;
    onclose: () => void;
    onadd: () => void;
    ontoggle: (imageId: string) => void;
  }

  const {
    open,
    availableImages,
    selectedImageIds,
    onclose,
    onadd,
    ontoggle
  }: Props = $props();
</script>

<Modal {open} title="Wybierz zdjęcia z galerii" {onclose} maxWidth="900px">
  {#if availableImages.length === 0}
    <p class="no-images">Brak dostępnych zdjęć w galerii. Prześlij nowe zdjęcia, aby je dodać.</p>
  {:else}
    <div class="image-grid" role="listbox" aria-label="Dostępne zdjęcia">
      {#each availableImages as image}
        <div
          class="image-card"
          class:selected={selectedImageIds.has(image.id)}
          onclick={() => ontoggle(image.id)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), ontoggle(image.id))}
          role="option"
          aria-selected={selectedImageIds.has(image.id)}
          tabindex="0"
        >
          <img src={image.url} alt={image.originalName} />
          <div class="image-info">
            <span class="image-name">{image.originalName}</span>
          </div>
          {#if selectedImageIds.has(image.id)}
            <div class="selected-indicator">
              <Icon name="Checkmark" size={20} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#snippet footer()}
    <button type="button" onclick={onclose} class="cancel-btn">
      Anuluj
    </button>
    <button
      type="button"
      onclick={onadd}
      class="add-btn"
      disabled={selectedImageIds.size === 0}
    >
      Dodaj wybrane ({selectedImageIds.size})
    </button>
  {/snippet}
</Modal>

<style>
  .no-images {
    padding: 40px 20px;
    text-align: center;
    color: #666;
    font-size: 14px;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
    padding: 16px 0;
  }

  .image-card {
    position: relative;
    border: 2px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }

  .image-card:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .image-card.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .image-card img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    display: block;
  }

  .image-info {
    padding: 8px;
    background: white;
  }

  .image-name {
    font-size: 12px;
    color: #333;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .selected-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .cancel-btn {
    padding: 8px 16px;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .cancel-btn:hover {
    background: #4b5563;
  }

  .add-btn {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .add-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .add-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style>
