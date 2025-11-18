import express from 'express';
import { getFileLocation, logAccess, updateFileAccess, checkUserExists } from '../prismaClient.js';
import { ESP32Controller } from '../esp32Controller.js';

const router = express.Router();
const esp32Controller = new ESP32Controller();

router.post('/scan', async (req, res) => {
  try {
    const { userId, filename } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        message: 'Please provide a valid user ID from the QR code'
      });
    }

    console.log(`🔍 QR Code scanned for user: ${userId}${filename ? `, file: ${filename}` : ''}`);

    // Check if user exists first
    const userExists = await checkUserExists(userId);
    
    if (!userExists) {
      console.log(`❌ Access denied for user: ${userId} - not registered`);
      return res.status(404).json({
        error: 'Access denied',
        message: 'User has no files to return or is not registered in the system'
      });
    }

    const fileData = await getFileLocation(userId, filename);

    if (!fileData) {
      // User exists but has no available files (either no files or all files are RETRIEVED)
      console.log(`❌ Access denied for user: ${userId} - no available files`);
      return res.status(404).json({
        error: 'Access denied',
        message: 'No available files to retrieve. Files may already be retrieved or user not registered.'
      });
    }

    const { row_position, column_position, name, department, filename: foundFilename } = fileData;

    console.log(`📁 File found: ${foundFilename} at Row ${row_position}, Column ${column_position}`);

    try {
      const unlockResult = await esp32Controller.unlockDoor(row_position, column_position);
      
      await logAccess(userId, fileData.id, 'retrieve', row_position, column_position, true);
      await updateFileAccess(fileData.id);

      res.json({
        success: true,
        message: 'Door unlocked successfully',
        user: {
          id: userId,
          name: name,
          department: department
        },
        file: {
          filename: foundFilename,
          row: row_position,
          column: column_position,
          shelf: fileData.shelf_number
        },
        esp32Response: unlockResult,
        timestamp: new Date().toISOString()
      });

    } catch (esp32Error) {
      console.error('ESP32 communication error:', esp32Error);
      
      await logAccess(userId, fileData.id, 'retrieve', row_position, column_position, false);

      res.status(500).json({
        error: 'Door unlock failed',
        message: 'ESP32 communication error',
        user: {
          id: userId,
          name: name,
          department: department
        },
        file: {
          filename: foundFilename,
          row: row_position,
          column: column_position,
          shelf: fileData.shelf_number
        },
        esp32Error: esp32Error.message
      });
    }

  } catch (error) {
    console.error('QR scan processing error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to process QR code scan',
      details: error.message
    });
  }
});

router.get('/test/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { filename } = req.query;

    const result = await getFileLocation(userId, filename);
    
    if (!result) {
      return res.status(404).json({
        error: 'File not found',
        userId,
        filename
      });
    }

    res.json({
      message: 'Test lookup successful',
      data: result
    });

  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

export default router;