<script lang="ts">
  import type { Template, Field, CategoryFieldData, TagsFieldData } from './types.js';
  import { getSampleValue } from './sample-data.js';
  import Icon from './Icon.svelte';

  interface Props {
    template: Template;
  }

  const { template }: Props = $props();

  // Format field value for display
  function formatFieldValue(field: Field, value: any): string {
    if (!value && value !== 0 && value !== false) {
      return '—';
    }

    switch (field.type) {
      case 'currency':
        return `${value.toLocaleString('pl-PL')} PLN`;
      case 'percentage':
        return `${value}%`;
      case 'checkbox':
        return value ? 'Tak' : 'Nie';
      case 'date':
        try {
          return new Date(value).toLocaleDateString('pl-PL');
        } catch {
          return value;
        }
      case 'email':
        return value;
      case 'url':
        return value;
      case 'youtube':
        return 'Film YouTube';
      case 'image':
        return 'Obrazek';
      case 'number':
        return value.toLocaleString('pl-PL');
      default:
        return String(value);
    }
  }

  // Get sample data for field
  function getFieldSampleValue(field: Field): any {
    return getSampleValue(field.key, field.type);
  }

  // Check if field should be displayed in preview
  function shouldShowField(field: Field): boolean {
    return field.visible && field.key !== 'coordinates';
  }

  // Get visible fields in order
  let visibleFields = $derived(template.fields.filter(shouldShowField));
</script>

<div class="preview-container">
  <div class="preview-header">
    <h3>
      <Icon name="Eye" size={18} />
      Podgląd pinezki
    </h3>
    <p class="preview-subtitle">Tak będzie wyglądać pinezka z Twoim schematem</p>
  </div>

  {#if visibleFields.length === 0}
    <div class="empty-preview">
      <div class="empty-icon">📝</div>
      <p><strong>Brak pól do wyświetlenia</strong></p>
      <p>Dodaj pola do schematu po lewej stronie, aby zobaczyć podgląd pinezki.</p>
    </div>
  {:else}
    <div class="preview-pin">
      <!-- Pin Header with Title -->
      {#if visibleFields.find(f => f.key === 'title' || f.type === 'text')}
        {@const titleField = visibleFields.find(f => f.key === 'title' || f.type === 'text')}
        {#if titleField}
          <div class="pin-header">
            <h4 class="pin-title">
              {formatFieldValue(titleField, getFieldSampleValue(titleField))}
            </h4>
          </div>
        {/if}
      {/if}

      <!-- Main Content Fields -->
      <div class="pin-content">
        {#each visibleFields.filter(f => f.key !== 'title') as field}
          <div class="field-item" class:required={field.required}>
            <div class="field-header">
              <label class="field-label">
                {field.displayLabel || field.label}
                {#if field.required}
                  <span class="required-mark">*</span>
                {/if}
              </label>
            </div>

            <div class="field-value">
              {#if field.type === 'image'}
                <div class="image-preview">
                  <Icon name="Picture" size={16} />
                  <span>Obrazek: {field.displayLabel || field.label}</span>
                </div>
              {:else if field.type === 'youtube'}
                <div class="youtube-preview">
                  <Icon name="Video" size={16} />
                  <span>Film YouTube</span>
                </div>
              {:else if field.type === 'category'}
                {@const categoryValue = getFieldSampleValue(field)}
                <div class="tags-preview">
                  {#if categoryValue?.majorTag}
                    <span class="tag major-tag">Główny tag</span>
                  {/if}
                  {#if categoryValue?.minorTags?.length > 0}
                    {#each categoryValue.minorTags as tagId}
                      <span class="tag minor-tag">Tag {tagId}</span>
                    {/each}
                  {/if}
                </div>
              {:else if field.type === 'tags'}
                {@const tagsValue = getFieldSampleValue(field)}
                <div class="tags-preview simple-tags">
                  {#if field.tagConfig?.allowMultiple !== false}
                    <!-- Multiple selection mode -->
                    {#if tagsValue?.selectedTags?.length > 0}
                      {#each tagsValue.selectedTags as tagId}
                        <span class="tag simple-tag">{tagId}</span>
                      {/each}
                    {/if}
                  {:else}
                    <!-- Single selection mode -->
                    {#if tagsValue?.selectedTag}
                      <span class="tag simple-tag">{tagsValue.selectedTag}</span>
                    {/if}
                  {/if}
                </div>
              {:else if field.type === 'textarea'}
                <div class="textarea-preview">
                  {formatFieldValue(field, getFieldSampleValue(field))}
                </div>
              {:else if field.type === 'checkbox'}
                <div class="checkbox-preview">
                  <Icon name={getFieldSampleValue(field) ? 'Star' : 'Close'} size={14} />
                  <span>{formatFieldValue(field, getFieldSampleValue(field))}</span>
                </div>
              {:else}
                <span class="text-value">
                  {formatFieldValue(field, getFieldSampleValue(field))}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Pin Footer -->
      <div class="pin-footer">
        <small class="preview-note">
          <Icon name="Field" size={12} />
          Dane przykładowe
        </small>
      </div>
    </div>
  {/if}
</div>

<style>
  .preview-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-background);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .preview-header {
    padding: var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .preview-header h3 {
    margin: 0 0 var(--space-2) 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
  }

  .preview-subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
  }

  .empty-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--space-4);
    opacity: 0.5;
  }

  .preview-pin {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
    background: white;
    margin: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .pin-header {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .pin-title {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .pin-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .field-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-item.required .field-label {
    font-weight: var(--font-weight-semibold);
  }

  .field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .field-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    font-family: var(--font-mono);
  }

  .required-mark {
    color: var(--color-error);
  }

  .field-value {
    color: var(--color-text-primary);
    font-size: var(--text-sm);
  }

  .text-value {
    font-family: var(--font-mono);
  }

  .textarea-preview {
    padding: var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    line-height: 1.4;
    border: 1px solid var(--color-border);
  }

  .image-preview,
  .youtube-preview,
  .checkbox-preview {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .tags-preview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .tag {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
  }

  .major-tag {
    background: var(--color-accent);
    color: white;
  }

  .minor-tag {
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  .simple-tag {
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }

  .simple-tags .tag {
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
  }

  .pin-footer {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
    text-align: center;
  }

  .preview-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .preview-pin {
      margin: var(--space-2);
      padding: var(--space-3);
    }

    .pin-title {
      font-size: var(--text-lg);
    }

    .field-value {
      font-size: var(--text-xs);
    }
  }
</style>