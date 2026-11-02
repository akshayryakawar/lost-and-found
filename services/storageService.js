/**
 * Supabase Storage Service for Item Images
 */

const crypto = require('crypto');
const path = require('path');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate and upload image file to Supabase Storage bucket 'item-images'
 * @param {Object} file - Multer file object with buffer, mimetype, originalname
 * @returns {Promise<string>} Public image URL
 */
async function uploadItemImage(file) {
  if (!file) return null;

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image size exceeds maximum limit of 5MB.');
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.');
  }

  if (isSupabaseConfigured()) {
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `items/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    const { data, error } = await supabase.storage
      .from('item-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Retrieve public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  // Fallback when offline/mocking without Supabase
  return null;
}

module.exports = {
  uploadItemImage,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
