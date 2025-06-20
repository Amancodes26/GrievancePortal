import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// For Vercel compatibility - use temp directory
const getUploadPath = () => {
  if (process.env.VERCEL) {
    // Use /tmp directory on Vercel
    const tempDir = '/tmp/attachments';
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch (error) {
        console.warn('Could not create upload directory:', error);
        return '/tmp';
      }
    }
    return tempDir;
  } else {
    // Use local uploads directory in development
    const uploadPath = path.join(__dirname, '../../uploads/attachments');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    return uploadPath;
  }
};

// Validate file content by checking magic numbers (file headers)
const validateFileContent = (filePath: string, mimetype: string): boolean => {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check PDF magic numbers
    if (mimetype === 'application/pdf') {
      // PDF files start with %PDF
      return buffer.slice(0, 4).toString() === '%PDF';
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename: string): string => {
  // Remove any path separators and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .substring(0, 100); // Limit filename length
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = getUploadPath();
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const sanitizedName = sanitizeFilename(file.originalname);
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const uniqueName = `${uniqueId}-${sanitizedName}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB limit as requested
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      // Additional check for file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.pdf') {
        cb(null, true);
      } else {
        cb(new Error('File extension must be .pdf'));
      }
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Middleware to validate file content after upload
export const validateUploadedFile = (req: any, res: any, next: any) => {
  if (req.file) {
    const isValid = validateFileContent(req.file.path, req.file.mimetype);
    if (!isValid) {
      // Delete the invalid file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Invalid file content. File does not match expected PDF format.' 
      });
    }
  }
  next();
};
