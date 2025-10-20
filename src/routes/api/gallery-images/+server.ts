import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { connectToDatabase } from '$lib/server/database.js';

export const GET: RequestHandler = async () => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('gallery_images');

    const images = await collection.find({}).sort({ uploadedAt: -1 }).toArray();

    const formattedImages = images.map(img => ({
      id: img._id.toString(),
      filename: img.filename,
      originalName: img.originalName,
      url: img.url,
      uploadedAt: img.uploadedAt
    }));

    return json({
      success: true,
      images: formattedImages
    });

  } catch (err) {
    console.error('Error fetching gallery images:', err);
    return json({
      success: false,
      images: []
    });
  }
};
