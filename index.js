import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from './prismaClient.js';
import { ESP32Controller } from './esp32Controller.js';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await initializeDatabase();

const esp32Controller = new ESP32Controller();

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

app.listen(PORT, () => {
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
});