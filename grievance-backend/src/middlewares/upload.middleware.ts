import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Use /tmp directory for Vercel serverless environment
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads', 'grievances');

// Create directory if it doesn't exist (only in development or if /tmp is available)
if (!process.env.VERCEL || (process.env.VERCEL && fs.existsSync('/tmp'))) {
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create upload directory:', error);
    }
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists before saving
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create upload directory:', error);
        return cb(new Error('Upload directory not available'), uploadDir);
      }
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(8).toString('hex') + ext;
    cb(null, name);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});
