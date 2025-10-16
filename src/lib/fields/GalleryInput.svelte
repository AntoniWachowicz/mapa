<script lang="ts">
  import type { GalleryData, GalleryConfig, GalleryItem } from '../types.js';

  interface Props {
    value: GalleryData;
    config: GalleryConfig;
    required?: boolean;
    oninput: (value: GalleryData) => void;
  }

  const { value = { items: [] }, config, required = false, oninput }: Props = $props();

  let videoUrl = $state('');

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
    if (!files) return;

    // TODO: Upload images (will need upload endpoint)
    // For now, just create placeholder items
    alert('Przesyłanie obrazów będzie dostępne wkrótce. Na razie można dodawać tylko filmy przez URL.');

    input.value = '';
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
      />
      <label for="image-upload" class="upload-label">
        🖼️ Dodaj zdjęcia
      </label>
      <span class="info-text">(dostępne wkrótce)</span>
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
  }

  .upload-label {
    display: inline-block;
    padding: 8px 16px;
    background: #007acc;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .upload-label:hover {
    background: #005a9e;
  }

  .info-text {
    font-size: 12px;
    color: #999;
  }

  .video-embed-section {
    display: flex;
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
    background: #007acc;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }

  .add-video-btn:hover:not(:disabled) {
    background: #005a9e;
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
</style>
