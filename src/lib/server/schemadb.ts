import { connectToDatabase } from './database.js';
import type { Template, SavedObject, ProjectData, Tag, CategoryFieldData, GeoJSON, Field } from '../types.js';

// Version 2 Protected Fields - Always present
const PROTECTED_FIELDS: Field[] = [
  {
    id: 'field_title',
    fieldType: 'title',
    fieldName: 'title',
    label: 'Tytuł',
    required: true,
    order: 0,
    // Legacy compatibility
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
    // Legacy compatibility
    key: 'location',
    displayLabel: 'Lokalizacja',
    type: 'text',
    visible: true,
    protected: true,
    adminVisible: true
  }
];

const DEFAULT_TEMPLATE: Template = {
  version: 2, // New system version
  fields: [...PROTECTED_FIELDS],
  tags: []
};

export async function getTemplate(): Promise<Template> {
  try {
    console.log('getTemplate called');
    const db = await connectToDatabase();
    console.log('Database connected for getTemplate');
    const collection = db.collection('settings');
    
    const result = await collection.findOne({ type: 'template' });
    console.log('Found template in database:', result ? 'YES' : 'NO');
    
    if (!result) {
      console.log('No template found, creating default template');
      await collection.insertOne({ 
        type: 'template', 
        template: DEFAULT_TEMPLATE 
      });
      console.log('Default template inserted');
      return DEFAULT_TEMPLATE;
    }
    
    console.log('Raw template from DB:', JSON.stringify(result.template, null, 2));
    
    // Always ensure essential fields are present
    const secureTemplate = ensureProtectedFields(result.template);
    
    // Update DB if we had to add missing essential fields
    if (JSON.stringify(secureTemplate) !== JSON.stringify(result.template)) {
      console.log('Template needs updating with missing fields');
      await collection.updateOne(
        { type: 'template' },
        { $set: { template: secureTemplate } }
      );
      console.log('Template updated with missing fields');
    }
    
    console.log('Returning template:', JSON.stringify(secureTemplate, null, 2));
    return secureTemplate;
  } catch (error) {
    console.error('Error getting template:', error);
    return DEFAULT_TEMPLATE;
  }
}

function ensureProtectedFields(template: Template): Template {
  const existingFields = template.fields || [];

  // Check if this is a version 2 schema
  const isV2 = template.version === 2;

  if (isV2) {
    // For version 2, just ensure title and location exist with new structure
    const protectedFieldNames = PROTECTED_FIELDS.map(f => f.fieldName);
    const existingProtected = existingFields.filter(f =>
      f.fieldName && protectedFieldNames.includes(f.fieldName)
    );
    const nonProtected = existingFields.filter(f =>
      !f.fieldName || !protectedFieldNames.includes(f.fieldName)
    );

    // Merge with defaults
    const mergedProtected = PROTECTED_FIELDS.map(defaultField => {
      const existing = existingProtected.find(f => f.fieldName === defaultField.fieldName);
      if (existing) {
        return {
          ...defaultField,
          label: existing.label,
          required: existing.required
        };
      }
      return defaultField;
    });

    return {
      version: 2,
      fields: [...mergedProtected, ...nonProtected],
      tags: template.tags || []
    };
  } else {
    // Legacy schema (version 1) - use key-based lookup
    const protectedFieldKeys = PROTECTED_FIELDS.map(f => f.key);
    const existingProtected = existingFields.filter(f =>
      f.key && protectedFieldKeys.includes(f.key)
    );
    const nonProtected = existingFields.filter(f =>
      !f.key || !protectedFieldKeys.includes(f.key)
    );

    const mergedProtected = PROTECTED_FIELDS.map(defaultField => {
      const existing = existingProtected.find(f => f.key === defaultField.key);
      if (existing) {
        return {
          ...defaultField,
          visible: existing.visible,
          adminVisible: existing.adminVisible,
          required: existing.required
        };
      }
      return defaultField;
    });

    return {
      version: template.version,
      fields: [...mergedProtected, ...nonProtected],
      tags: template.tags || []
    };
  }
}

export async function updateTemplate(template: Template): Promise<void> {
  try {
    console.log('updateTemplate called with:', JSON.stringify(template, null, 2));
    const db = await connectToDatabase();
    console.log('Database connected successfully');
    const collection = db.collection('settings');
    
    // Ensure essential fields are always present
    const secureTemplate = ensureProtectedFields(template);
    console.log('Secure template after ensuring fields:', JSON.stringify(secureTemplate, null, 2));
    
    const result = await collection.updateOne(
      { type: 'template' },
      { $set: { template: secureTemplate } },
      { upsert: true }
    );
    
    console.log('Update result:', result);
    console.log('Template updated successfully in database');
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
}

export async function getObjects(): Promise<SavedObject[]> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');

    const results = await collection.find({}).toArray();

    console.log('[getObjects] Found documents:', results.length);

    const mapped = results.map(doc => {
      const obj: SavedObject = {
        id: doc._id.toString(),
        location: doc.location || { type: 'Point', coordinates: [0, 0] }, // Fallback for legacy data
        data: doc.data
      };

      if (doc.hasIncompleteData) {
        obj.hasIncompleteData = doc.hasIncompleteData;
      }

      return obj;
    });

    console.log('[getObjects] Returning objects:', mapped.length);
    return mapped;
  } catch (error) {
    console.error('Error getting objects:', error);
    return [];
  }
}

export async function getObjectById(objectId: string): Promise<SavedObject | null> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');

    const { ObjectId } = await import('mongodb');

    const doc = await collection.findOne({ _id: new ObjectId(objectId) });

    if (!doc) {
      return null;
    }

    const obj: SavedObject = {
      id: doc._id.toString(),
      location: doc.location || { type: 'Point', coordinates: [0, 0] },
      data: doc.data
    };

    if (doc.hasIncompleteData) {
      obj.hasIncompleteData = doc.hasIncompleteData;
    }

    return obj;
  } catch (error) {
    console.error('Error getting object by ID:', error);
    return null;
  }
}

export async function createObject(location: GeoJSON.Point, data: ProjectData, hasIncompleteData?: boolean): Promise<SavedObject> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');

    const objectData: any = { location, data };
    if (hasIncompleteData) {
      objectData.hasIncompleteData = hasIncompleteData;
    }

    const result = await collection.insertOne(objectData);

    const savedObject: SavedObject = {
      id: result.insertedId.toString(),
      location,
      data
    };

    if (hasIncompleteData) {
      savedObject.hasIncompleteData = hasIncompleteData;
    }
    
    return savedObject;
  } catch (error) {
    console.error('Error creating object:', error);
    throw error;
  }
}

export async function updateObject(objectId: string, newData: ProjectData, location?: GeoJSON.Point): Promise<SavedObject | null> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');

    const { ObjectId } = await import('mongodb');

    // Build update object - only update location if provided
    const updateFields: any = { data: newData };
    if (location) {
      updateFields.location = location;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(objectId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return null;
    }

    // Fetch the complete updated object including location
    const updatedDoc = await collection.findOne({ _id: new ObjectId(objectId) });

    if (!updatedDoc) {
      return null;
    }

    const savedObject: SavedObject = {
      id: objectId,
      location: updatedDoc.location || { type: 'Point', coordinates: [0, 0] },
      data: newData
    };

    if (updatedDoc.hasIncompleteData) {
      savedObject.hasIncompleteData = updatedDoc.hasIncompleteData;
    }

    return savedObject;
  } catch (error) {
    console.error('Error updating object:', error);
    throw error;
  }
}

export async function deleteObject(objectId: string): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');

    const { ObjectId } = await import('mongodb');

    const result = await collection.deleteOne({ _id: new ObjectId(objectId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
}

// Tag-specific functions
export async function createTag(name: string, displayName: string, color: string): Promise<Tag> {
  try {
    const template = await getTemplate();
    
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name,
      displayName,
      color,
      order: template.tags.length,
      visible: true
    };
    
    const updatedTemplate: Template = {
      ...template,
      tags: [...template.tags, newTag]
    };
    
    await updateTemplate(updatedTemplate);
    return newTag;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
}

export async function updateTag(tagId: string, updates: Partial<Tag>): Promise<void> {
  try {
    const template = await getTemplate();
    
    const updatedTemplate: Template = {
      ...template,
      tags: template.tags.map(tag => 
        tag.id === tagId ? { ...tag, ...updates } : tag
      )
    };
    
    await updateTemplate(updatedTemplate);
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
}

export async function deleteTag(tagId: string): Promise<{ success: boolean; error?: string; affectedPins?: string[] }> {
  try {
    const template = await getTemplate();
    const objects = await getObjects();
    
    // Find pins using this tag as major tag
    const affectedPins: string[] = [];
    
    for (const obj of objects) {
      const tagData = obj.data.tags as CategoryFieldData;
      if (tagData && tagData.majorTag === tagId) {
        affectedPins.push(obj.id);
      }
    }
    
    // If tag is used as major tag, prevent deletion
    if (affectedPins.length > 0) {
      return {
        success: false,
        error: 'Tag jest używany jako główny tag w niektórych pinezkach',
        affectedPins
      };
    }
    
    // Archive the tag instead of deleting
    const updatedTemplate: Template = {
      ...template,
      tags: template.tags.map(tag => 
        tag.id === tagId ? { ...tag, visible: false } : tag
      )
    };
    
    await updateTemplate(updatedTemplate);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
}

export async function reorderTags(tagIds: string[]): Promise<void> {
  try {
    const template = await getTemplate();
    
    const reorderedTags = tagIds.map((id, index) => {
      const tag = template.tags.find(t => t.id === id);
      if (!tag) throw new Error(`Tag with id ${id} not found`);
      return { ...tag, order: index };
    });
    
    const updatedTemplate: Template = {
      ...template,
      tags: reorderedTags
    };
    
    await updateTemplate(updatedTemplate);
  } catch (error) {
    console.error('Error reordering tags:', error);
    throw error;
  }
}

export async function getTagUsageStats(): Promise<{ [tagId: string]: { majorCount: number; minorCount: number } }> {
  try {
    const objects = await getObjects();
    const stats: { [tagId: string]: { majorCount: number; minorCount: number } } = {};
    
    for (const obj of objects) {
      const tagData = obj.data.tags as CategoryFieldData;
      if (tagData) {
        // Count major tag usage
        if (tagData.majorTag) {
          if (!stats[tagData.majorTag]) {
            stats[tagData.majorTag] = { majorCount: 0, minorCount: 0 };
          }
          stats[tagData.majorTag].majorCount++;
        }
        
        // Count minor tag usage
        if (tagData.minorTags && Array.isArray(tagData.minorTags)) {
          for (const minorTagId of tagData.minorTags) {
            if (!stats[minorTagId]) {
              stats[minorTagId] = { majorCount: 0, minorCount: 0 };
            }
            stats[minorTagId].minorCount++;
          }
        }
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting tag usage stats:', error);
    return {};
  }
}
