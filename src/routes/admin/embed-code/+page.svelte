<script lang="ts">
  import { browser } from '$app/environment';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();

  // Embed configuration
  let showList = $state(true);
  let embedWidth = $state('100%');
  let embedHeight = $state('600px');

  // Generated URLs and code
  const baseUrl = $derived(() => {
    if (!browser) return '';
    return `${window.location.protocol}//${window.location.host}`;
  });

  const embedUrl = $derived(() => {
    const url = new URL(`${baseUrl()}/embed`);
    if (data.tenantId) url.searchParams.set('t', data.tenantId);
    if (!showList) url.searchParams.set('showList', 'false');
    return url.toString();
  });

  const iframeCode = $derived(() => {
    return `<iframe
  src="${embedUrl()}"
  width="${embedWidth}"
  height="${embedHeight}"
  frameborder="0"
  style="border:0;"
  allowfullscreen>
</iframe>`;
  });

  async function copyToClipboard(text: string, messageId: string) {
    try {
      await navigator.clipboard.writeText(text);
      const messageEl = document.getElementById(messageId);
      if (messageEl) {
        messageEl.textContent = 'Skopiowano!';
        setTimeout(() => {
          messageEl.textContent = '';
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<svelte:head>
  <title>Kod do osadzenia - Admin</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>Generator kodu do osadzenia mapy</h1>
    <p class="subtitle">Skopiuj kod iframe, aby osadzić mapę na swojej stronie</p>
  </div>

  <div class="content">
    <div class="config-section">
      <h2>Konfiguracja</h2>

      <div class="config-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={showList} />
          <span>Pokaż listę pinezek</span>
        </label>
      </div>

      <div class="config-group">
        <label>
          <span class="label-text">Szerokość iframe:</span>
          <input type="text" bind:value={embedWidth} class="text-input" placeholder="np. 100%, 800px" />
        </label>

        <label>
          <span class="label-text">Wysokość iframe:</span>
          <input type="text" bind:value={embedHeight} class="text-input" placeholder="np. 600px, 80vh" />
        </label>
      </div>
    </div>

    <div class="preview-section">
      <h2>Podgląd</h2>
      <div class="preview-container" style="width: {embedWidth}; height: {embedHeight};">
        <iframe
          src={embedUrl()}
          title="Podgląd mapy"
          style="width: 100%; height: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-base);"
        ></iframe>
      </div>

      <div class="code-display">
        <h3>Bezpośredni URL:</h3>
        <div class="code-block">
          <code>{embedUrl()}</code>
          <button
            onclick={() => copyToClipboard(embedUrl(), 'url-message')}
            class="copy-btn"
            type="button"
          >
            Kopiuj
          </button>
        </div>
        <span id="url-message" class="copy-message"></span>
      </div>

      <div class="code-display">
        <h3>Kod HTML (iframe):</h3>
        <div class="code-block">
          <pre><code>{iframeCode()}</code></pre>
          <button
            onclick={() => copyToClipboard(iframeCode(), 'iframe-message')}
            class="copy-btn"
            type="button"
          >
            Kopiuj
          </button>
        </div>
        <span id="iframe-message" class="copy-message"></span>
      </div>

      <div class="instructions">
        <h3>Jak osadzić mapę?</h3>
        <p><strong>WordPress:</strong> Dodaj blok „Własny HTML" i wklej kod iframe.</p>
        <p><strong>Joomla:</strong> Utwórz moduł „Własny HTML" i wklej kod iframe.</p>
        <p><strong>Inne CMS:</strong> Wklej kod iframe w dowolnym miejscu, które obsługuje HTML.</p>
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-6);
    background: var(--color-background);
    min-height: calc(100vh - var(--nav-height));
  }

  .header {
    margin-bottom: var(--space-6);
  }

  .header h1 {
    font-size: var(--text-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-2) 0;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: var(--text-base);
    margin: 0;
  }

  .content {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: var(--space-6);
  }

  .config-section {
    background: var(--color-surface);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    height: fit-content;
  }

  .config-section h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
    color: var(--color-text-primary);
  }

  .config-group {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .config-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }

  label:last-child {
    margin-bottom: 0;
  }

  .label-text {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .text-input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: var(--color-background);
    transition: border-color var(--transition-fast);
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .preview-section h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    color: var(--color-text-primary);
  }

  .preview-container {
    border-radius: var(--radius-base);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 100%;
  }

  .code-display {
    background: var(--color-surface);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  .code-display h3 {
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    margin: 0 0 var(--space-2) 0;
    color: var(--color-text-primary);
  }

  .code-block {
    position: relative;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    padding: var(--space-3);
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: var(--text-sm);
    overflow-x: auto;
    margin-bottom: var(--space-2);
  }

  .code-block code,
  .code-block pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .copy-btn {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    padding: var(--space-1) var(--space-3);
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    transition: background var(--transition-fast);
  }

  .copy-btn:hover {
    background: var(--color-accent-hover);
  }

  .copy-message {
    display: inline-block;
    color: var(--color-success);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    min-height: 1.5em;
  }

  .instructions {
    background: var(--color-surface);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  .instructions h3 {
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    margin: 0 0 var(--space-3) 0;
    color: var(--color-text-primary);
  }

  .instructions p {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-2) 0;
    line-height: 1.5;
  }

  .instructions p:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 1200px) {
    .content {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: var(--space-4);
    }

    .preview-container {
      width: 100% !important;
    }
  }
</style>
