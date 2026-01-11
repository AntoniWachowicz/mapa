<script lang="ts">
  import type { Template, Field, Tag } from './types.js';
  import { getSampleValue } from './sample-data.js';

  interface Props {
    template: Template;
  }

  const { template }: Props = $props();

  // Get category field and sample data
  const categoryField = $derived(template.fields.find(f => f.fieldType === 'category' || f.type === 'category'));
  const categoryData = $derived(categoryField ? getSampleValue(categoryField.key, 'category') : null);
  const categoryTag = $derived(
    categoryData && template.tags?.length > 0
      ? template.tags.find(t => t.id === categoryData?.majorTag || t.name === categoryData?.majorTag)
      : null
  );
  const categoryColor = $derived(categoryTag?.color || '#E57373');
  const categoryLabel = $derived(categoryTag?.displayName || categoryTag?.name || 'Kategoria');

  // Get title field and sample data
  const titleField = $derived(template.fields.find(f => f.key === 'title' || f.fieldType === 'title'));
  const titleValue = $derived(titleField ? getSampleValue(titleField.key, 'text') : 'Przykładowy tytuł');

  // Get rich text field
  const richTextField = $derived(template.fields.find(f => f.fieldType === 'richtext'));
  const richTextValue = $derived(richTextField ? getSampleValue(richTextField.key, 'richtext') : null);

  // Get address field
  const addressField = $derived(template.fields.find(f => f.fieldType === 'address'));
  const addressValue = $derived(addressField ? getSampleValue(addressField.key, 'address') : null);

  // Get files field
  const filesField = $derived(template.fields.find(f => f.fieldType === 'files'));
  const filesValue = $derived(filesField ? getSampleValue(filesField.key, 'files') : []);

  // Get links field
  const linksField = $derived(template.fields.find(f => f.fieldType === 'links'));
  const linksValue = $derived(linksField ? getSampleValue(linksField.key, 'links') : []);

  // Get gallery field
  const galleryField = $derived(template.fields.find(f => f.fieldType === 'gallery'));
  const galleryValue = $derived(galleryField ? getSampleValue(galleryField.key, 'gallery') : null);

  // Get price field
  const priceField = $derived(template.fields.find(f => f.fieldType === 'price'));
  const priceValue = $derived(priceField ? getSampleValue(priceField.key, 'price') : null);

  // Get multidate field
  const multidateField = $derived(template.fields.find(f => f.fieldType === 'multidate'));
  const multidateValue = $derived(multidateField ? getSampleValue(multidateField.key, 'multidate') : null);

  // Get tags field
  const tagsField = $derived(template.fields.find(f => f.fieldType === 'tags'));
  const tagsValue = $derived(tagsField ? getSampleValue(tagsField.key, 'tags') : null);

  // Get visible fields (excluding system fields)
  const visibleFields = $derived(
    template.fields.filter(f => f.visible && f.key !== 'coordinates')
  );

  // Format address string
  function formatAddress(addr: any): string {
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

  // Sample GPS coordinates
  function formatGPS(): string {
    return '49.789012\n19.123456';
  }

  // Calculate pie chart paths
  function calculatePieChart(funding: any[]): { path: string; color: string; percentage: number }[] {
    if (!funding || funding.length === 0) return [];

    const total = funding.reduce((sum, f) => sum + (f.amount || 0), 0);
    let currentAngle = 0;
    const colors = ['#9E9E9E', '#BDBDBD', '#757575'];

    return funding.map((source, index) => {
      const percentage = (source.amount / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      const startRadians = (startAngle - 90) * Math.PI / 180;
      const endRadians = (endAngle - 90) * Math.PI / 180;
      const largeArc = angle > 180 ? 1 : 0;

      const x1 = 50 + 45 * Math.cos(startRadians);
      const y1 = 50 + 45 * Math.sin(startRadians);
      const x2 = 50 + 45 * Math.cos(endRadians);
      const y2 = 50 + 45 * Math.sin(endRadians);

      const path = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return { path, color: colors[index % colors.length], percentage };
    });
  }

  // Get dates from multidate
  function getDates(): { label: string; date: Date; year: number }[] {
    if (!multidateValue || !multidateField) return [];

    const config = multidateField.config as any;
    const dateFields = config?.dateFields || [
      { key: 'startDate', label: 'Data rozpoczęcia' },
      { key: 'endDate', label: 'Data zakończenia' }
    ];

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

  // Get selected tags for preview
  function getSelectedTags(): Tag[] {
    if (!tagsValue || !tagsValue.selectedTags || !template.tags) return [];
    return tagsValue.selectedTags
      .map((tagId: string) => template.tags.find(t => t.id === tagId || t.name === tagId))
      .filter((t: Tag | undefined) => t !== undefined) as Tag[];
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

<div class="preview-wrapper">
  <div class="preview-header">
    <h3>Podgląd pinezki</h3>
    <p class="preview-subtitle">Tak będzie wyglądać pinezka z Twoim schematem</p>
  </div>

  {#if visibleFields.length === 0}
    <div class="empty-preview">
      <div class="empty-icon">📝</div>
      <p><strong>Brak pól do wyświetlenia</strong></p>
      <p>Dodaj pola do schematu po lewej stronie, aby zobaczyć podgląd pinezki.</p>
    </div>
  {:else}
    <div class="detail-panel-preview" style="--category-color: {categoryColor};">
      <!-- Rotated category label on top-right -->
      {#if categoryField}
        <div class="category-label-rotated" style="background-color: {categoryColor};">
          {categoryLabel}
        </div>
      {/if}

      <!-- Main content wrapper -->
      <div class="detail-content-wrapper">
        <!-- Title -->
        <h1 class="detail-title">{titleValue || 'Bez tytułu'}</h1>

        <!-- Rich text section -->
        {#if richTextValue}
          <div class="richtext-section">
            <div class="richtext-content">
              {stripHTML(richTextValue)}
            </div>
          </div>
        {/if}

        <!-- Files/Links section -->
        {#if (filesValue && filesValue.length > 0) || (linksValue && linksValue.length > 0)}
          <div class="files-section">
            <div class="section-label">Pliki</div>
            {#each filesValue as file}
              <span class="file-link">
                {file.originalName || file.filename}
              </span>
            {/each}
            {#each linksValue as link}
              <span class="file-link">
                {link.text || link.url}
              </span>
            {/each}
          </div>
        {/if}

        <!-- Address + GPS -->
        {#if addressValue}
          <div class="address-section">
            <div class="address-text">{formatAddress(addressValue)}</div>
            <div class="gps-coords">{formatGPS()}</div>
          </div>
        {/if}

        <!-- Gallery placeholder -->
        {#if galleryValue && galleryValue.items && galleryValue.items.length > 0}
          <div class="gallery-section">
            {#each galleryValue.items.filter((item: any) => item.type === 'image') as item}
              <div class="gallery-placeholder">
                <span>Zdjęcie</span>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Financial breakdown -->
        {#if priceValue && priceValue.funding && priceValue.funding.length > 0}
          {@const total = priceValue.funding.reduce((sum: number, f: any) => sum + (f.amount || 0), 0)}
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
              <svg viewBox="0 0 100 100" width="60" height="60">
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
      </div>

      <!-- Preview note -->
      <div class="preview-note">
        Dane przykładowe
      </div>
    </div>
  {/if}
</div>

<style>
  .preview-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: transparent;
    overflow: hidden;
  }

  .preview-header {
    padding: 0 0 8px 0;
    background: transparent;
    flex-shrink: 0;
  }

  .preview-header h3 {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    color: #666;
  }

  .preview-subtitle {
    display: none;
  }

  .empty-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
    color: #666;
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-preview p {
    margin: 4px 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
  }

  .detail-panel-preview {
    --panel-width: 420px;
    --base-unit: calc(var(--panel-width) / 16);
    --margin: 16px;

    position: relative;
    background: #FFFFFF;
    border: 1px solid #000000;
    border-radius: 0;
    margin: 0;
    width: 100%;
    max-width: var(--panel-width);
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Rotated category label */
  .category-label-rotated {
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: auto;
    min-height: 60px;
    padding: 6px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-family: 'Space Grotesk', sans-serif;
    font-style: italic;
    font-size: 12px;
    color: white;
    font-weight: 400;
    z-index: 2;
  }

  /* Main content wrapper */
  .detail-content-wrapper {
    padding: var(--margin);
    padding-right: calc(var(--margin) + 24px);
    overflow-y: auto;
    flex: 1;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .detail-content-wrapper::-webkit-scrollbar {
    display: none;
  }

  /* Title */
  .detail-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 20px;
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
    font-size: 13px;
    line-height: 1.5;
    color: #000000;
    max-height: calc(1.5em * 6);
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Files section */
  .files-section {
    margin-bottom: var(--margin);
  }

  .section-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #666;
    margin-bottom: 6px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    float: left;
    margin-right: 10px;
    height: fit-content;
  }

  .file-link {
    display: block;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #2563EB;
    text-decoration: underline;
    margin-bottom: 3px;
  }

  /* Address section */
  .address-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--margin);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
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
    gap: 8px;
    margin-bottom: var(--margin);
    overflow-x: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .gallery-section::-webkit-scrollbar {
    display: none;
  }

  .gallery-placeholder {
    flex-shrink: 0;
    width: 80px;
    height: 60px;
    border: 2px solid #E5E7EB;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    color: #666;
  }

  /* Financial section */
  .financial-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--margin);
    gap: 12px;
  }

  .financial-table {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .financial-row {
    display: flex;
    align-items: baseline;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.3;
    color: #000000;
  }

  .financial-row.total-row {
    font-weight: 700;
    border-top: 1px solid #000000;
    margin-top: 2px;
    padding-top: 3px;
  }

  .source-name {
    flex: 0 0 auto;
    min-width: 50px;
    white-space: nowrap;
  }

  .source-amount {
    flex: 0 0 auto;
    text-align: right;
    min-width: 50px;
    margin-left: auto;
    margin-right: 6px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .source-percentage {
    flex: 0 0 auto;
    text-align: right;
    min-width: 30px;
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
    margin-bottom: 8px;
  }

  .date-row {
    display: flex;
    justify-content: space-between;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: #000000;
  }

  .timeline-visual {
    margin-top: 8px;
  }

  .timeline-bar {
    position: relative;
    height: 18px;
    background: #E5E7EB;
    border-radius: 2px;
  }

  .timeline-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    background: #000000;
    border-radius: 50%;
  }

  .timeline-marker.flag {
    width: 0;
    height: 0;
    border-radius: 0;
    border-left: 6px solid #DC2626;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }

  .timeline-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #666;
  }

  /* Tags section */
  .tags-section {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tag-badge {
    padding: 4px 8px;
    border-radius: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: white;
    display: inline-block;
  }

  /* Preview note */
  .preview-note {
    padding: 8px var(--margin);
    border-top: 1px solid #e0e0e0;
    text-align: center;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #666;
    background: #fafafa;
    flex-shrink: 0;
  }
</style>
