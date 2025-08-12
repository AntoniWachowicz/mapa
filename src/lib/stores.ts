import { writable } from 'svelte/store';
import type { Template, Field, SavedObject, ProjectData } from './types.js';

export const template = writable<Template>({ fields: [] });
export const project = writable<SavedObject>({ id: '', data: {} as ProjectData });

export function addField(label: string, type: Field['type'], required: boolean = false): void {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
  template.update((t: Template) => ({
    fields: [...t.fields, { key, label, type, required, visible: true }] // Add visible: true
  }));
}

export function removeField(index: number): void {
  template.update((t: Template) => ({
    fields: t.fields.filter((_, i) => i !== index)
  }));
}
