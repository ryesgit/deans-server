import express from 'express';
import { getUserFiles, getAllFiles, addFile, searchFiles, returnFile } from '../prismaClient.js';
import { ESP32Controller } from '../esp32Controller.js';

const router = express.Router();

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