import express from 'express';
import { logAccess, checkUserExists, getUserFiles, returnFile } from '../prismaClient.js';
import { esp32Controller } from '../esp32Controller.js';
import { prisma } from '../prismaClient.js';

const router = express.Router();
const ACTIONABLE_FILE_STATUSES = ['CHECKED_OUT', 'RETRIEVED'];

const getApprovedRequestsForUser = async (userId, targetFileId = null) => {
  const whereClause = {
    userId,
    status: 'APPROVED',
    fileId: targetFileId ?? { not: null }
  };

  return prisma.request.findMany({
    where: whereClause,
    orderBy: [
      { approvedAt: 'desc' },
      { createdAt: 'desc' }
    ],
    select: {
      id: true,
      fileId: true,
      title: true,
      approvedAt: true,
      createdAt: true
    }
  });
};

const resolveActionableFile = async (userId, requestedFileId = null) => {
  const normalizedFileId = requestedFileId ? parseInt(requestedFileId, 10) : null;
  const approvedRequests = await getApprovedRequestsForUser(userId, normalizedFileId);

  if (!approvedRequests.length) {
    return null;
  }

  const actionableFileIds = [...new Set(
    approvedRequests
      .map((request) => request.fileId)
      .filter((fileId) => Number.isInteger(fileId))
  )];

  if (!actionableFileIds.length) {
    return null;
  }

  const files = await prisma.file.findMany({
    where: {
      id: normalizedFileId ?? { in: actionableFileIds },
      userId,
      status: { in: ACTIONABLE_FILE_STATUSES }
    },
    include: {
      user: {
        select: {
          name: true,
          department: true
        }
      }
    }
  });

  const fileById = new Map(files.map((file) => [file.id, file]));

  for (const request of approvedRequests) {
    const file = fileById.get(request.fileId);
    if (file) {
      return { file, request };
    }
  }

  return null;
};

router.post('/scan', async (req, res) => {
  try {
    const { userId, fileId } = req.body;

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

    const actionableFile = await resolveActionableFile(userId, fileId);

    if (!actionableFile) {
      console.log(`❌ Access denied for user: ${userId} - no files to pickup or return`);
      return res.status(404).json({
        error: 'Access denied',
        message: 'No files available for pickup or return. Please request access from admin first.'
      });
    }

    const {
      file,
      request
    } = actionableFile;
    const {
      rowPosition,
      columnPosition,
      filename,
      status
    } = file;
    const isReturn = status === 'RETRIEVED';
    const actionType = isReturn ? 'return' : 'pickup';
    const borrowerName = file.user?.name || 'Unknown';
    const borrowerDepartment = file.user?.department || 'Unknown';

    console.log(`📁 Matched request ${request.id} to file ${filename} for user ${userId}`);
    console.log(`Processing file: ${filename} at Row ${rowPosition}, Column ${columnPosition} (${actionType})`);

    const results = [];

    try {
      const unlockResult = await esp32Controller.unlockDoor(rowPosition, columnPosition);

      if (isReturn) {
        const returnResult = await returnFile(userId, file.id);
        if (!returnResult.success) {
          console.error(`Failed to return file ${filename}:`, returnResult.message);
        }
        console.log(`📥 File ${filename} returned and set to AVAILABLE. Requests expired: ${returnResult.requestsExpired || 0}`);
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
          id: file.id,
          filename,
          row: rowPosition,
          column: columnPosition,
          shelf: file.shelfNumber
        },
        requestId: request.id,
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
          id: file.id,
          filename,
          row: rowPosition,
          column: columnPosition,
          shelf: file.shelfNumber
        },
        requestId: request.id,
        esp32Error: esp32Error.message,
      });
    }

    const successfulOperations = results.filter(r => r.success);
    const failedOperations = results.filter(r => !r.success);
    const pickupCount = successfulOperations.filter(r => r.action === 'pickup').length;
    const returnCount = successfulOperations.filter(r => r.action === 'return').length;

    res.json({
      success: failedOperations.length === 0,
      message: `Processed 1 file. ${successfulOperations.length} succeeded (${pickupCount} pickup, ${returnCount} return), ${failedOperations.length} failed.`,
      user: {
        id: userId,
        name: borrowerName,
        department: borrowerDepartment
      },
      successfulOperations,
      failedOperations,
      summary: {
        total: 1,
        pickups: pickupCount,
        returns: returnCount,
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
