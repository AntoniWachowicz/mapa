import { getTemplate, updateTemplate, getObjects, createObject, deleteObject, updateObject } from '$lib/server/schemadb.js';
import type { Template, ProjectData } from '$lib/types.js';

export async function load() {
  try {
    // Make sure to await both calls
    const template = await getTemplate();
    const objects = await getObjects();
    
    console.log('Server loaded template:', template); // Add debug
    console.log('Server loaded objects:', objects); // Add debug
    
    return {
      template,
      objects
    };
  } catch (error) {
    console.error('Error loading data:', error);
    // Return proper defaults
    return {
      template: { 
        fields: [
          { key: 'title', label: 'Title', type: 'text', required: true, visible: true },
          { key: 'address', label: 'Address', type: 'text', required: false, visible: true },
          { key: 'coordinates', label: 'Coordinates (lat, lng)', type: 'text', required: false, visible: true }
        ]
      },
      objects: []
    };
  }
}

type RequestEvent = {
  request: Request;
};

export const actions = {
  updateTemplate: async ({ request }: RequestEvent) => {
    const data = await request.formData();
    const templateString = data.get('template');
    if (typeof templateString !== 'string') {
      throw new Error('Invalid template data');
    }
    const template: Template = JSON.parse(templateString);
    console.log('Updating template:', template); // Debug log
    await updateTemplate(template);
    console.log('Template updated successfully'); // Debug log
    return { success: true };
  },
  
  createObject: async ({ request }: RequestEvent) => {
    const data = await request.formData();
    const objectDataString = data.get('data');
    if (typeof objectDataString !== 'string') {
      throw new Error('Invalid object data');
    }
    const objectData: ProjectData = JSON.parse(objectDataString);
    await createObject(objectData);
    return { success: true };
  },
  
  deleteObject: async ({ request }: RequestEvent) => {
    const data = await request.formData();
    const objectId = data.get('id');
    if (typeof objectId !== 'string') {
      throw new Error('Invalid object ID');
    }
    await deleteObject(objectId);
    return { success: true };
  },

    updateObject: async ({ request }: RequestEvent) => {
      const data = await request.formData();
      const objectId = data.get('id');
      const objectDataString = data.get('data');
      
      if (typeof objectId !== 'string' || typeof objectDataString !== 'string') {
        throw new Error('Invalid update data');
      }
      
      const objectData: ProjectData = JSON.parse(objectDataString);
      const updatedObject = await updateObject(objectId, objectData);
      
      if (!updatedObject) {
        throw new Error('Object not found');
      }
      
      return { success: true };
    }
}