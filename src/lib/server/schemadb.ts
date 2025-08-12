import { connectToDatabase } from './database.js';
import type { Template, SavedObject, ProjectData } from '../types.js';

const DEFAULT_TEMPLATE: Template = { 
  fields: [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      visible: true
    },
    {
      key: 'address',
      label: 'Address',
      type: 'text',
      required: false,
      visible: true
    },
    {
      key: 'coordinates',
      label: 'Coordinates (lat, lng)',
      type: 'text',
      required: false,
      visible: true
    }
  ]
};

export async function getTemplate(): Promise<Template> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('settings');
    
    const result = await collection.findOne({ type: 'template' });
    
    // if (result) {
    //   return result.template;
    // }

    await collection.updateOne(
      { type: 'template' },
      { $set: { template: DEFAULT_TEMPLATE } },
      { upsert: true }
    );

    if (!result) {
      await collection.insertOne({ 
        type: 'template', 
        template: DEFAULT_TEMPLATE 
      });
      return DEFAULT_TEMPLATE;
    }
    
    return result.template;
  } catch (error) {
    console.error('Error getting template:', error);
    return DEFAULT_TEMPLATE;
  }
}

export async function updateTemplate(template: Template): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('settings');
    
    await collection.updateOne(
      { type: 'template' },
      { $set: { template } },
      { upsert: true }
    );
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
    
    return results.map(doc => ({
      id: doc._id.toString(),
      data: doc.data
    }));
  } catch (error) {
    console.error('Error getting objects:', error);
    return [];
  }
}

export async function createObject(data: ProjectData): Promise<SavedObject> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');
    
    const result = await collection.insertOne({ data });
    
    return {
      id: result.insertedId.toString(),
      data
    };
  } catch (error) {
    console.error('Error creating object:', error);
    throw error;
  }
}

export async function updateObject(objectId: string, newData: ProjectData): Promise<SavedObject | null> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');
    
    const { ObjectId } = await import('mongodb');
    
    const result = await collection.updateOne(
      { _id: new ObjectId(objectId) },
      { $set: { data: newData } }
    );
    
    if (result.matchedCount === 0) {
      return null;
    }
    
    return {
      id: objectId,
      data: newData
    };
  } catch (error) {
    console.error('Error updating object:', error);
    throw error;
  }
}

export async function deleteObject(objectId: string): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('objects');
    
    const { ObjectId } = await import('mongodb');
    
    await collection.deleteOne({ _id: new ObjectId(objectId) });
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
}
