<script lang="ts">
  /**
   * TableCell Component
   * Renders a single table cell with editing, expansion, and tooltip functionality.
   * Supports multiple field types: price, multidate, address, links, tags, richtext, etc.
   */

  import type { SavedObject, Template, PriceData, CategoryFieldData } from '$lib/types';

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
    onToggleExpansion?: (objectId: string, fieldKey: string) => void;
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
    onToggleExpansion,
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

  function handleToggleExpansion() {
    onToggleExpansion?.(object.id, field.key);
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
      onclick={handleToggleExpansion}
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
      {:else if field.type === 'tags'}
        {#if fieldValue && typeof fieldValue === 'object' && fieldValue !== null && 'majorTag' in fieldValue}
          {@const tagData = fieldValue as CategoryFieldData}
          {@const majorTag = template.tags?.find(t => t.id === tagData.majorTag)}
          {#if majorTag}
            <span class="tag-display" style="background-color: {majorTag.color}">
              {majorTag.displayName || majorTag.name}
            </span>
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
    padding: 0;
    vertical-align: top;
    position: relative;
  }

  td.sorted-column {
    background-color: rgba(59, 130, 246, 0.05);
  }

  .cell-content {
    padding: var(--space-2);
    cursor: pointer;
    min-height: 40px;
    display: flex;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }

  .cell-content:hover {
    background-color: var(--color-surface-hover);
  }

  .cell-content.expanded {
    background-color: var(--color-surface-active);
  }

  /* Field value display */
  .field-value {
    word-break: break-word;
    white-space: pre-wrap;
    flex: 1;
  }

  .missing-data {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  /* Compact view for multi-value fields */
  .compact-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .compact-line {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  /* Sub-fields display */
  .sub-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sub-field-row {
    display: flex;
    gap: var(--space-2);
    line-height: 1.4;
  }

  .sub-label {
    color: var(--color-text-secondary);
    font-size: 13px;
    white-space: nowrap;
  }

  .sub-value {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
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
    padding-top: 4px;
    margin-top: 2px;
    font-weight: 500;
  }

  /* Address field */
  .address-display-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .address-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .quick-geocode-address-btn,
  .sync-address-btn {
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-geocode-address-btn:hover,
  .sync-address-btn:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-primary);
  }

  .geocoding-status {
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  /* Tags field */
  .tag-display {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
    color: white;
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
    padding: 6px 8px;
    border: 2px solid var(--color-primary);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
  }

  .edit-field-textarea {
    min-height: 80px;
    resize: vertical;
  }

  .edit-price-container,
  .edit-multidate-container,
  .edit-address-container,
  .edit-links-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .edit-price-row,
  .edit-date-row,
  .edit-link-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .edit-label {
    font-size: 12px;
    color: var(--color-text-secondary);
    white-space: nowrap;
    min-width: 80px;
  }

  .edit-field-input-small {
    flex: 1;
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-size: 13px;
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
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
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
