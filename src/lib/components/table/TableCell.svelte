<script lang="ts">
  /**
   * TableCell Component
   * Renders a single table cell with editing, expansion, and tooltip functionality.
   * Supports multiple field types: price, multidate, address, links, tags, richtext, etc.
   */

  import type { SavedObject, Template, PriceData, CategoryFieldData, SelectionFieldData, SelectionConfig, SelectionOption } from '$lib/types';

  interface Props {
    field: any;
    value: any;
    object: SavedObject;
    template: Template;
    isEditing?: boolean;
    editingValue?: any;
    isExpanded?: boolean;
    isSorted?: boolean;
    width?: number;
    hoverCell?: { objectId: string; fieldKey: string } | null;

    // Helper functions passed from parent
    formatTableCellValue: (field: any, value: any) => string;
    formatPrice: (amount: number) => string;
    hasHiddenData: (field: any, value: any) => boolean;
    isElementOverflowing: (element: HTMLElement | null) => boolean;
    getTooltipContent: (field: any, value: any, obj: SavedObject) => any;
    extractAddressFromObject: (obj: SavedObject, template: Template) => any;
    isGeocoding: (objectId: string) => boolean;
    SyncIcon: () => string;

    // Event handlers
    onEditStart?: (objectId: string, fieldKey: string, currentValue: any) => void;
    onEditSave?: () => void;
    onEditCancel?: () => void;
    onEditValueChange?: (newValue: any) => void;
    onToggleRowExpansion?: (objectId: string) => void;
    onShowTooltip?: (event: MouseEvent, content: any) => void;
    onHideTooltip?: () => void;
    onQuickGeocode?: (objectId: string) => void;
    onSyncAddress?: (objectId: string) => void;
    onKeydown?: (event: KeyboardEvent) => void;
  }

  let {
    field,
    value,
    object,
    template,
    isEditing = false,
    editingValue = $bindable(),
    isExpanded = false,
    isSorted = false,
    width = 200,
    hoverCell = null,
    formatTableCellValue,
    formatPrice,
    hasHiddenData,
    isElementOverflowing,
    getTooltipContent,
    extractAddressFromObject,
    isGeocoding,
    SyncIcon,
    onEditStart,
    onEditSave,
    onEditCancel,
    onEditValueChange,
    onToggleRowExpansion,
    onShowTooltip,
    onHideTooltip,
    onQuickGeocode,
    onSyncAddress,
    onKeydown
  }: Props = $props();

  const cellId = $derived(`${object.id}-${field.key}`);
  const fieldValue = $derived(object.data[field.key]);

  // Focus action for inputs
  function focus(element: HTMLElement) {
    element.focus();
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.select();
    }
  }

  function handleToggleRowExpansion() {
    onToggleRowExpansion?.(object.id);
  }

  function handleEditStart() {
    onEditStart?.(object.id, field.key, object.data[field.key]);
  }

  function handleMouseEnter(e: MouseEvent) {
    if (!isExpanded && onShowTooltip) {
      const target = e.currentTarget as HTMLElement;
      let shouldShowTooltip = false;

      // Check if compact view with hidden data or overflow
      const compactView = target.querySelector('.compact-view');
      if (compactView) {
        const hasData = hasHiddenData(field, fieldValue);
        const compactLines = compactView.querySelectorAll('.compact-line');
        const isOverflowing = Array.from(compactLines).some(line =>
          isElementOverflowing(line as HTMLElement)
        );
        shouldShowTooltip = hasData || isOverflowing;
      } else {
        // Regular field: check visual overflow only
        const contentElement = target.querySelector('.field-value, .sub-fields, .address-display-container');
        shouldShowTooltip = contentElement && isElementOverflowing(contentElement as HTMLElement);
      }

      if (shouldShowTooltip) {
        const tooltipContent = getTooltipContent(field, fieldValue, object);
        if (tooltipContent) onShowTooltip(e, tooltipContent);
      }
    }
  }

  function handleMouseLeave() {
    onHideTooltip?.();
  }
</script>

<td style="width: {width}px;" class:sorted-column={isSorted}>
  {#if isEditing}
    <div class="edit-field-container">
      {#if field.type === 'price' && typeof fieldValue === 'object' && fieldValue !== null}
        <div class="edit-price-container">
          {#if editingValue.funding && Array.isArray(editingValue.funding)}
            {#each editingValue.funding as fundingItem, idx}
              <div class="edit-price-row">
                <span class="edit-label">{fundingItem.source}:</span>
                <input
                  type="number"
                  bind:value={editingValue.funding[idx].amount}
                  class="edit-field-input-small"
                  onkeydown={onKeydown}
                />
              </div>
            {/each}
          {/if}
        </div>
      {:else if field.type === 'multidate' && typeof fieldValue === 'object' && fieldValue !== null}
        <div class="edit-multidate-container">
          {#each Object.entries(fieldValue) as [label, date]}
            <div class="edit-date-row">
              <span class="edit-label">{label}:</span>
              <input
                type="date"
                bind:value={editingValue[label]}
                class="edit-field-input-small"
                onkeydown={onKeydown}
              />
            </div>
          {/each}
        </div>
      {:else if field.type === 'address' && typeof fieldValue === 'object' && fieldValue !== null}
        <div class="edit-address-container">
          <div class="edit-date-row">
            <span class="edit-label">Ulica:</span>
            <input
              type="text"
              bind:value={editingValue.street}
              class="edit-field-input-small"
              onkeydown={onKeydown}
            />
          </div>
          <div class="edit-date-row">
            <span class="edit-label">Numer:</span>
            <input
              type="text"
              bind:value={editingValue.number}
              class="edit-field-input-small"
              onkeydown={onKeydown}
            />
          </div>
          <div class="edit-date-row">
            <span class="edit-label">Kod:</span>
            <input
              type="text"
              bind:value={editingValue.postalCode}
              class="edit-field-input-small"
              onkeydown={onKeydown}
            />
          </div>
          <div class="edit-date-row">
            <span class="edit-label">Miasto:</span>
            <input
              type="text"
              bind:value={editingValue.city}
              class="edit-field-input-small"
              onkeydown={onKeydown}
            />
          </div>
          <div class="edit-date-row">
            <span class="edit-label">Gmina:</span>
            <input
              type="text"
              bind:value={editingValue.gmina}
              class="edit-field-input-small"
              onkeydown={onKeydown}
            />
          </div>
        </div>
      {:else if field.type === 'links' && Array.isArray(fieldValue)}
        <div class="edit-links-container">
          {#each fieldValue as link, idx}
            <div class="edit-link-row">
              <input
                type="text"
                bind:value={editingValue[idx].text}
                placeholder="Tekst"
                class="edit-field-input-small"
                onkeydown={onKeydown}
              />
              <input
                type="text"
                bind:value={editingValue[idx].url}
                placeholder="URL"
                class="edit-field-input-small"
                onkeydown={onKeydown}
              />
            </div>
          {/each}
        </div>
      {:else if field.type === 'richtext'}
        <textarea
          bind:value={editingValue}
          class="edit-field-textarea"
          onkeydown={onKeydown}
          use:focus
        ></textarea>
      {:else}
        <!-- Default text input for other modern field types -->
        <input
          type="text"
          bind:value={editingValue}
          class="edit-field-input"
          onkeydown={onKeydown}
          use:focus
        />
      {/if}
      <div class="edit-buttons">
        <button class="edit-save-btn" onclick={onEditSave} title="Zapisz (Ctrl+Enter)">
          ✓
        </button>
        <button class="edit-cancel-btn" onclick={onEditCancel} title="Anuluj">
          ✕
        </button>
      </div>
    </div>
  {:else}
    <div
      class="cell-content"
      class:expanded={isExpanded}
      onclick={handleToggleRowExpansion}
      ondblclick={handleEditStart}
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
    >
      {#if object.hasIncompleteData && !fieldValue}
        <span class="missing-data">—</span>
      {:else if field.type === 'price' && typeof fieldValue === 'object' && fieldValue !== null}
        {@const priceData = fieldValue as PriceData}
        {@const calculatedTotal = priceData.funding?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0}
        {@const totalStr = formatPrice(calculatedTotal)}
        {@const fundingCount = priceData.funding?.length || 0}
        {@const maxLength = totalStr.length}
        {#if !isExpanded && fundingCount > 2}
          <div class="compact-view">
            <div class="compact-line">{fundingCount} źródeł finansowania</div>
            <div class="compact-line">
              {priceData.funding[fundingCount - 1].source}: {formatPrice(priceData.funding[fundingCount - 1].amount)} zł
            </div>
          </div>
        {:else}
          {@const maxLength = totalStr.length}
          <div class="price-container">
            <div class="sub-fields">
              {#if priceData.funding && Array.isArray(priceData.funding)}
                {#each priceData.funding as fundingItem}
                  {@const amountStr = formatPrice(fundingItem.amount)}
                  {@const padding = maxLength - amountStr.length}
                  <div class="sub-field-row">
                    <span class="sub-label">{fundingItem.source}:</span>
                    <span class="sub-value" style="padding-left: {padding}ch;">{amountStr} zł</span>
                  </div>
                {/each}
                {#if priceData.showTotal !== false && calculatedTotal > 0}
                  <div class="sub-field-row total-row">
                    <span class="sub-label">Suma:</span>
                    <span class="sub-value">{totalStr} zł</span>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/if}
      {:else if field.type === 'multidate' && typeof fieldValue === 'object' && fieldValue !== null}
        {@const dateData = fieldValue}
        {@const dateEntries = Object.entries(dateData)}
        {@const dateCount = dateEntries.length}
        {#if !isExpanded && dateCount > 2}
          <div class="compact-view">
            <div class="compact-line">{dateCount} dat</div>
            <div class="compact-line">
              {dateEntries[dateCount - 1][0]}: {new Date(dateEntries[dateCount - 1][1]).toLocaleDateString('pl-PL')}
            </div>
          </div>
        {:else}
          <div class="sub-fields">
            {#each dateEntries as [label, date]}
              <div class="sub-field-row">
                <span class="sub-label">{label}:</span>
                <span class="sub-value">{new Date(date).toLocaleDateString('pl-PL')}</span>
              </div>
            {/each}
          </div>
        {/if}
      {:else if field.type === 'address' && typeof fieldValue === 'object' && fieldValue !== null}
        {@const addressData = fieldValue}
        {@const isMissingLocation = !object.location || object.missingFields?.includes('location')}
        {@const hasAddress = extractAddressFromObject(object, template) !== null}
        {@const isGeocodingPin = isGeocoding(object.id)}
        {#if !isExpanded}
          {@const parts = []}
          {#if addressData.street}
            {parts.push(addressData.street + (addressData.number ? ' ' + addressData.number : ''))}
          {/if}
          {#if addressData.postalCode}
            {parts.push(addressData.postalCode)}
          {/if}
          {#if addressData.city}
            {parts.push(addressData.city)}
          {/if}
          <div class="compact-view">
            <div class="compact-line">{parts.join(', ')}</div>
            {#if addressData.gmina}
              <div class="compact-line">Gmina: {addressData.gmina}</div>
            {/if}
          </div>
        {:else}
          <div class="address-display-container">
            <div class="sub-fields">
              {#if addressData.street}
                <div class="sub-field-row">
                  <span class="sub-label">Ulica:</span>
                  <span class="sub-value">{addressData.street}{#if addressData.number} {addressData.number}{/if}</span>
                </div>
              {/if}
              {#if addressData.postalCode}
                <div class="sub-field-row">
                  <span class="sub-label">Kod:</span>
                  <span class="sub-value">{addressData.postalCode}</span>
                </div>
              {/if}
              {#if addressData.city}
                <div class="sub-field-row">
                  <span class="sub-label">Miasto:</span>
                  <span class="sub-value">{addressData.city}</span>
                </div>
              {/if}
              {#if addressData.gmina}
                <div class="sub-field-row">
                  <span class="sub-label">Gmina:</span>
                  <span class="sub-value">{addressData.gmina}</span>
                </div>
              {/if}
            </div>
            <div class="address-actions">
              {#if isMissingLocation && hasAddress && !isGeocodingPin}
                <button
                  class="quick-geocode-address-btn"
                  title="Automatyczne geokodowanie z adresu"
                  onclick={(e) => {
                    e.stopPropagation();
                    onQuickGeocode?.(object.id);
                  }}
                >
                  📍 Geokoduj
                </button>
              {/if}
              {#if isGeocodingPin}
                <span class="geocoding-status">⏳ Geokodowanie...</span>
              {/if}
              {#if !isMissingLocation}
                <button
                  class="sync-address-btn"
                  onclick={(e) => {
                    e.stopPropagation();
                    onSyncAddress?.(object.id);
                  }}
                  title="Synchronizuj adres z lokalizacją"
                >
                  {@html SyncIcon()}
                </button>
              {/if}
            </div>
          </div>
        {/if}
      {:else if field.type === 'links' && Array.isArray(fieldValue) && fieldValue.length > 0}
        {@const linkCount = fieldValue.length}
        {#if !isExpanded && linkCount > 2}
          <div class="compact-view">
            <div class="compact-line">{linkCount} linków</div>
            <div class="compact-line">
              <a href={fieldValue[linkCount - 1].url} target="_blank" rel="noopener noreferrer" class="sub-value">
                {fieldValue[linkCount - 1].text || fieldValue[linkCount - 1].url}
              </a>
            </div>
          </div>
        {:else}
          <div class="sub-fields">
            {#each fieldValue as link}
              <div class="sub-field-row">
                <a href={link.url} target="_blank" rel="noopener noreferrer" class="sub-value">
                  {link.text || link.url}
                </a>
              </div>
            {/each}
          </div>
        {/if}
      {:else if field.type === 'tags' || field.type === 'category'}
        {#if fieldValue && typeof fieldValue === 'object' && fieldValue !== null && 'majorTag' in fieldValue}
          {@const tagData = fieldValue as CategoryFieldData}
          {@const majorTag = template.tags?.find(t => t.id === tagData.majorTag)}
          {#if majorTag}
            <span class="tag-display" style="background-color: {majorTag.color}">
              {majorTag.displayName || majorTag.name}
            </span>
          {:else}
            <span class="missing-data">—</span>
          {/if}
        {:else}
          <span class="missing-data">—</span>
        {/if}
      {:else if field.type === 'selection'}
        {#if fieldValue && typeof fieldValue === 'object' && fieldValue !== null}
          {@const selData = fieldValue as SelectionFieldData}
          {@const selConfig = (field.config as SelectionConfig) || { mode: 'single', options: [] }}
          {@const mode = selConfig.mode || 'single'}
          {@const getOption = (id: string) => selConfig.options?.find(o => o.id === id)}
          {@const getColor = (id: string) => getOption(id)?.color || '#6b7280'}
          {@const getLabel = (id: string) => getOption(id)?.value || id}
          {@const isCustom = (id: string) => (selData.customEntries || []).includes(id)}
          {#if mode === 'single'}
            {#if selData.selected}
              <span class="selection-badge" style="background-color: {getColor(selData.selected)}" class:custom={isCustom(selData.selected)}>
                {getLabel(selData.selected)}
              </span>
            {:else}
              <span class="missing-data">—</span>
            {/if}
          {:else if mode === 'multi'}
            {#if selData.selections && selData.selections.length > 0}
              <div class="selection-badges">
                {#each selData.selections as selId}
                  <span class="selection-badge small" style="background-color: {getColor(selId)}" class:custom={isCustom(selId)}>
                    {getLabel(selId)}
                  </span>
                {/each}
              </div>
            {:else}
              <span class="missing-data">—</span>
            {/if}
          {:else if mode === 'hierarchical'}
            {#if selData.primary || (selData.secondary && selData.secondary.length > 0)}
              <div class="selection-hierarchical">
                {#if selData.primary}
                  <span class="selection-badge primary" style="background-color: {getColor(selData.primary)}">
                    {getLabel(selData.primary)}
                  </span>
                {/if}
                {#if selData.secondary && selData.secondary.length > 0}
                  <div class="selection-badges secondary">
                    {#each selData.secondary as secId}
                      <span class="selection-badge small" style="background-color: {getColor(secId)}" class:custom={isCustom(secId)}>
                        {getLabel(secId)}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else}
              <span class="missing-data">—</span>
            {/if}
          {/if}
        {:else}
          <span class="missing-data">—</span>
        {/if}
      {:else}
        {@const formattedValue = formatTableCellValue(field, fieldValue)}
        <span class="field-value">
          {formattedValue}
        </span>
      {/if}
    </div>
  {/if}
</td>

<style>
  /* Cell styles */
  td {
    border-bottom: 1px solid var(--color-border);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0;
    vertical-align: top;
    position: relative;
    box-sizing: border-box;
  }

  td:last-child {
    border-right: none;
  }

  td.sorted-column {
    background-color: rgba(59, 130, 246, 0.05);
  }

  .cell-content {
    padding: 0.375rem 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
    /* Compact: max 2 lines */
    max-height: 2.6rem;
    line-height: 1.3;
    font-family: "Space Mono", monospace;
  }

  .cell-content:hover {
    background-color: var(--color-surface-hover);
  }

  .cell-content.expanded {
    max-height: none;
    background-color: var(--color-surface-active);
  }

  /* Field value display */
  .field-value {
    word-break: break-word;
    white-space: pre-wrap;
    flex: 1;
    font-size: 0.8125rem;
    /* Clamp to 2 lines when not expanded */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cell-content.expanded .field-value {
    -webkit-line-clamp: unset;
    overflow: visible;
  }

  .missing-data {
    color: var(--color-text-secondary);
    font-style: italic;
    font-size: 0.8125rem;
  }

  /* Compact view for multi-value fields */
  .compact-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
  }

  .compact-line {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
    font-size: 0.8125rem;
  }

  /* Sub-fields display */
  .sub-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .sub-field-row {
    display: flex;
    gap: var(--space-2);
    line-height: 1.3;
  }

  .sub-label {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .sub-value {
    font-family: 'Space Mono', monospace;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .sub-value a {
    color: #2563EB;
    text-decoration: underline;
  }

  .sub-value a:hover {
    text-decoration: none;
  }

  /* Price field */
  .price-container {
    flex: 1;
  }

  .total-row {
    border-top: 1px solid var(--color-border);
    padding-top: 0.125rem;
    margin-top: 0.125rem;
    font-weight: 500;
  }

  /* Address field */
  .address-display-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .address-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .quick-geocode-address-btn,
  .sync-address-btn {
    padding: 0.125rem 0.375rem;
    font-size: 0.6875rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-geocode-address-btn:hover,
  .sync-address-btn:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-primary);
  }

  .geocoding-status {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  /* Tags field */
  .tag-display {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
  }

  /* Selection field */
  .selection-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
  }

  .selection-badge.small {
    padding: 0.0625rem 0.375rem;
    font-size: 0.6875rem;
  }

  .selection-badge.primary {
    border: 2px solid rgba(0, 0, 0, 0.2);
  }

  .selection-badge.custom {
    font-style: italic;
  }

  .selection-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .selection-badges.secondary {
    margin-top: 0.25rem;
  }

  .selection-hierarchical {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  /* Edit mode styles */
  .edit-field-container {
    padding: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .edit-field-input,
  .edit-field-textarea {
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 2px solid var(--color-primary);
    border-radius: 0.25rem;
    font-family: inherit;
    font-size: 0.875rem;
  }

  .edit-field-textarea {
    min-height: 5rem;
    resize: vertical;
  }

  .edit-price-container,
  .edit-multidate-container,
  .edit-address-container,
  .edit-links-container {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .edit-price-row,
  .edit-date-row,
  .edit-link-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .edit-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    min-width: 5rem;
  }

  .edit-field-input-small {
    flex: 1;
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--color-border);
    border-radius: 0.1875rem;
    font-size: 0.8125rem;
  }

  .edit-field-input-small:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .edit-buttons {
    display: flex;
    gap: var(--space-1);
    justify-content: flex-end;
  }

  .edit-save-btn,
  .edit-cancel-btn {
    padding: 0.25rem 0.75rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .edit-save-btn {
    background: var(--color-primary);
    color: white;
  }

  .edit-save-btn:hover {
    background: var(--color-primary-hover);
  }

  .edit-cancel-btn {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .edit-cancel-btn:hover {
    background: var(--color-surface-hover);
  }
</style>
