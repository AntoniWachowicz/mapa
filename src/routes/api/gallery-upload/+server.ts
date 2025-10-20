import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import path from 'path';
import fs from 'fs';
import { connectToDatabase } from '$lib/server/database.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      throw error(400, 'No image files provided');
    }

    const uploadDir = 'static/uploads/gallery';

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedImages = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        continue; // Skip files larger than 5MB
      }

      // Convert File to Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.name);
      const filename = 'gallery-' + uniqueSuffix + extension;

      // Write file
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, buffer);

      // Store metadata in database
      const db = await connectToDatabase();
      const collection = db.collection('gallery_images');

      const imageDoc = {
        filename,
        originalName: file.name,
        url: `/uploads/gallery/${filename}`,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date()
      };

      const result = await collection.insertOne(imageDoc);

      uploadedImages.push({
        id: result.insertedId.toString(),
        url: imageDoc.url,
        originalName: file.name
      });
    }

    return json({
      success: true,
      images: uploadedImages
    });

  } catch (err) {
    console.error('Gallery upload error:', err);
    throw error(500, 'Failed to upload images');
  }
};
