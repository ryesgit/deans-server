import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from './prismaClient.js';
import { esp32Controller } from './esp32Controller.js';

// Import routes
import qrRoutes from './routes/qr.js';
import fileRoutes from './routes/files.js';
import doorRoutes from './routes/door.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';
import categoryRoutes from './routes/categories.js';
import requestRoutes from './routes/requests.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import { streamObject } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const server = createServer(app);

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

await initializeDatabase();
esp32Controller.attachServer(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/door', doorRoutes);

app.get('/seed-files/:filename', async (req, res) => {
  try {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const streamed = await streamObject(`seed-files/${req.params.filename}`, res, {
      downloadName: req.params.filename,
      inline: true,
    });
    if (!streamed && !res.headersSent) {
      res.status(404).json({
        error: 'File not found',
        message: 'Seed file not found in storage',
      });
    }
  } catch (error) {
    console.error('Seed file stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to load seed file',
        message: error.message,
      });
    }
  }
});

app.get('/qrcodes/:filename', async (req, res) => {
  try {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const streamed = await streamObject(`qrcodes/${req.params.filename}`, res, {
      downloadName: req.params.filename,
      inline: true,
    });
    if (!streamed && !res.headersSent) {
      res.status(404).json({
        error: 'QR code not found',
        message: 'QR code not found in storage',
      });
    }
  } catch (error) {
    console.error('QR code stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to load QR code',
        message: error.message,
      });
    }
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    esp32Connected: esp32Controller.isConnected()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 PUP Filing System Backend running on port ${PORT}`);
  console.log(`\n📚 API Endpoints:`);
  console.log(`🔐 Authentication: http://localhost:${PORT}/api/auth/login`);
  console.log(`👥 User management: http://localhost:${PORT}/api/users`);
  console.log(`📊 Dashboard stats: http://localhost:${PORT}/api/stats/dashboard`);
  console.log(`📁 Categories: http://localhost:${PORT}/api/categories`);
  console.log(`📋 Requests: http://localhost:${PORT}/api/requests`);
  console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(`⚙️  Settings: http://localhost:${PORT}/api/settings`);
  console.log(`📈 Reports: http://localhost:${PORT}/api/reports/generate`);
  console.log(`📱 QR Code: http://localhost:${PORT}/api/qr/scan`);
  console.log(`🗂️  Files: http://localhost:${PORT}/api/files`);
  console.log(`🚪 Door control: http://localhost:${PORT}/api/door`);
  console.log(`🔌 ESP32 websocket: ws://localhost:${PORT}${process.env.ESP32_WS_PATH || '/api/esp32/ws'}`);
});
