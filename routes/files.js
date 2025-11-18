import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getUserFiles, getAllFiles, addFile, searchFiles, returnFile, prisma } from '../prismaClient.js';
import { ESP32Controller } from '../esp32Controller.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

// Upload file endpoint
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    const {
      userId,
      filename,
      rowPosition,
      columnPosition,
      shelfNumber,
      categoryId,
      fileType
    } = req.body;

    // Use authenticated user's ID if not admin
    const targetUserId = req.user.role === 'ADMIN' && userId ? userId : req.user.userId;

    const fileUrl = `/api/files/download/${req.file.filename}`;
    const finalFilename = filename || req.file.originalname;
    const finalFileType = fileType || path.extname(req.file.originalname).substring(1);

    const result = await addFile(
      targetUserId,
      finalFilename,
      rowPosition,
      columnPosition,
      shelfNumber,
      categoryId,
      finalFileType,
      fileUrl
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      fileId: result.fileId,
      file: {
        userId: targetUserId,
        filename: finalFilename,
        fileUrl,
        fileType: finalFileType,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file if database insert failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

// Download file endpoint
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Get file info from database to check permissions
    const file = await prisma.file.findFirst({
      where: {
        fileUrl: {
          contains: filename
        }
      }
    });

    // Send file
    res.download(filePath, file ? file.filename : filename, (err) => {
      if (err) {
        console.error('File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to download file',
            message: err.message
          });
        }
      }
    });

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      error: 'Failed to download file',
      message: error.message
    });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const files = await getUserFiles(userId);
    
    if (files.length === 0) {
      return res.status(404).json({
        message: 'No files found for this user',
        userId: userId,
        files: []
      });
    }

    res.json({
      message: 'Files retrieved successfully',
      userId: userId,
      count: files.length,
      files: files
    });

  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve files',
      message: error.message
    });
  }
});

router.get('/all', async (req, res) => {
  try {
    const files = await getAllFiles();

    res.json({
      message: 'All files retrieved successfully',
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to retrieve all files',
      message: error.message
    });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { userId, filename, rowPosition, columnPosition, shelfNumber = 1, categoryId, fileType, fileUrl } = req.body;

    if (!userId || !filename) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'filename']
      });
    }

    const result = await addFile(userId, filename, rowPosition, columnPosition, shelfNumber, categoryId, fileType, fileUrl);

    res.status(201).json({
      message: 'File added successfully',
      fileId: result.fileId,
      file: {
        userId,
        filename,
        rowPosition,
        columnPosition,
        shelfNumber,
        categoryId,
        fileType,
        fileUrl
      }
    });
  } catch (error) {
    console.error('File creation error:', error);
    res.status(500).json({
      error: 'Failed to add file',
      message: error.message
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, userId } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query parameter "q"'
      });
    }

    const files = await searchFiles(q, userId);

    res.json({
      message: 'Search completed successfully',
      query: q,
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

router.post('/return', async (req, res) => {
  try {
    const { userId, fileId, rowPosition, columnPosition } = req.body;

    if (!userId || !fileId || !rowPosition || !columnPosition) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'fileId', 'rowPosition', 'columnPosition']
      });
    }

    const result = await returnFile(userId, fileId);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.message
      });
    }

    const esp32 = new ESP32Controller();
    const lockResult = await esp32.lockDoor(rowPosition, columnPosition);

    res.json({
      message: 'File returned successfully',
      fileId: result.fileId,
      doorLocked: lockResult.success,
      lockMessage: lockResult.message
    });

  } catch (error) {
    console.error('File return error:', error);
    res.status(500).json({
      error: 'Failed to return file',
      message: error.message
    });
  }
});

export default router;