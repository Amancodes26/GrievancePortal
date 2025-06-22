import path from 'path';
import fs from 'fs';

export function sanitizeFilename(originalName: string): string {
  return originalName.replace(/[^a-z0-9.\-_]/gi, '_');
}

export function generateFilePath(originalName: string): string {
  const safeName = sanitizeFilename(originalName);
  const dateFolder = new Date().toISOString().split('T')[0]; // e.g., 2025-06-14
  
  // Use /tmp directory for Vercel serverless environment
  const baseDir = process.env.VERCEL ? '/tmp' : 'uploads';
  const dir = path.join(baseDir, 'attachments', dateFolder);
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create directory:', error);
    // Fallback to /tmp if available
    if (process.env.VERCEL && fs.existsSync('/tmp')) {
      const fallbackDir = path.join('/tmp', 'attachments', dateFolder);
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        return path.join(fallbackDir, `${Date.now()}-${safeName}`);
      } catch (fallbackError) {
        console.error('Failed to create fallback directory:', fallbackError);
        throw new Error('File system not available');
      }
    }
  }
  
  const finalPath = path.join(dir, `${Date.now()}-${safeName}`);
  return finalPath;
}
