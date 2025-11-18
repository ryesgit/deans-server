import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from './prismaClient.js';
import { ESP32Controller } from './esp32Controller.js';
import qrRoutes from './routes/qr.js';
import fileRoutes from './routes/files.js';
import doorRoutes from './routes/door.js';

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
  console.log(`📱 QR Code endpoint: http://localhost:${PORT}/api/qr/scan`);
  console.log(`🗂️  File management: http://localhost:${PORT}/api/files`);
  console.log(`🚪 Door control: http://localhost:${PORT}/api/door`);
});