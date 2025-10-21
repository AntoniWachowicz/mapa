<script lang="ts">
  import type { LinkData, LinksConfig } from '../types.js';

  interface Props {
    value: LinkData[];
    config?: LinksConfig;
    required?: boolean;
    oninput: (value: LinkData[]) => void;
  }

  const { value = [], config, required = false, oninput }: Props = $props();

  const maxLinks = config?.maxLinks || 10;

  function addLink() {
    if (value.length < maxLinks) {
      const newLinks = [...value, { text: '', url: '', order: value.length }];
      oninput(newLinks);
    }
  }

  function removeLink(index: number) {
    const newLinks = value.filter((_, i) => i !== index)
      .map((link, i) => ({ ...link, order: i }));
    oninput(newLinks);
  }

  function updateLink(index: number, field: 'text' | 'url', newValue: string) {
    const newLinks = [...value];
    newLinks[index] = { ...newLinks[index], [field]: newValue };
    oninput(newLinks);
  }
</script>

<div class="links-input-container">
  {#each value as link, i}
    <div class="link-row">
      <div class="link-inputs">
        <input
          type="text"
          value={link.text}
          oninput={(e) => updateLink(i, 'text', e.currentTarget.value)}
          placeholder="Tekst linku"
          class="link-text"
        />
        <input
          type="url"
          value={link.url}
          oninput={(e) => updateLink(i, 'url', e.currentTarget.value)}
          placeholder="URL"
          class="link-url"
        />
      </div>
      <div class="link-actions">
        <button
          type="button"
          onclick={() => removeLink(i)}
          class="remove-btn"
        >
          ✕
        </button>
      </div>
    </div>
  {/each}

  {#if value.length < maxLinks}
    <button
      type="button"
      onclick={addLink}
      class="add-btn"
    >
      + Dodaj link
    </button>
  {/if}
</div>

<style>
  .links-input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .link-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
  }

  .link-inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .link-actions {
    display: flex;
    justify-content: flex-end;
  }

  .link-text,
  .link-url {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .link-text:focus,
  .link-url:focus {
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
  }

  .remove-btn:hover {
    background: #b91c1c;
  }

  .add-btn {
    background: #000000;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
  }

  .add-btn:hover {
    background: #1a1a1a;
  }
</style>
