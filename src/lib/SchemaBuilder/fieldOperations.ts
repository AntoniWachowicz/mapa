/**
 * Field Operations
 * Handles CRUD operations for template fields including add, remove, and toggle operations.
 */

import type { Field, Template, FieldType } from '$lib/types.js';

export interface AddFieldParams {
  label: string;
  type: FieldType;
  required: boolean;
  maxMinorTags?: number;
  allowMultiple?: boolean;
  selectOptions?: string;
  addressSync?: boolean;
}

export interface NewFieldParams {
  newFieldLabel: string;
  newFieldType: FieldType;
  newFieldRequired: boolean;
  config: Record<string, unknown>;
}

/**
 * Add a field using legacy addField format
 * @deprecated Use saveNewField instead
 */
export function addField(
  template: Template,
  params: AddFieldParams
): Template | null {
  if (!params.label.trim() || !template?.fields) return null;

  const key = params.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Check if trying to add second category field
  if (params.type === 'category' && template.fields.some(f => f.type === 'category')) {
    return null; // Prevent adding multiple category fields
  }

  const newField = {
    key,
    label: params.label,
    displayLabel: params.label,
    type: params.type,
    required: params.required,
    visible: true,
    protected: false,
    adminVisible: true,
    ...(params.type === 'category' && { tagConfig: { maxMinorTags: params.maxMinorTags || 3 } }),
    ...(params.type === 'tags' && { tagConfig: { maxMinorTags: 0, allowMultiple: params.allowMultiple !== false } }),
    ...(params.type === 'address' && { addressSync: params.addressSync || false })
  } as Field;

  return {
    ...template,
    fields: [...template.fields, newField]
  };
}

/**
 * Save a new field to the template
 */
export function saveNewField(
  template: Template,
  params: NewFieldParams
): Template | null {
  if (!params.newFieldLabel.trim() || !template?.fields) return null;

  const fieldId = `field_${Date.now()}`;
  const fieldName = params.newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Check if trying to add second category field
  if (params.newFieldType === 'category' && template.fields.some(f => f.fieldType === 'category' || f.type === 'category')) {
    return null;
  }

  const newField: Field = {
    id: fieldId,
    fieldType: params.newFieldType,
    fieldName: fieldName,
    label: params.newFieldLabel,
    required: params.newFieldRequired,
    order: template.fields.length,
    config: Object.keys(params.config).length > 0 ? params.config as any : undefined,
    // Legacy compatibility
    key: fieldName,
    displayLabel: params.newFieldLabel,
    type: params.newFieldType as any,
    visible: true,
    protected: false,
    adminVisible: true
  };

  return {
    ...template,
    version: 2,
    fields: [...template.fields, newField]
  };
}

/**
 * Remove a field from the template
 */
export function removeField(
  template: Template,
  index: number
): Template | null {
  const field = template.fields[index];

  // Don't allow removal of protected fields or title field
  if (field.protected || field.key === 'title') {
    return null;
  }

  return {
    ...template,
    fields: template.fields.filter((_, i) => i !== index)
  };
}

/**
 * Toggle the required state of a field
 */
export function toggleRequired(
  template: Template,
  index: number
): Template | null {
  const field = template.fields[index];

  // Don't allow changing required state of protected fields or title field
  if (field.protected || field.key === 'title') {
    return null;
  }

  return {
    ...template,
    fields: template.fields.map((f, i) =>
      i === index ? { ...f, required: !f.required } : f
    )
  };
}

/**
 * Toggle the visibility state of a field
 */
export function toggleVisibility(
  template: Template,
  index: number
): Template {
  return {
    ...template,
    fields: template.fields.map((field, i) =>
      i === index ? { ...field, visible: !field.visible } : field
    )
  };
}

/**
 * Toggle the admin visibility state of a field
 */
export function toggleAdminVisibility(
  template: Template,
  index: number
): Template {
  return {
    ...template,
    fields: template.fields.map((field, i) =>
      i === index ? { ...field, adminVisible: !field.adminVisible } : field
    )
  };
}
