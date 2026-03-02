import type { SavedObject, Field, AddressData, PriceData, LinkData, FileData, GalleryData, MultiDateData, SelectionFieldData, SelectionConfig, CategoryFieldData, TagsFieldData } from '$lib/types.js';

/**
 * Extract searchable text from a field value based on its type.
 */
export function extractSearchText(field: Field, value: unknown): string {
  if (!value && value !== 0) return '';

  if (typeof value === 'string') {
    // Strip HTML for richtext
    return value.replace(/<[^>]*>/g, '');
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const fieldType = field.fieldType || field.type;

  switch (fieldType) {
    case 'address':
      if (typeof value === 'object') {
        const a = value as AddressData;
        return [a.street, a.number, a.postalCode, a.city, a.gmina].filter(Boolean).join(' ');
      }
      return '';

    case 'price':
      if (typeof value === 'object' && 'currency' in (value as object)) {
        const p = value as PriceData;
        const parts: string[] = [];
        if (p.total) parts.push(String(p.total));
        if (p.currency) parts.push(p.currency);
        if (p.funding) {
          for (const f of p.funding) {
            if (f.source) parts.push(f.source);
            if (f.amount) parts.push(String(f.amount));
          }
        }
        return parts.join(' ');
      }
      return '';

    case 'links':
      if (Array.isArray(value)) {
        return (value as LinkData[]).map((l) => [l.text, l.url].filter(Boolean).join(' ')).join(' ');
      }
      return '';

    case 'files':
      if (Array.isArray(value)) {
        return (value as FileData[]).map((f) => f.originalName || f.filename).join(' ');
      }
      return '';

    case 'gallery':
      if (typeof value === 'object' && 'items' in (value as object)) {
        const g = value as GalleryData;
        return (g.items || []).map((i) => i.caption || '').filter(Boolean).join(' ');
      }
      return '';

    case 'multidate':
      if (typeof value === 'object') {
        return Object.entries(value as MultiDateData)
          .filter(([, d]) => d !== null)
          .map(([key, d]) => {
            try {
              return key + ' ' + new Date(d!).toLocaleDateString('pl-PL');
            } catch {
              return '';
            }
          })
          .join(' ');
      }
      return '';

    case 'selection':
      if (typeof value === 'object') {
        const s = value as SelectionFieldData;
        const config = (field.config as SelectionConfig) || { mode: 'single', options: [] };
        const options = config.options || [];
        const ids: string[] = [];
        if (s.selected) ids.push(s.selected);
        else if (s.primary) {
          ids.push(s.primary);
          if (s.secondary) ids.push(...s.secondary);
        } else if (s.selections) {
          ids.push(...s.selections);
        }
        if (s.customEntries) ids.push(...s.customEntries);
        return ids
          .map((id) => {
            const opt = options.find((o) => o.id === id);
            return opt ? opt.value : id;
          })
          .join(' ');
      }
      return '';

    case 'category':
      if (typeof value === 'object' && 'majorTag' in (value as object)) {
        const c = value as CategoryFieldData;
        return [c.majorTag, ...(c.minorTags || [])].filter(Boolean).join(' ');
      }
      return '';

    case 'tags':
      if (typeof value === 'object' && 'selectedTags' in (value as object)) {
        const t = value as TagsFieldData;
        return (t.selectedTags || []).join(' ');
      }
      return '';

    default:
      return '';
  }
}

/**
 * Filter objects by text search across all fields.
 * Case-insensitive substring matching with type-aware text extraction.
 */
export function filterByText(
  objects: SavedObject[],
  fields: Field[],
  searchText: string
): SavedObject[] {
  const term = searchText.trim().toLowerCase();
  if (!term) return objects;

  return objects.filter((obj) => {
    return fields.some((field) => {
      if (!field.key) return false;
      const value = obj.data[field.key];
      const text = extractSearchText(field, value);
      return text.toLowerCase().includes(term);
    });
  });
}

/**
 * Sort objects by a field key and direction.
 * Uses string comparison via localeCompare.
 */
export function sortObjects(
  objects: SavedObject[],
  fieldKey: string,
  direction: 'asc' | 'desc'
): SavedObject[] {
  if (!fieldKey) return objects;

  return [...objects].sort((a, b) => {
    const aValue = a.data[fieldKey] || '';
    const bValue = b.data[fieldKey] || '';
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    const cmp = aStr.localeCompare(bStr);
    return direction === 'asc' ? cmp : -cmp;
  });
}
