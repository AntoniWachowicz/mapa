import { connectToDatabase } from './database.js';
import { ObjectId } from 'mongodb';
import type { Template, SavedObject, ProjectData, Tag, CategoryFieldData, TagsFieldData, GeoJSON, Field, SelectionConfig, SelectionOption, SelectionFieldData } from '../types.js';

// Version 2 Protected Fields - Always present
const PROTECTED_FIELDS: Field[] = [
  {
    id: 'field_title',
    fieldType: 'title',
    fieldName: 'title',
    label: 'Tytuł',
    required: true,
    order: 0,
    key: 'title',
    displayLabel: 'Tytuł',
    type: 'text',
    visible: true,
    protected: true,
    adminVisible: true
  },
  {
    id: 'field_location',
    fieldType: 'location',
    fieldName: 'location',
    label: 'Lokalizacja',
    required: true,
    order: 1,
    key: 'location',
    displayLabel: 'Lokalizacja',
    type: 'text',
    visible: true,
    protected: true,
    adminVisible: true
  }
];

const DEFAULT_TEMPLATE: Template = {
  version: 2,
  fields: [...PROTECTED_FIELDS],
  tags: []
};

// ─── Template ─────────────────────────────────────────────────────────────────

export async function getTemplate(tenantId: string): Promise<Template> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('settings');
    const result = await collection.findOne({ type: 'template', tenantId });

    if (!result) {
      await collection.insertOne({ type: 'template', tenantId, template: DEFAULT_TEMPLATE });
      return DEFAULT_TEMPLATE;
    }

    const secureTemplate = ensureProtectedFields(result.template);
    if (JSON.stringify(secureTemplate) !== JSON.stringify(result.template)) {
      await collection.updateOne({ type: 'template', tenantId }, { $set: { template: secureTemplate } });
    }
    return secureTemplate;
  } catch (error) {
    console.error('Error getting template:', error);
    return DEFAULT_TEMPLATE;
  }
}

function ensureProtectedFields(template: Template): Template {
  const existingFields = template.fields || [];
  const isV2 = template.version === 2;

  if (isV2) {
    const protectedNames = PROTECTED_FIELDS.map(f => f.fieldName);
    const existingProtected = existingFields.filter(f => f.fieldName && protectedNames.includes(f.fieldName));
    const nonProtected = existingFields.filter(f => !f.fieldName || !protectedNames.includes(f.fieldName));
    const mergedProtected = PROTECTED_FIELDS.map(def => {
      const existing = existingProtected.find(f => f.fieldName === def.fieldName);
      return existing ? { ...def, label: existing.label, required: existing.required } : def;
    });
    return { version: 2, fields: [...mergedProtected, ...nonProtected], tags: template.tags || [] };
  } else {
    const protectedKeys = PROTECTED_FIELDS.map(f => f.key);
    const existingProtected = existingFields.filter(f => f.key && protectedKeys.includes(f.key));
    const nonProtected = existingFields.filter(f => !f.key || !protectedKeys.includes(f.key));
    const mergedProtected = PROTECTED_FIELDS.map(def => {
      const existing = existingProtected.find(f => f.key === def.key);
      return existing ? { ...def, visible: existing.visible, adminVisible: existing.adminVisible, required: existing.required } : def;
    });
    return { version: template.version, fields: [...mergedProtected, ...nonProtected], tags: template.tags || [] };
  }
}

export async function updateTemplate(tenantId: string, template: Template): Promise<void> {
  try {
    const db = await connectToDatabase();
    const secureTemplate = ensureProtectedFields(template);
    await db.collection('settings').updateOne(
      { type: 'template', tenantId },
      { $set: { template: secureTemplate } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
}

// ─── Objects ──────────────────────────────────────────────────────────────────

export async function getObjects(tenantId: string): Promise<SavedObject[]> {
  try {
    const db = await connectToDatabase();
    const results = await db.collection('objects').find({ tenantId }).toArray();
    return results.map(doc => {
      const obj: SavedObject = { id: doc._id.toString(), data: doc.data };
      if (doc.location) obj.location = doc.location;
      if (doc.hasIncompleteData) obj.hasIncompleteData = doc.hasIncompleteData;
      if (doc.missingFields?.length) obj.missingFields = doc.missingFields;
      return obj;
    });
  } catch (error) {
    console.error('Error getting objects:', error);
    return [];
  }
}

export async function getObjectById(tenantId: string, objectId: string): Promise<SavedObject | null> {
  try {
    const db = await connectToDatabase();
    const doc = await db.collection('objects').findOne({ _id: new ObjectId(objectId), tenantId });
    if (!doc) return null;
    const obj: SavedObject = {
      id: doc._id.toString(),
      location: doc.location || { type: 'Point', coordinates: [0, 0] },
      data: doc.data
    };
    if (doc.hasIncompleteData) obj.hasIncompleteData = doc.hasIncompleteData;
    return obj;
  } catch (error) {
    console.error('Error getting object by ID:', error);
    return null;
  }
}

export async function createObject(
  tenantId: string,
  location: GeoJSON.Point | null,
  data: ProjectData,
  hasIncompleteData?: boolean,
  missingFields?: string[]
): Promise<SavedObject> {
  try {
    const db = await connectToDatabase();
    const doc: Record<string, unknown> = { tenantId, data };
    if (location) doc.location = location;
    if (hasIncompleteData) doc.hasIncompleteData = hasIncompleteData;
    if (missingFields?.length) doc.missingFields = missingFields;

    const result = await db.collection('objects').insertOne(doc);
    const saved: SavedObject = { id: result.insertedId.toString(), data };
    if (location) saved.location = location;
    if (hasIncompleteData) saved.hasIncompleteData = hasIncompleteData;
    if (missingFields?.length) saved.missingFields = missingFields;
    return saved;
  } catch (error) {
    console.error('Error creating object:', error);
    throw error;
  }
}

export async function updateObject(
  tenantId: string,
  objectId: string,
  newData: ProjectData,
  location?: GeoJSON.Point
): Promise<SavedObject | null> {
  try {
    const db = await connectToDatabase();
    const updateFields: Record<string, unknown> = { data: newData };
    if (location) updateFields.location = location;

    const result = await db.collection('objects').updateOne(
      { _id: new ObjectId(objectId), tenantId },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) return null;

    const updatedDoc = await db.collection('objects').findOne({ _id: new ObjectId(objectId), tenantId });
    if (!updatedDoc) return null;

    const saved: SavedObject = {
      id: objectId,
      location: updatedDoc.location || { type: 'Point', coordinates: [0, 0] },
      data: newData
    };
    if (updatedDoc.hasIncompleteData) saved.hasIncompleteData = updatedDoc.hasIncompleteData;
    return saved;
  } catch (error) {
    console.error('Error updating object:', error);
    throw error;
  }
}

export async function deleteObject(tenantId: string, objectId: string): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    const result = await db.collection('objects').deleteOne({ _id: new ObjectId(objectId), tenantId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function createTag(tenantId: string, name: string, displayName: string, color: string): Promise<Tag> {
  try {
    const template = await getTemplate(tenantId);
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name,
      displayName,
      color,
      order: template.tags.length,
      visible: true
    };
    await updateTemplate(tenantId, { ...template, tags: [...template.tags, newTag] });
    return newTag;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
}

export async function updateTag(tenantId: string, tagId: string, updates: Partial<Tag>): Promise<void> {
  try {
    const template = await getTemplate(tenantId);
    await updateTemplate(tenantId, {
      ...template,
      tags: template.tags.map(tag => tag.id === tagId ? { ...tag, ...updates } : tag)
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
}

export async function deleteTag(
  tenantId: string,
  tagId: string
): Promise<{ success: boolean; error?: string; affectedPins?: string[] }> {
  try {
    const [template, objects] = await Promise.all([getTemplate(tenantId), getObjects(tenantId)]);
    const affectedPins = objects
      .filter(obj => (obj.data.tags as CategoryFieldData)?.majorTag === tagId)
      .map(obj => obj.id);

    if (affectedPins.length > 0) {
      return { success: false, error: 'Tag jest używany jako główny tag w niektórych pinezkach', affectedPins };
    }

    // Archive instead of hard-delete
    await updateTemplate(tenantId, {
      ...template,
      tags: template.tags.map(tag => tag.id === tagId ? { ...tag, visible: false } : tag)
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
}

export async function reorderTags(tenantId: string, tagIds: string[]): Promise<void> {
  try {
    const template = await getTemplate(tenantId);
    const reordered = tagIds.map((id, index) => {
      const tag = template.tags.find(t => t.id === id);
      if (!tag) throw new Error(`Tag with id ${id} not found`);
      return { ...tag, order: index };
    });
    await updateTemplate(tenantId, { ...template, tags: reordered });
  } catch (error) {
    console.error('Error reordering tags:', error);
    throw error;
  }
}

export async function getTagUsageStats(
  tenantId: string
): Promise<{ [tagId: string]: { majorCount: number; minorCount: number } }> {
  try {
    const objects = await getObjects(tenantId);
    const stats: { [tagId: string]: { majorCount: number; minorCount: number } } = {};
    for (const obj of objects) {
      const tagData = obj.data.tags as CategoryFieldData;
      if (!tagData) continue;
      if (tagData.majorTag) {
        stats[tagData.majorTag] ??= { majorCount: 0, minorCount: 0 };
        stats[tagData.majorTag].majorCount++;
      }
      for (const id of tagData.minorTags || []) {
        stats[id] ??= { majorCount: 0, minorCount: 0 };
        stats[id].minorCount++;
      }
    }
    return stats;
  } catch (error) {
    console.error('Error getting tag usage stats:', error);
    return {};
  }
}

// ─── Field migration (category/tags → selection) ──────────────────────────────

export interface MigrationResult {
  success: boolean;
  migratedPins: number;
  removedTags: string[];
  error?: string;
}

export interface MigrationPreview {
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'category' | 'tags';
  targetMode: 'hierarchical' | 'multi';
  tagCount: number;
  pinCount: number;
  willRemoveTags: boolean;
}

export async function getMigrationPreview(tenantId: string, fieldKey: string): Promise<MigrationPreview | null> {
  try {
    const [template, objects] = await Promise.all([getTemplate(tenantId), getObjects(tenantId)]);
    const field = template.fields.find(f => f.key === fieldKey || f.fieldName === fieldKey);
    if (!field) return null;

    const fieldType = field.fieldType || field.type;
    if (fieldType !== 'category' && fieldType !== 'tags') return null;

    const actualKey = field.key || field.fieldName;
    const pinCount = objects.filter(obj => obj.data[actualKey] && typeof obj.data[actualKey] === 'object').length;
    const otherLegacyFields = template.fields.filter(f => {
      const k = f.key || f.fieldName;
      const t = f.fieldType || f.type;
      return k !== actualKey && (t === 'category' || t === 'tags');
    });

    return {
      fieldKey: actualKey,
      fieldLabel: field.label || field.displayLabel || actualKey,
      fieldType: fieldType as 'category' | 'tags',
      targetMode: fieldType === 'category' ? 'hierarchical' : 'multi',
      tagCount: template.tags.filter(t => t.visible !== false).length,
      pinCount,
      willRemoveTags: otherLegacyFields.length === 0
    };
  } catch (error) {
    console.error('Error getting migration preview:', error);
    return null;
  }
}

export async function migrateFieldToSelection(tenantId: string, fieldKey: string): Promise<MigrationResult> {
  try {
    const db = await connectToDatabase();
    const template = await getTemplate(tenantId);

    const fieldIndex = template.fields.findIndex(f => f.key === fieldKey || f.fieldName === fieldKey);
    if (fieldIndex === -1) return { success: false, migratedPins: 0, removedTags: [], error: 'Nie znaleziono pola' };

    const field = template.fields[fieldIndex];
    const fieldType = field.fieldType || field.type;
    const actualKey = field.key || field.fieldName;

    if (fieldType !== 'category' && fieldType !== 'tags') {
      return { success: false, migratedPins: 0, removedTags: [], error: 'Pole nie jest typu category lub tags' };
    }

    const options: SelectionOption[] = template.tags.map(tag => ({
      id: tag.id, value: tag.displayName || tag.name, color: tag.color, order: tag.order, archived: tag.visible === false
    }));
    const config: SelectionConfig = { mode: fieldType === 'category' ? 'hierarchical' : 'multi', options, allowCustom: false };
    if (config.mode === 'hierarchical' && field.tagConfig?.maxMinorTags) config.maxSecondary = field.tagConfig.maxMinorTags;

    template.fields[fieldIndex] = { ...field, fieldType: 'selection', type: 'selection', config };
    delete template.fields[fieldIndex].tagConfig;

    const objects = await getObjects(tenantId);
    let migratedPins = 0;

    for (const obj of objects) {
      const oldData = obj.data[actualKey];
      if (!oldData || typeof oldData !== 'object') continue;

      let newData: SelectionFieldData;
      if ('majorTag' in oldData) {
        const c = oldData as CategoryFieldData;
        newData = { primary: c.majorTag, secondary: c.minorTags || [], customEntries: [] };
      } else if ('selectedTags' in oldData) {
        const t = oldData as TagsFieldData;
        newData = { selections: t.selectedTags || [], customEntries: [] };
      } else {
        continue;
      }

      // tenantId in filter ensures we never touch another tenant's documents
      await db.collection('objects').updateOne(
        { _id: new ObjectId(obj.id), tenantId },
        { $set: { [`data.${actualKey}`]: newData } }
      );
      migratedPins++;
    }

    const otherLegacyFields = template.fields.filter((f, i) => {
      if (i === fieldIndex) return false;
      const t = f.fieldType || f.type;
      return t === 'category' || t === 'tags';
    });
    const removedTags = otherLegacyFields.length === 0 ? template.tags.map(t => t.id) : [];
    if (otherLegacyFields.length === 0) template.tags = [];

    await updateTemplate(tenantId, template);
    return { success: true, migratedPins, removedTags };
  } catch (error) {
    console.error('Error migrating field to selection:', error);
    return { success: false, migratedPins: 0, removedTags: [], error: error instanceof Error ? error.message : 'Nieznany błąd' };
  }
}
