import express from 'express';
import { getAvailableFilesForUser, getRetrievedFilesForUser, logAccess, updateFileAccess, checkUserExists, getUserFiles } from '../prismaClient.js';
import { ESP32Controller } from '../esp32Controller.js';
import { prisma } from '../prismaClient.js';

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
        message: 'User is not registered in the system'
      });
    }

    const checkedOutFiles = await getAvailableFilesForUser(userId);
    const retrievedFiles = await getRetrievedFilesForUser(userId);

    const allFiles = [...checkedOutFiles, ...retrievedFiles];

    if (!allFiles || allFiles.length === 0) {
      console.log(`❌ Access denied for user: ${userId} - no files to pickup or return`);
      return res.status(404).json({
        error: 'Access denied',
        message: 'No files available for pickup or return. Please request access from admin first.'
      });
    }

    console.log(`📁 Found ${allFiles.length} files for user ${userId} (${checkedOutFiles.length} to pickup, ${retrievedFiles.length} to return)`);

    const results = [];
    for (const file of allFiles) {
      const { rowPosition, columnPosition, name, department, filename, status } = file;
      const isReturn = status === 'RETRIEVED';
      const actionType = isReturn ? 'return' : 'pickup';

      console.log(`Processing file: ${filename} at Row ${rowPosition}, Column ${columnPosition} (${actionType})`);

      try {
        const unlockResult = await esp32Controller.unlockDoor(rowPosition, columnPosition);

        if (isReturn) {
          await prisma.file.update({
            where: { id: file.id },
            data: { status: 'AVAILABLE' }
          });
          await logAccess(userId, file.id, 'return', rowPosition, columnPosition, true);
          console.log(`📥 File ${filename} returned and set to AVAILABLE`);
        } else {
          await prisma.file.update({
            where: { id: file.id },
            data: { status: 'RETRIEVED' }
          });
          await logAccess(userId, file.id, 'retrieve', rowPosition, columnPosition, true);
          console.log(`📤 File ${filename} retrieved and set to RETRIEVED`);
        }

        results.push({
          success: true,
          action: actionType,
          file: {
            filename,
            row: rowPosition,
            column: columnPosition,
            shelf: file.shelfNumber
          },
          esp32Response: unlockResult,
        });

        console.log(`⏳ Waiting 3 seconds before auto-lock for Row ${rowPosition}, Column ${columnPosition}...`);
        setTimeout(async () => {
          try {
            console.log(`🔒 Auto-locking Row ${rowPosition}, Column ${columnPosition}`);
            await esp32Controller.lockDoor(rowPosition, columnPosition);
            await logAccess(userId, file.id, 'auto_lock', rowPosition, columnPosition, true);
            console.log(`✅ Auto-lock completed for Row ${rowPosition}, Column ${columnPosition}`);
          } catch (lockError) {
            console.error(`❌ Auto-lock failed for Row ${rowPosition}, Column ${columnPosition}:`, lockError.message);
          }
        }, 3000);

      } catch (esp32Error) {
        console.error(`ESP32 communication error for file ${filename}:`, esp32Error);

        await logAccess(userId, file.id, actionType, rowPosition, columnPosition, false);

        results.push({
          success: false,
          action: actionType,
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

    const successfulOperations = results.filter(r => r.success);
    const failedOperations = results.filter(r => !r.success);
    const pickups = successfulOperations.filter(r => r.action === 'pickup');
    const returns = successfulOperations.filter(r => r.action === 'return');

    res.json({
      success: failedOperations.length === 0,
      message: `Processed ${allFiles.length} files. ${successfulOperations.length} succeeded (${pickups.length} pickups, ${returns.length} returns), ${failedOperations.length} failed.`,
      user: {
        id: userId,
        name: allFiles[0].name,
        department: allFiles[0].department
      },
      successfulOperations,
      failedOperations,
      summary: {
        total: allFiles.length,
        pickups: pickups.length,
        returns: returns.length,
        failed: failedOperations.length
      },
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