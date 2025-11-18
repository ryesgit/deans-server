import express from 'express';
import { ESP32Controller } from '../esp32Controller.js';
import { logAccess, getAccessLogs } from '../prismaClient.js';

const router = express.Router();
const esp32Controller = new ESP32Controller();

router.post('/unlock', async (req, res) => {
  const { row, column, userId } = req.body;
  
  try {
    if (!row || !column) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['row', 'column']
      });
    }

    console.log(`🚪 Manual unlock request for Row ${row}, Column ${column}`);

    const result = await esp32Controller.unlockDoor(row, column);

    if (userId) {
      await logAccess(userId, null, 'manual_unlock', row, column, true);
    }

    res.json({
      success: true,
      message: 'Door unlocked successfully',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual unlock error:', error);

    if (userId) {
      await logAccess(userId, null, 'manual_unlock_failed', row, column, false);
    }

    res.status(500).json({
      error: 'Unlock failed',
      message: error.message
    });
  }
});

router.post('/lock', async (req, res) => {
  try {
    const { row, column, userId } = req.body;

    if (!row || !column) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['row', 'column']
      });
    }

    console.log(`🔒 Manual lock request for Row ${row}, Column ${column}`);

    const result = await esp32Controller.lockDoor(row, column);

    if (userId) {
      await logAccess(userId, null, 'manual_lock', row, column, true);
    }

    res.json({
      success: true,
      message: 'Door locked successfully',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual lock error:', error);
    res.status(500).json({
      error: 'Lock failed',
      message: error.message
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = await esp32Controller.getStatus();
    
    res.json({
      esp32: status,
      server: {
        status: 'running',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
});

router.post('/esp32/config', (req, res) => {
  try {
    const { ip, port = 80 } = req.body;

    if (!ip) {
      return res.status(400).json({
        error: 'IP address required',
        message: 'Please provide the ESP32 IP address'
      });
    }

    esp32Controller.setESP32IP(ip, port);

    res.json({
      message: 'ESP32 configuration updated',
      config: {
        ip: ip,
        port: port,
        url: `http://${ip}:${port}`
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Configuration update failed',
      message: error.message
    });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, userId } = req.query;
    
    const logs = await getAccessLogs(parseInt(limit), userId);

    res.json({
      message: 'Access logs retrieved successfully',
      count: logs.length,
      logs: logs
    });
  } catch (error) {
    console.error('Log retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

export default router;