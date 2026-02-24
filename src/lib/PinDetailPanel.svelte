<script lang="ts">
  import type { SavedObject, Template, Tag, FieldValue, PriceData, GalleryData, MultiDateData, AddressData, FileData, LinkData, TagsFieldData, CategoryFieldData, SelectionFieldData, SelectionConfig, SelectionOption, Field } from '$lib/types';
  import Icon from '$lib/Icon.svelte';

  interface Props {
    object: SavedObject;
    template: Template;
    onClose: () => void;
    onEdit?: (obj: SavedObject) => void;
    onImageClick?: (url: string) => void;
  }

  const { object, template, onClose, onEdit, onImageClick }: Props = $props();

  // Extract field values using $derived for reactivity
  const titleField = $derived(template.fields.find(f => f.fieldType === 'title' || f.key === 'title'));
  const titleValue = $derived(titleField ? (object.data[titleField.key || titleField.fieldName] as string) : '');

  // Category field: either legacy 'category' type or a selection field with isCategory flag
  const categoryField = $derived(template.fields.find(f =>
    f.fieldType === 'category' ||
    f.type === 'category' ||
    (f.fieldType === 'selection' && (f.config as SelectionConfig | undefined)?.isCategory)
  ));

  // Get category color and label based on field type
  const categoryInfo = $derived(() => {
    if (!categoryField) return { color: '#E57373', label: 'Kategoria' };

    const fieldKey = categoryField.key || categoryField.fieldName;
    const fieldData = object.data[fieldKey];

    // Legacy category field - uses template.tags
    if (categoryField.fieldType === 'category' || categoryField.type === 'category') {
      if (fieldData && typeof fieldData === 'object' && 'majorTag' in fieldData) {
        const majorTagId = (fieldData as CategoryFieldData).majorTag;
        const tag = template.tags.find(t => t.id === majorTagId || t.name === majorTagId);
        return {
          color: tag?.color || '#E57373',
          label: tag?.displayName || tag?.name || 'Kategoria'
        };
      }
      return { color: '#E57373', label: 'Kategoria' };
    }

    // Selection field with isCategory - uses field.config.options
    if (categoryField.fieldType === 'selection') {
      const config = categoryField.config as SelectionConfig | undefined;
      const options = config?.options || [];
      const mode = config?.mode || 'single';
      const selData = fieldData as SelectionFieldData | undefined;

      if (!selData) return { color: '#E57373', label: 'Kategoria' };

      let primaryId: string | null = null;
      if (mode === 'single' && selData.selected) {
        primaryId = selData.selected;
      } else if (mode === 'hierarchical' && selData.primary) {
        primaryId = selData.primary;
      } else if (mode === 'multi' && selData.selections && selData.selections.length > 0) {
        primaryId = selData.selections[0]; // Use first selection for multi mode
      }

      if (primaryId) {
        const option = options.find(o => o.id === primaryId);
        return {
          color: option?.color || '#E57373',
          label: option?.value || primaryId
        };
      }
      return { color: '#E57373', label: 'Kategoria' };
    }

    return { color: '#E57373', label: 'Kategoria' };
  });

  const categoryColor = $derived(categoryInfo().color);
  const categoryLabel = $derived(categoryInfo().label);

  const richTextField = $derived(template.fields.find(f => f.fieldType === 'richtext'));
  const richTextValue = $derived(richTextField ? (object.data[richTextField.key || richTextField.fieldName] as string) : '');

  const filesField = $derived(template.fields.find(f => f.fieldType === 'files'));
  const filesValue = $derived(filesField ? (object.data[filesField.key || filesField.fieldName] as FileData[]) : []);

  const linksField = $derived(template.fields.find(f => f.fieldType === 'links'));
  const linksValue = $derived(linksField ? (object.data[linksField.key || linksField.fieldName] as LinkData[]) : []);

  const addressField = $derived(template.fields.find(f => f.fieldType === 'address'));
  const addressValue = $derived(addressField ? (object.data[addressField.key || addressField.fieldName] as AddressData) : null);

  const galleryField = $derived(template.fields.find(f => f.fieldType === 'gallery'));
  const galleryValue = $derived(galleryField ? (object.data[galleryField.key || galleryField.fieldName] as GalleryData) : null);

  const priceField = $derived(template.fields.find(f => f.fieldType === 'price'));
  const priceValue = $derived(priceField ? (object.data[priceField.key || priceField.fieldName] as PriceData) : null);

  const multidateField = $derived(template.fields.find(f => f.fieldType === 'multidate'));
  const multidateValue = $derived(multidateField ? (object.data[multidateField.key || multidateField.fieldName] as MultiDateData) : null);

  const tagsField = $derived(template.fields.find(f => f.fieldType === 'tags'));
  const tagsValue = $derived(tagsField ? (object.data[tagsField.key || tagsField.fieldName] as TagsFieldData) : null);

  // Selection fields - can be multiple (exclude the one marked as isCategory since it's shown in the rotated label)
  const selectionFields = $derived(template.fields.filter(f =>
    (f.fieldType === 'selection' || f.type === 'selection') &&
    !(f.config as SelectionConfig | undefined)?.isCategory
  ));

  // Rich text expansion state
  let isRichTextExpanded = $state(false);
  let richTextNeedsExpansion = $state(false);
  let richTextElement = $state<HTMLDivElement | null>(null);
  let contentWrapper = $state<HTMLDivElement | null>(null);

  // Reset expansion state and scroll position when object changes
  $effect(() => {
    // Trigger on object change
    object.id;
    isRichTextExpanded = false;
    if (contentWrapper) {
      contentWrapper.scrollTop = 0;
    }
  });

  // Check if rich text needs expansion after mount
  $effect(() => {
    if (richTextElement) {
      const lineHeight = parseFloat(getComputedStyle(richTextElement).lineHeight);
      const maxHeight = lineHeight * 11;
      richTextNeedsExpansion = richTextElement.scrollHeight > maxHeight;
    }
  });

  // Format address string
  function formatAddress(addr: AddressData | null): string {
    if (!addr) return '';
    const parts = [];
    if (addr.street && addr.number) {
      parts.push(`${addr.street} ${addr.number}`);
    } else if (addr.street) {
      parts.push(addr.street);
    }
    if (addr.postalCode && addr.city) {
      parts.push(`${addr.postalCode} ${addr.city}`);
    } else if (addr.city) {
      parts.push(addr.city);
    }
    if (addr.gmina) {
      parts.push(addr.gmina);
    }
    return parts.join('\n');
  }

  // Format GPS coordinates
  function formatGPS(): string {
    if (!object.location || !object.location.coordinates) return '';
    const [lng, lat] = object.location.coordinates;
    return `${lat.toFixed(6)}\n${lng.toFixed(6)}`;
  }

  // Calculate pie chart paths
  function calculatePieChart(funding: PriceData['funding']): { path: string; color: string; percentage: number }[] {
    if (!funding || funding.length === 0) return [];

    const total = funding.reduce((sum, f) => sum + (f.amount || 0), 0);
    let currentAngle = 0;
    const colors = ['#9E9E9E', '#BDBDBD', '#757575']; // Default colors for pie segments

    return funding.map((source, index) => {
      const percentage = (source.amount / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      // Calculate SVG path for pie slice
      const startRadians = (startAngle - 90) * Math.PI / 180;
      const endRadians = (endAngle - 90) * Math.PI / 180;
      const largeArc = angle > 180 ? 1 : 0;

      const x1 = 50 + 45 * Math.cos(startRadians);
      const y1 = 50 + 45 * Math.sin(startRadians);
      const x2 = 50 + 45 * Math.cos(endRadians);
      const y2 = 50 + 45 * Math.sin(endRadians);

      const path = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return {
        path,
        color: colors[index % colors.length],
        percentage
      };
    });
  }

  // Parse dates from multidate
  function getDates(): { label: string; date: Date; year: number }[] {
    if (!multidateValue || !multidateField) return [];

    const config = multidateField.config as any;
    const dateFields = config?.dateFields || [];

    return dateFields
      .map((df: any) => {
        const dateValue = multidateValue[df.key];
        if (!dateValue) return null;
        const date = new Date(dateValue);
        return {
          label: df.label,
          date,
          year: date.getFullYear()
        };
      })
      .filter((d: any) => d !== null);
  }

  // Calculate timeline visualization
  function calculateTimeline(): { dates: { label: string; value: string; position: number }[]; minYear: number; maxYear: number } | null {
    const dates = getDates();
    if (dates.length === 0) return null;

    const years = dates.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearSpan = maxYear - minYear || 1;

    return {
      dates: dates.map(d => ({
        label: d.label,
        value: d.date.toLocaleDateString('pl-PL'),
        position: ((d.year - minYear) / yearSpan) * 100
      })),
      minYear,
      maxYear
    };
  }

  const timelineData = $derived(calculateTimeline());

  // Get selected tags
  function getSelectedTags(): Tag[] {
    if (!tagsValue || !tagsValue.selectedTags) return [];
    return tagsValue.selectedTags
      .map(tagId => template.tags.find(t => t.id === tagId || t.name === tagId))
      .filter(t => t !== undefined) as Tag[];
  }

  // Get selection field display data
  function getSelectionDisplay(field: Field): { label: string; items: { id: string; value: string; color: string; isPrimary: boolean; isCustom: boolean }[] } | null {
    const fieldKey = field.key || field.fieldName;
    const selData = object.data[fieldKey] as SelectionFieldData;
    if (!selData) return null;

    const config = (field.config as SelectionConfig) || { mode: 'single', options: [] };
    const mode = config.mode || 'single';
    const options = config.options || [];

    const getOption = (id: string) => options.find(o => o.id === id);
    const getColor = (id: string) => getOption(id)?.color || '#6b7280';
    const getLabel = (id: string) => getOption(id)?.value || id;
    const isCustom = (id: string) => (selData.customEntries || []).includes(id);

    const items: { id: string; value: string; color: string; isPrimary: boolean; isCustom: boolean }[] = [];

    if (mode === 'single' && selData.selected) {
      items.push({
        id: selData.selected,
        value: getLabel(selData.selected),
        color: getColor(selData.selected),
        isPrimary: true,
        isCustom: isCustom(selData.selected)
      });
    } else if (mode === 'multi' && selData.selections && selData.selections.length > 0) {
      selData.selections.forEach(id => {
        items.push({
          id,
          value: getLabel(id),
          color: getColor(id),
          isPrimary: false,
          isCustom: isCustom(id)
        });
      });
    } else if (mode === 'hierarchical') {
      if (selData.primary) {
        items.push({
          id: selData.primary,
          value: getLabel(selData.primary),
          color: getColor(selData.primary),
          isPrimary: true,
          isCustom: false
        });
      }
      if (selData.secondary && selData.secondary.length > 0) {
        selData.secondary.forEach(id => {
          items.push({
            id,
            value: getLabel(id),
            color: getColor(id),
            isPrimary: false,
            isCustom: isCustom(id)
          });
        });
      }
    }

    if (items.length === 0) return null;

    return {
      label: field.label || field.fieldName || field.key || 'Wybór',
      items
    };
  }

  // Strip HTML from rich text
  function stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
</svelte:head>

<div class="detail-panel-new" style="--category-color: {categoryColor};">
  <!-- Rotated category label on top-right -->
  <div class="category-label-rotated" style="background-color: {categoryColor};">
    {categoryLabel}
  </div>

  <!-- Main content wrapper -->
  <div class="detail-content-wrapper" bind:this={contentWrapper}>
    <!-- Title -->
    <h1 class="detail-title-new">{titleValue || 'Bez tytułu'}</h1>

    <!-- Rich text section -->
    {#if richTextValue}
      <div class="richtext-section" class:expanded={isRichTextExpanded}>
        <div class="richtext-content" bind:this={richTextElement}>
          {stripHTML(richTextValue)}
        </div>
        {#if richTextNeedsExpansion && !isRichTextExpanded}
          <button class="read-more-btn" onclick={() => isRichTextExpanded = true} type="button">
            czytaj dalej
          </button>
        {/if}
      </div>
    {/if}

    <!-- Files/Links section -->
    {#if (filesValue && filesValue.length > 0) || (linksValue && linksValue.length > 0)}
      <div class="files-section">
        <div class="section-label">Pliki</div>
        {#each filesValue as file}
          <a href={file.path} class="file-link" target="_blank" rel="noopener noreferrer">
            {file.originalName || file.filename}
          </a>
        {/each}
        {#each linksValue as link}
          <a href={link.url} class="file-link" target="_blank" rel="noopener noreferrer">
            {link.text || link.url}
          </a>
        {/each}
      </div>
    {/if}

    <!-- Address + GPS -->
    {#if addressValue || object.location}
      <div class="address-section">
        <div class="address-text">{formatAddress(addressValue)}</div>
        <div class="gps-coords">{formatGPS()}</div>
      </div>
    {/if}

    <!-- Gallery -->
    {#if galleryValue && galleryValue.items && galleryValue.items.length > 0}
      <div class="gallery-section">
        {#each galleryValue.items.filter(item => item.type === 'image') as item}
          <button
            class="gallery-image"
            onclick={() => onImageClick?.(item.url)}
            type="button"
          >
            <img src={item.url} alt={item.caption || ''} />
          </button>
        {/each}
      </div>
    {/if}

    <!-- Financial breakdown -->
    {#if priceValue && priceValue.funding && priceValue.funding.length > 0}
      {@const total = priceValue.funding.reduce((sum, f) => sum + (f.amount || 0), 0)}
      {@const pieSegments = calculatePieChart(priceValue.funding)}
      <div class="financial-section">
        <div class="financial-table">
          {#each priceValue.funding as source}
            {@const percentage = ((source.amount / total) * 100).toFixed(0)}
            <div class="financial-row">
              <span class="source-name">{source.source}</span>
              <span class="source-amount">{source.amount.toLocaleString('pl-PL', { minimumFractionDigits: 0 })}</span>
              <span class="source-percentage">{percentage}%</span>
            </div>
          {/each}
          <div class="financial-row total-row">
            <span class="source-name">Suma</span>
            <span class="source-amount">{total.toLocaleString('pl-PL', { minimumFractionDigits: 0 })}</span>
            <span class="source-percentage">PLN</span>
          </div>
        </div>
        <div class="pie-chart">
          <svg viewBox="0 0 100 100" width="80" height="80">
            {#each pieSegments as segment}
              <path d={segment.path} fill={segment.color} />
            {/each}
          </svg>
        </div>
      </div>
    {/if}

    <!-- Timeline -->
    {#if timelineData}
      <div class="timeline-section">
        <div class="timeline-dates">
          {#each timelineData.dates as date}
            <div class="date-row">
              <span class="date-label">{date.label}</span>
              <span class="date-value">{date.value}</span>
            </div>
          {/each}
        </div>
        <div class="timeline-visual">
          <div class="timeline-bar">
            {#each timelineData.dates as date, i}
              <div class="timeline-marker" style="left: {date.position}%;" class:flag={i === timelineData.dates.length - 1}></div>
            {/each}
          </div>
          <div class="timeline-labels">
            <span>{timelineData.minYear}</span>
            <span>{timelineData.maxYear}</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Tags -->
    {#if tagsValue && tagsValue.selectedTags && tagsValue.selectedTags.length > 0}
      {@const selectedTags = getSelectedTags()}
      <div class="tags-section">
        {#each selectedTags as tag}
          <span class="tag-badge" style="background-color: {tag.color};">
            {tag.displayName || tag.name}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Selection fields -->
    {#each selectionFields as selField}
      {@const selDisplay = getSelectionDisplay(selField)}
      {#if selDisplay}
        <div class="selection-section">
          <div class="selection-label">{selDisplay.label}</div>
          <div class="selection-items">
            {#each selDisplay.items as item}
              <span
                class="selection-badge"
                class:primary={item.isPrimary}
                class:custom={item.isCustom}
                style="background-color: {item.color};"
              >
                {item.value}
              </span>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Edit button -->
  {#if onEdit}
  <button class="edit-btn-floating" onclick={() => onEdit(object)} type="button">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M4 5C4 3.34315 5.34315 2 7 2H12.7574C13.553 2 14.3161 2.31607 14.8787 2.87868L19.1213 7.12132C19.6839 7.68393 20 8.44699 20 9.24264V19C20 20.6569 18.6569 22 17 22H7C5.34315 22 4 20.6569 4 19V5ZM14 9C13.4477 9 13 8.55228 13 8V5.20711C13 4.76165 13.5386 4.53857 13.8536 4.85355L17.1464 8.14645C17.4614 8.46143 17.2383 9 16.7929 9H14ZM8.29289 15.7071C8.10536 15.8946 8 16.149 8 16.4142V18.5C8 18.7761 8.22386 19 8.5 19H10.5858C10.851 19 11.1054 18.8946 11.2929 18.7071L15.2929 14.7071C15.6834 14.3166 15.6834 13.6834 15.2929 13.2929L13.7071 11.7071C13.3166 11.3166 12.6834 11.3166 12.2929 11.7071L8.29289 15.7071Z" fill="white"/>
    </svg>
    <span>Edytuj</span>
  </button>
  {/if}
</div>

<style>
  .detail-panel-new {
    --panel-width: 420px;
    --base-unit: calc(var(--panel-width) / 16);
    --margin: var(--base-unit);

    position: relative;
    width: var(--panel-width);
    background: #FFFFFF;
    border: 1px solid #000000;
    border-radius: 0;
    overflow: hidden;
    max-height: calc(100vh - 120px);
  }

  /* Rotated category label */
  .category-label-rotated {
    position: absolute;
    top: 0;
    right: 0;
    width: var(--base-unit);
    height: auto;
    min-height: 80px;
    padding: 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-family: 'Space Grotesk', sans-serif;
    font-style: italic;
    font-size: 14px;
    color: white;
    font-weight: 400;
    z-index: 2;
  }

  /* Main content wrapper */
  .detail-content-wrapper {
    padding: var(--margin);
    overflow-y: auto;
    max-height: calc(100vh - 120px);
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .detail-content-wrapper::-webkit-scrollbar {
    display: none;
  }

  /* Title */
  .detail-title-new {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 28px;
    line-height: 1.2;
    margin: 0 0 var(--margin) 0;
    color: #000000;
    word-break: break-word;
  }

  /* Rich text section */
  .richtext-section {
    margin-bottom: var(--margin);
  }

  .richtext-content {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #000000;
    max-height: calc(1.5em * 11);
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .richtext-section.expanded .richtext-content {
    max-height: none;
  }

  .read-more-btn {
    background: none;
    border: none;
    padding: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #000000;
    text-decoration: underline;
    cursor: pointer;
    margin-top: 4px;
  }

  .read-more-btn:hover {
    text-decoration: none;
  }

  /* Files section */
  .files-section {
    margin-bottom: var(--margin);
  }

  .section-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    margin-bottom: 8px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    float: left;
    margin-right: 12px;
    height: fit-content;
  }

  .file-link {
    display: block;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #2563EB;
    text-decoration: underline;
    margin-bottom: 4px;
    cursor: pointer;
  }

  .file-link:hover {
    text-decoration: none;
  }

  /* Address section */
  .address-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--margin);
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    line-height: 1.4;
    color: #000000;
  }

  .address-text {
    white-space: pre-line;
  }

  .gps-coords {
    text-align: right;
    white-space: pre-line;
    color: #666;
  }

  /* Gallery section */
  .gallery-section {
    display: flex;
    gap: 12px;
    margin-bottom: var(--margin);
    overflow-x: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .gallery-section::-webkit-scrollbar {
    display: none;
  }

  .gallery-image {
    flex-shrink: 0;
    border: 2px solid #E5E7EB;
    border-radius: 0;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.2s;
    background: none;
    padding: 0;
    height: 140px;
  }

  .gallery-image:hover {
    border-color: #000000;
  }

  .gallery-image img {
    height: 100%;
    width: auto;
    display: block;
    object-fit: cover;
  }

  /* Financial section */
  .financial-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--margin);
    gap: 16px;
  }

  .financial-table {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .financial-row {
    display: flex;
    align-items: baseline;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    line-height: 1.3;
    color: #000000;
  }

  .financial-row.total-row {
    font-weight: 700;
    border-top: 1px solid #000000;
    margin-top: 2px;
    padding-top: 4px;
  }

  .source-name {
    flex: 0 0 auto;
    min-width: 70px;
    white-space: nowrap;
  }

  .source-amount {
    flex: 0 0 auto;
    text-align: right;
    min-width: 60px;
    margin-left: auto;
    margin-right: 8px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .source-percentage {
    flex: 0 0 auto;
    text-align: right;
    min-width: 35px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .pie-chart {
    flex-shrink: 0;
  }

  /* Timeline section */
  .timeline-section {
    margin-bottom: var(--margin);
  }

  .timeline-dates {
    margin-bottom: 12px;
  }

  .date-row {
    display: flex;
    justify-content: space-between;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    line-height: 1.8;
    color: #000000;
  }

  .timeline-visual {
    margin-top: 12px;
  }

  .timeline-bar {
    position: relative;
    height: 24px;
    background: #E5E7EB;
    border-radius: 2px;
  }

  .timeline-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: #000000;
    border-radius: 50%;
  }

  .timeline-marker.flag {
    width: 0;
    height: 0;
    border-radius: 0;
    border-left: 8px solid #DC2626;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
  }

  .timeline-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: #666;
  }

  /* Tags section */
  .tags-section {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tag-badge {
    padding: 6px 12px;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: white;
    display: inline-block;
  }

  /* Selection section */
  .selection-section {
    margin-bottom: var(--margin);
  }

  .selection-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    margin-bottom: 8px;
  }

  .selection-items {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .selection-badge {
    padding: 6px 12px;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: white;
    display: inline-block;
  }

  .selection-badge.primary {
    border: 2px solid rgba(0, 0, 0, 0.2);
  }

  .selection-badge.custom {
    font-style: italic;
  }

  /* Edit button */
  .edit-btn-floating {
    position: absolute;
    bottom: calc(var(--margin) - 8px);
    left: var(--margin);
    background: var(--color-accent, #2563EB);
    color: white;
    border: 1px solid #000000;
    padding: 10px 16px;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
  }

  .edit-btn-floating:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .edit-btn-floating:active {
    transform: translateY(0);
  }
</style>
