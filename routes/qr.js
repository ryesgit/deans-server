import express from 'express';
import { getAvailableFilesForUser, logAccess, updateFileAccess, checkUserExists, getUserFiles } from '../prismaClient.js';
import { ESP32Controller } from '../esp32Controller.js';

const router = express.Router();
const esp32Controller = new ESP32Controller();

router.post('/scan', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        message: 'Please provide a valid user ID from the QR code'
      });
    }

    console.log(`🔍 QR Code scanned for user: ${userId}`);

    const userExists = await checkUserExists(userId);
    
    if (!userExists) {
      console.log(`❌ Access denied for user: ${userId} - not registered`);
      return res.status(404).json({
        error: 'Access denied',
        message: 'User has no files to return or is not registered in the system'
      });
    }

    const files = await getAvailableFilesForUser(userId);

    if (!files || files.length === 0) {
      console.log(`❌ Access denied for user: ${userId} - no available files`);
      return res.status(404).json({
        error: 'Access denied',
        message: 'No available files to retrieve. Files may already be retrieved or user not registered.'
      });
    }

    console.log(`📁 Found ${files.length} files for user ${userId}`);

    const results = [];
    for (const file of files) {
      const { rowPosition, columnPosition, name, department, filename } = file;
      console.log(`Processing file: ${filename} at Row ${rowPosition}, Column ${columnPosition}`);

      try {
        const unlockResult = await esp32Controller.unlockDoor(rowPosition, columnPosition);
        
        await logAccess(userId, file.id, 'retrieve', rowPosition, columnPosition, true);
        await updateFileAccess(file.id);

        results.push({
          success: true,
          file: {
            filename,
            row: rowPosition,
            column: columnPosition,
            shelf: file.shelfNumber
          },
          esp32Response: unlockResult,
        });

      } catch (esp32Error) {
        console.error(`ESP32 communication error for file ${filename}:`, esp32Error);
        
        await logAccess(userId, file.id, 'retrieve', rowPosition, columnPosition, false);

        results.push({
          success: false,
          error: 'Door unlock failed',
          message: 'ESP32 communication error',
          file: {
            filename,
            row: rowPosition,
            column: columnPosition,
            shelf: file.shelfNumber
          },
          esp32Error: esp32Error.message,
        });
      }
    }

    const successfulRetrievals = results.filter(r => r.success);
    const failedRetrievals = results.filter(r => !r.success);

    res.json({
      success: failedRetrievals.length === 0,
      message: `Processed ${files.length} files. ${successfulRetrievals.length} succeeded, ${failedRetrievals.length} failed.`,
      user: {
        id: userId,
        name: files[0].name,
        department: files[0].department
      },
      successfulRetrievals,
      failedRetrievals,
      timestamp: new Date().toISOString()
    });

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

    const result = await getUserFiles(userId);
    
    if (!result || result.length === 0) {
      return res.status(404).json({
        error: 'File not found',
        userId,
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