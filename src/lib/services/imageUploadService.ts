/**
 * Image Upload Service
 * Handles image file uploads with validation.
 */

export interface ImageUploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload an image file to the server
 * Validates file type and size before uploading
 */
export async function uploadImage(file: File): Promise<ImageUploadResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      error: 'Proszę wybrać plik obrazu'
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: 'Plik jest za duży. Maksymalny rozmiar to 5MB'
    };
  }

  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success && result.imageUrl) {
      return {
        success: true,
        imageUrl: result.imageUrl
      };
    } else {
      return {
        success: false,
        error: 'Błąd podczas przesyłania obrazu'
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Błąd podczas przesyłania obrazu'
    };
  }
}
