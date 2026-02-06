import { writable } from 'svelte/store';
import type { Template, Field, SavedObject, ProjectData, GeoJSON, FieldType } from './types.js';

export const template = writable<Template>({ fields: [], tags: [] });
export const project = writable<SavedObject>({
  id: '',
  location: { type: 'Point', coordinates: [0, 0] } as GeoJSON.Point,
  data: {} as ProjectData
});

export function addField(label: string, type: string | undefined, required: boolean = false): void {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
  template.update((t: Template) => ({
    ...t,
    fields: [...t.fields, {
      id: crypto.randomUUID(),
      fieldType: (type || 'richtext') as FieldType,
      fieldName: key,
      key,
      label,
      type,
      required,
      visible: true,
      protected: false,
      adminVisible: true,
      order: t.fields.length
    }]
  }));
}

export function removeField(index: number): void {
  template.update((t: Template) => ({
    ...t,
    fields: t.fields.filter((_, i) => i !== index)
  }));
}
