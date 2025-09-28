<script lang="ts">
  import SchemaBuilder from '$lib/SchemaBuilder.svelte';
  import type { Template } from '$lib/types.js';

  interface PageData {
    template: Template;
  }

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  let template = $state<Template>(data.template);

  async function updateTemplate(newTemplate: Template): Promise<void> {
    template = newTemplate;
    const formData = new FormData();
    formData.set('template', JSON.stringify(template));

    await fetch('?/updateTemplate', {
      method: 'POST',
      body: formData
    });
  }
</script>

<svelte:head>
  <title>Schemat</title>
</svelte:head>

<div class="schema-container">
  <div class="schema-layout">
    <div class="builder-panel">
      <SchemaBuilder template={template} onUpdate={updateTemplate} />
    </div>

    <div class="placeholder-panel">
      <div class="placeholder-content">
        <div class="placeholder-icon">⚡</div>
        <h3>Przyszła funkcjonalność</h3>
        <p>Ten panel zostanie wypełniony w przyszłych aktualizacjach aplikacji.</p>
      </div>
    </div>
  </div>
</div>

<style>
  .schema-container {
    padding: var(--space-6);
    height: calc(100vh - var(--nav-height));
    max-width: var(--content-max-width);
    margin: 0 auto;
  }

  .schema-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    height: 100%;
  }

  .builder-panel {
    background: var(--color-background);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    padding: var(--space-6);
    overflow-y: auto;
  }

  .placeholder-panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .placeholder-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(0, 0, 0, 0.02) 10px,
      rgba(0, 0, 0, 0.02) 20px
    );
    border-radius: var(--radius-lg);
    pointer-events: none;
  }

  .placeholder-content {
    text-align: center;
    color: var(--color-text-muted);
    z-index: 1;
    position: relative;
  }

  .placeholder-icon {
    font-size: 3rem;
    margin-bottom: var(--space-4);
    opacity: 0.5;
  }

  .placeholder-content h3 {
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--space-2);
    color: var(--color-text-secondary);
  }

  .placeholder-content p {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    max-width: 300px;
    line-height: 1.6;
  }

  @media (max-width: 1024px) {
    .schema-layout {
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    .schema-container {
      padding: var(--space-4);
    }
  }
</style>