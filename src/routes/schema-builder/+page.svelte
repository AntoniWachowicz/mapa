<script lang="ts">
  import SchemaBuilder from '$lib/SchemaBuilder.svelte';
  import SchemaPreview from '$lib/SchemaPreview.svelte';
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

    <div class="preview-panel">
      <SchemaPreview {template} />
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

  .preview-panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-light);
    overflow: hidden;
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