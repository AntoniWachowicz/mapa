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

    const fieldType = field.fieldType || field.type;

    switch (fieldType) {
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

  // Check if field is a complex type that needs special rendering
  function isComplexField(field: Field): boolean {
    const fieldType = field.fieldType || field.type;
    return ['richtext', 'address', 'multidate', 'links', 'price', 'gallery', 'files'].includes(fieldType);
  }

  // Get sample data for field
  function getFieldSampleValue(field: Field): any {
    const fieldType = field.fieldType || field.type;
    return getSampleValue(field.key, fieldType);
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
          {@const fieldType = field.fieldType || field.type}
          {@const fieldValue = getFieldSampleValue(field)}
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

              {#if fieldType === 'richtext'}
                <div class="richtext-preview">
                  {@html fieldValue}
                </div>
              {:else if fieldType === 'address'}
                <div class="address-preview">
                  {#if fieldValue?.street || fieldValue?.number}
                    <div>{fieldValue.street} {fieldValue.number}</div>
                  {/if}
                  {#if fieldValue?.postalCode || fieldValue?.city}
                    <div>{fieldValue.postalCode} {fieldValue.city}</div>
                  {/if}
                  {#if fieldValue?.gmina}
                    <div>{fieldValue.gmina}</div>
                  {/if}
                </div>
              {:else if fieldType === 'multidate'}
                <div class="multidate-preview">
                  {#each Object.entries(fieldValue || {}) as [key, date]}
                    <div class="date-item">
                      <span class="date-label">{key}:</span>
                      <span class="date-value">
                        {date instanceof Date ? date.toLocaleDateString('pl-PL') : date}
                      </span>
                    </div>
                  {/each}
                </div>
              {:else if fieldType === 'links'}
                <div class="links-preview">
                  {#each (fieldValue || []) as link}
                    <div class="link-item">
                      <Icon name="Link" size={14} />
                      <span>{link.text || link.url}</span>
                    </div>
                  {/each}
                </div>
              {:else if fieldType === 'price'}
                <div class="price-preview">
                  {#if fieldValue?.showTotal && fieldValue?.total}
                    <div class="price-total">
                      <strong>Suma: {fieldValue.total.toLocaleString('pl-PL')} {fieldValue.currency}</strong>
                    </div>
                  {/if}
                  {#if fieldValue?.showBreakdown && fieldValue?.funding?.length > 0}
                    <div class="funding-breakdown">
                      {#each fieldValue.funding as source}
                        <div class="funding-item">
                          <span>{source.source}:</span>
                          <span>{source.amount.toLocaleString('pl-PL')} {fieldValue.currency}</span>
                          {#if source.percentage}
                            <span class="percentage">({source.percentage}%)</span>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else if fieldType === 'gallery'}
                <div class="gallery-preview">
                  {#each (fieldValue?.items || []) as item}
                    <div class="gallery-item">
                      {#if item.type === 'image'}
                        <Icon name="Picture" size={14} />
                        <span>{item.caption || 'Obrazek'}</span>
                      {:else if item.type === 'video'}
                        <Icon name="Video" size={14} />
                        <span>{item.caption || 'Film'}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else if fieldType === 'files'}
                <div class="files-preview">
                  {#each (fieldValue || []) as file}
                    <div class="file-item">
                      <Icon name="File" size={14} />
                      <span>{file.originalName || file.filename}</span>
                    </div>
                  {/each}
                </div>
              {:else if field.type === 'image'}
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
                {@const categoryValue = fieldValue}
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
                {@const tagsValue = fieldValue}
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
                  {formatFieldValue(field, fieldValue)}
                </div>
              {:else if field.type === 'checkbox'}
                <div class="checkbox-preview">
                  <Icon name={fieldValue ? 'Star' : 'Close'} size={14} />
                  <span>{formatFieldValue(field, fieldValue)}</span>
                </div>
              {:else}
                <span class="text-value">
                  {formatFieldValue(field, fieldValue)}
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

  /* Rich text preview */
  .richtext-preview {
    padding: var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    line-height: 1.5;
    border: 1px solid var(--color-border);
  }

  .richtext-preview :global(p) {
    margin: 0 0 var(--space-2) 0;
  }

  .richtext-preview :global(p:last-child) {
    margin-bottom: 0;
  }

  .richtext-preview :global(ul),
  .richtext-preview :global(ol) {
    margin: var(--space-2) 0;
    padding-left: var(--space-4);
  }

  .richtext-preview :global(li) {
    margin: var(--space-1) 0;
  }

  /* Address preview */
  .address-preview {
    padding: var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    line-height: 1.4;
    border: 1px solid var(--color-border);
  }

  .address-preview div {
    margin: 2px 0;
  }

  /* MultiDate preview */
  .multidate-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .date-item {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .date-label {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    min-width: 80px;
  }

  .date-value {
    color: var(--color-text-primary);
  }

  /* Links preview */
  .links-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  /* Price preview */
  .price-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .price-total {
    padding: var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .funding-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .funding-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .funding-item .percentage {
    color: var(--color-text-secondary);
    margin-left: var(--space-1);
  }

  /* Gallery preview */
  .gallery-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .gallery-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  /* Files preview */
  .files-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
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