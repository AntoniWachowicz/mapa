import { getTemplate, updateTemplate, getObjects, createObject, deleteObject, updateObject } from '$lib/server/schemadb.js';
import { fail } from '@sveltejs/kit';
import type { Template, ProjectData } from '$lib/types.js';

export async function load() {
  try {
    // Load template and objects in parallel for faster page loads
    const [template, objects] = await Promise.all([
      getTemplate(),
      getObjects()
    ]);

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
    try {
      const data = await request.formData();
      const templateString = data.get('template');
      if (typeof templateString !== 'string') {
        return fail(400, { error: 'Invalid template data' });
      }
      const template: Template = JSON.parse(templateString);
      await updateTemplate(template);
      return { success: true };
    } catch (error) {
      console.error('Error updating template:', error);
      return fail(500, { error: 'Failed to update template' });
    }
  },

  createObject: async ({ request }: RequestEvent) => {
    try {
      const data = await request.formData();
      const objectDataString = data.get('data');
      const locationString = data.get('location');
      const hasIncompleteDataString = data.get('hasIncompleteData');

      if (typeof objectDataString !== 'string') {
        return fail(400, { error: 'Invalid object data' });
      }

      const objectData: ProjectData = JSON.parse(objectDataString);
      const location = locationString ? JSON.parse(locationString as string) : { type: 'Point', coordinates: [0, 0] };
      const hasIncompleteData = hasIncompleteDataString === 'true';

      await createObject(location, objectData, hasIncompleteData);
      return { success: true };
    } catch (error) {
      console.error('Error creating object:', error);
      return fail(500, { error: 'Failed to create object' });
    }
  },

  deleteObject: async ({ request }: RequestEvent) => {
    try {
      const data = await request.formData();
      const objectId = data.get('id');
      if (typeof objectId !== 'string') {
        return fail(400, { error: 'Invalid object ID' });
      }
      await deleteObject(objectId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting object:', error);
      return fail(500, { error: 'Failed to delete object' });
    }
  },

  updateObject: async ({ request }: RequestEvent) => {
    try {
      const data = await request.formData();
      const objectId = data.get('id');
      const objectDataString = data.get('data');

      if (typeof objectId !== 'string' || typeof objectDataString !== 'string') {
        return fail(400, { error: 'Invalid update data' });
      }

      const objectData: ProjectData = JSON.parse(objectDataString);
      const updatedObject = await updateObject(objectId, objectData);

      if (!updatedObject) {
        return fail(404, { error: 'Object not found' });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating object:', error);
      return fail(500, { error: 'Failed to update object' });
    }
  }
}