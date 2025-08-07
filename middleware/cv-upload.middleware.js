import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

/**
 * CV Upload Middleware
 * Handles secure file upload with validation for CV files
 */

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'cv-analyzer');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename with timestamp and random hash
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `cv_${timestamp}_${randomHash}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Only PDF files are allowed'), false);
  }

  // Check file extension
  const allowedExtensions = ['.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid file extension. Only .pdf files are allowed'), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

/**
 * Middleware to handle CV file upload
 */
export const uploadCV = (req, res, next) => {
  const uploadSingle = upload.single('cv');
  
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle Multer-specific errors
      let message = 'File upload error';
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'File size too large. Maximum size is 10MB';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Too many files. Only one file is allowed';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Unexpected field name. Use "cv" as the field name';
          break;
        default:
          message = err.message;
      }
      
      console.error('Multer upload error:', err);
      return res.status(400).json({
        success: false,
        message,
        code: err.code
      });
    } else if (err) {
      // Handle custom errors (e.g., from fileFilter)
      console.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Log successful upload details
    if (req.file) {
      console.log('File uploaded successfully:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      // Verify file exists on disk and add additional checks
      if (fs.existsSync(req.file.path)) {
        console.log('File confirmed to exist at:', req.file.path);
        
        // Check file size on disk
        const stats = fs.statSync(req.file.path);
        console.log('File size on disk:', stats.size, 'bytes');
        
        if (stats.size !== req.file.size) {
          console.warn('File size mismatch! Expected:', req.file.size, 'Actual:', stats.size);
        }
        
        // Check if file is readable
        try {
          fs.accessSync(req.file.path, fs.constants.R_OK);
          console.log('File is readable');
        } catch (readError) {
          console.error('File is not readable:', readError);
          return res.status(500).json({
            success: false,
            message: 'Uploaded file is not readable'
          });
        }
      } else {
        console.error('CRITICAL: File does not exist at path:', req.file.path);
        return res.status(500).json({
          success: false,
          message: 'File upload failed - file not found on server'
        });
      }
    } else {
      console.log('No file in req.file after upload');
    }
    
    // File uploaded successfully
    next();
  });
};

/**
 * Middleware to validate CV upload request body
 */
export const validateCVUploadRequest = (req, res, next) => {
  const { experienceLevel, major } = req.body;
  
  // Validate required fields
  if (!experienceLevel) {
    return res.status(400).json({
      success: false,
      message: 'Experience level is required',
      field: 'experienceLevel'
    });
  }
  
  if (!major) {
    return res.status(400).json({
      success: false,
      message: 'Major field is required',
      field: 'major'
    });
  }
  
  // Validate experience level enum
  const validExperienceLevels = ['entry', 'mid', 'senior', 'executive'];
  if (!validExperienceLevels.includes(experienceLevel)) {
    return res.status(400).json({
      success: false,
      message: `Invalid experience level. Must be one of: ${validExperienceLevels.join(', ')}`,
      field: 'experienceLevel',
      validValues: validExperienceLevels
    });
  }
  
  // Validate major length
  if (major.trim().length < 2 || major.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Major field must be between 2 and 100 characters',
      field: 'major'
    });
  }
  
  // Validate optional jobId if provided
  if (req.body.jobId && !req.body.jobId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid job ID format',
      field: 'jobId'
    });
  }
  
  next();
};

/**
 * Middleware to clean up uploaded file on error
 */
export const cleanupOnError = (err, req, res, next) => {
  // Clean up uploaded file if there's an error after upload
  if (req.file?.path) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Failed to cleanup uploaded file:', unlinkErr);
      }
    });
  }
  
  next(err);
};

/**
 * Rate limiting middleware for CV uploads
 */
export const rateLimitCVUpload = (req, res, next) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const userId = req.user._id.toString();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxUploads = 5; // Max 5 uploads per minute
  
  if (!global.uploadRateLimit) {
    global.uploadRateLimit = new Map();
  }
  
  const userUploads = global.uploadRateLimit.get(userId) || [];
  
  // Clean old entries
  const validUploads = userUploads.filter(timestamp => now - timestamp < windowMs);
  
  if (validUploads.length >= maxUploads) {
    return res.status(429).json({
      success: false,
      message: 'Too many upload requests. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
  
  // Add current upload
  validUploads.push(now);
  global.uploadRateLimit.set(userId, validUploads);
  
  next();
};

export default {
  uploadCV,
  validateCVUploadRequest,
  cleanupOnError,
  rateLimitCVUpload
};
