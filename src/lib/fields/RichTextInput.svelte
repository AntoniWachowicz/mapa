<script lang="ts">
  import type { RichTextConfig } from '../types.js';

  interface Props {
    value: string;
    config?: RichTextConfig;
    required?: boolean;
    oninput: (value: string) => void;
  }

  const { value = '', config, required = false, oninput }: Props = $props();

  const maxLength = config?.maxLength || 5000;
  const charCount = $derived(value?.length || 0);
</script>

<div class="richtext-input-container">
  <textarea
    value={value}
    oninput={(e) => oninput(e.currentTarget.value)}
    maxlength={maxLength}
    required={required}
    rows="6"
    class="richtext-textarea"
    placeholder="Wprowadź tekst..."
  ></textarea>
  <div class="char-counter">
    {charCount} / {maxLength}
  </div>
</div>

<style>
  .richtext-input-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .richtext-textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
  }

  .richtext-textarea:focus {
    outline: none;
    border-color: #007acc;
  }

  .char-counter {
    font-size: 12px;
    color: #666;
    text-align: right;
  }
</style>
