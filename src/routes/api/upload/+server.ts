import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import multer from 'multer';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'static/uploads';
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if the file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const uploadSingle = promisify(upload.single('image'));

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Convert request to Node.js format for multer
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      throw error(400, 'No image file provided');
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.name);
    const filename = 'image-' + uniqueSuffix + extension;
    const uploadDir = 'static/uploads';
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Write file
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    // Return the URL path (without 'static' prefix for web access)
    const imageUrl = `/uploads/${filename}`;
    
    return json({ 
      success: true, 
      imageUrl 
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    throw error(500, 'Failed to upload image');
  }
};