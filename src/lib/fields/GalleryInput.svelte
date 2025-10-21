<script lang="ts">
  import type { GalleryData, GalleryConfig, GalleryItem } from '../types.js';
  import Icon from '../Icon.svelte';

  interface Props {
    value: GalleryData;
    config?: GalleryConfig;
    required?: boolean;
    oninput: (value: GalleryData) => void;
  }

  const {
    value = { items: [] },
    config = { displayStyle: 'grid', allowImages: true, allowVideos: true, maxItems: 10 },
    required = false,
    oninput
  }: Props = $props();

  let videoUrl = $state('');
  let imageUrl = $state('');
  let isUploading = $state(false);
  let showImagePicker = $state(false);
  let availableImages = $state<any[]>([]);
  let selectedImageIds = $state<Set<string>>(new Set());

  function addImageFromUrl() {
    if (!imageUrl.trim()) return;

    const newItem: GalleryItem = {
      id: `image_url_${Date.now()}`,
      type: 'image',
      url: imageUrl.trim(),
      caption: '',
      order: value.items.length
    };

    oninput({
      ...value,
      items: [...value.items, newItem]
    });

    imageUrl = '';
  }

  function addVideoEmbed() {
    if (!videoUrl.trim()) return;

    // Detect video type
    let embedType: 'youtube' | 'vimeo' | undefined;
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      embedType = 'youtube';
    } else if (videoUrl.includes('vimeo.com')) {
      embedType = 'vimeo';
    }

    const newItem: GalleryItem = {
      id: `video_${Date.now()}`,
      type: 'video',
      url: videoUrl,
      embedType,
      order: value.items.length
    };

    oninput({
      ...value,
      items: [...value.items, newItem]
    });

    videoUrl = '';
  }

  function removeItem(itemId: string) {
    const newItems = value.items
      .filter(item => item.id !== itemId)
      .map((item, i) => ({ ...item, order: i }));

    oninput({ ...value, items: newItems });
  }

  function updateCaption(itemId: string, caption: string) {
    const newItems = value.items.map(item =>
      item.id === itemId ? { ...item, caption } : item
    );
    oninput({ ...value, items: newItems });
  }

  async function handleImageSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    isUploading = true;

    try {
      const formData = new FormData();

      // Add all selected files
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      const response = await fetch('/api/gallery-upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.images) {
        // Add uploaded images to gallery
        const newItems: GalleryItem[] = result.images.map((img: any, index: number) => ({
          id: img.id,
          type: 'image' as const,
          url: img.url,
          caption: '',
          order: value.items.length + index
        }));

        oninput({
          ...value,
          items: [...value.items, ...newItems]
        });
      } else {
        alert('Błąd podczas przesyłania obrazów');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Błąd podczas przesyłania obrazów');
    } finally {
      isUploading = false;
      input.value = '';
    }
  }

  async function openImagePicker() {
    showImagePicker = true;
    selectedImageIds = new Set();

    // Fetch available images
    try {
      const response = await fetch('/api/gallery-images');
      const result = await response.json();

      if (result.success) {
        availableImages = result.images;
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  }

  function toggleImageSelection(imageId: string) {
    if (selectedImageIds.has(imageId)) {
      selectedImageIds.delete(imageId);
    } else {
      selectedImageIds.add(imageId);
    }
    selectedImageIds = new Set(selectedImageIds);
  }

  function addSelectedImages() {
    const imagesToAdd = availableImages.filter(img => selectedImageIds.has(img.id));

    const newItems: GalleryItem[] = imagesToAdd.map((img, index) => ({
      id: img.id,
      type: 'image' as const,
      url: img.url,
      caption: '',
      order: value.items.length + index
    }));

    oninput({
      ...value,
      items: [...value.items, ...newItems]
    });

    showImagePicker = false;
    selectedImageIds = new Set();
  }

  function getYouTubeEmbedUrl(url: string): string {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  function getVimeoEmbedUrl(url: string): string {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }
</script>

<div class="gallery-container">
  {#if config.allowImages}
    <div class="image-upload-section">
      <input
        type="file"
        accept="image/*"
        multiple
        onchange={handleImageSelect}
        class="file-input"
        id="image-upload"
        disabled={isUploading}
      />
      <label for="image-upload" class="upload-label" class:disabled={isUploading}>
        <Icon name="Document" size={16} />
        {isUploading ? 'Przesyłanie...' : 'Dodaj zdjęcia z komputera'}
      </label>

      <button
        type="button"
        onclick={openImagePicker}
        class="picker-btn"
        disabled={isUploading}
      >
        <Icon name="Field" size={16} />
        Wybierz z galerii
      </button>
    </div>

    <div class="image-url-section">
      <input
        type="url"
        bind:value={imageUrl}
        placeholder="Link do zdjęcia (https://...)"
        class="image-url-input"
        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageFromUrl())}
      />
      <button
        type="button"
        onclick={addImageFromUrl}
        class="add-image-btn"
        disabled={!imageUrl.trim()}
      >
        + Dodaj zdjęcie z URL
      </button>
    </div>
  {/if}

  {#if config.allowVideos}
    <div class="video-embed-section">
      <input
        type="url"
        bind:value={videoUrl}
        placeholder="Link do filmu YouTube lub Vimeo"
        class="video-url-input"
        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideoEmbed())}
      />
      <button
        type="button"
        onclick={addVideoEmbed}
        class="add-video-btn"
        disabled={!videoUrl.trim()}
      >
        + Dodaj film
      </button>
    </div>
  {/if}

  {#if value.items.length > 0}
    <div class="gallery-preview style-{config.displayStyle}">
      {#each value.items as item}
        <div class="gallery-item">
          {#if item.type === 'video'}
            <div class="video-wrapper">
              {#if item.embedType === 'youtube'}
                <iframe
                  src={getYouTubeEmbedUrl(item.url)}
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  title="YouTube video"
                ></iframe>
              {:else if item.embedType === 'vimeo'}
                <iframe
                  src={getVimeoEmbedUrl(item.url)}
                  frameborder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowfullscreen
                  title="Vimeo video"
                ></iframe>
              {:else}
                <div class="unknown-video">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    Otwórz film
                  </a>
                </div>
              {/if}
            </div>
          {:else}
            <img src={item.url} alt={item.caption || ''} />
          {/if}

          <div class="item-controls">
            <input
              type="text"
              value={item.caption || ''}
              oninput={(e) => updateCaption(item.id, e.currentTarget.value)}
              placeholder="Podpis (opcjonalnie)"
              class="caption-input"
            />
            <button
              type="button"
              onclick={() => removeItem(item.id)}
              class="remove-btn"
            >
              ✕
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Image Picker Modal -->
{#if showImagePicker}
  <div class="modal-overlay" onclick={() => showImagePicker = false}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Wybierz zdjęcia z galerii</h3>
        <button type="button" onclick={() => showImagePicker = false} class="close-btn">
          <Icon name="Close" size={20} />
        </button>
      </div>

      <div class="modal-body">
        {#if availableImages.length === 0}
          <p class="no-images">Brak dostępnych zdjęć w galerii. Prześlij nowe zdjęcia, aby je dodać.</p>
        {:else}
          <div class="image-grid">
            {#each availableImages as image}
              <div
                class="image-card"
                class:selected={selectedImageIds.has(image.id)}
                onclick={() => toggleImageSelection(image.id)}
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
      </div>

      <div class="modal-footer">
        <button type="button" onclick={() => showImagePicker = false} class="cancel-btn">
          Anuluj
        </button>
        <button
          type="button"
          onclick={addSelectedImages}
          class="add-btn"
          disabled={selectedImageIds.size === 0}
        >
          Dodaj wybrane ({selectedImageIds.size})
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .gallery-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .file-input {
    display: none;
  }

  .image-upload-section {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .upload-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #000000;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .upload-label:hover:not(.disabled) {
    background: #1a1a1a;
  }

  .upload-label.disabled {
    background: #999;
    cursor: not-allowed;
  }

  .picker-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .picker-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .picker-btn:disabled {
    background: #999;
    cursor: not-allowed;
  }

  .info-text {
    font-size: 12px;
    color: #999;
  }

  .image-url-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .image-url-input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }

  .image-url-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .add-image-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
    transition: all 0.2s;
    width: 100%;
  }

  .add-image-btn:hover:not(:disabled) {
    background: #059669;
  }

  .add-image-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .video-embed-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .video-url-input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .video-url-input:focus {
    outline: none;
    border-color: #007acc;
  }

  .add-video-btn {
    background: #000000;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
  }

  .add-video-btn:hover:not(:disabled) {
    background: #1a1a1a;
  }

  .add-video-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .gallery-preview {
    display: grid;
    gap: 16px;
  }

  .gallery-preview.style-carousel {
    grid-template-columns: 1fr;
  }

  .gallery-preview.style-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .gallery-preview.style-masonry {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px;
  }

  .gallery-item img {
    width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .video-wrapper {
    position: relative;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    height: 0;
    overflow: hidden;
  }

  .video-wrapper iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }

  .unknown-video {
    padding: 40px;
    background: #f5f5f5;
    text-align: center;
    border-radius: 4px;
  }

  .item-controls {
    display: flex;
    gap: 8px;
  }

  .caption-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }

  .caption-input:focus {
    outline: none;
    border-color: #007acc;
  }

  .remove-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    background: #b91c1c;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 90vw;
    max-height: 90vh;
    width: 900px;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #9ca3af;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    padding: 24px;
    flex: 1;
    overflow: auto;
  }

  .no-images {
    text-align: center;
    color: #6b7280;
    padding: 40px 20px;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }

  .image-card {
    position: relative;
    border: 2px solid #e5e7eb;
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
    border-width: 3px;
  }

  .image-card img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    display: block;
  }

  .image-info {
    padding: 8px;
    background: #f9fafb;
  }

  .image-name {
    font-size: 12px;
    color: #374151;
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
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .cancel-btn {
    background: #e5e7eb;
    color: #374151;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover {
    background: #d1d5db;
  }

  .add-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .add-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .add-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
  }
</style>
