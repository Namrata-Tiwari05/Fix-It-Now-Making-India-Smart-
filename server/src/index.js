import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import pincodeRoutes from './routes/pincode.js';
import complaintRoutes from './routes/complaints.js';
import municipalRoutes from './routes/municipal.js';
import officerRoutes from './routes/officer.js';
import masterRoutes from './routes/master.js';
import notificationRoutes from './routes/notifications.js';
import authRoutes from './routes/auth.js';
import locationRoutes from './routes/location.js';
import { errorHandler } from './middleware/errorHandler.js';
import { slaService } from './services/sla/slaService.js';
import { db } from './services/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve uploaded assets
const publicUploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(publicUploadsDir));

// Enable CORS for all local development web origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role', 'X-User-Id']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'FixItNow Civic Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api/municipalities/by-pincode', pincodeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/municipal', municipalRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Background SLA Scanner Job (runs every 60 seconds)
setInterval(() => {
  try {
    slaService.scanAndEscalate();
  } catch (e) {
    console.error('[Background SLA Worker Error]', e.message);
  }
}, 60000);

// Initialize database state from Supabase then start Server
db.init().catch(err => console.error('[Database Init Error]', err.message)).finally(() => {
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 FixItNow API Server running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Supabase Project URL: ${config.supabase.url}`);
  console.log(`   Endpoints registered:`);
  console.log(`   - PIN Jurisdiction: /api/municipalities/by-pincode/:pincode`);
  console.log(`   - Complaints API:   /api/complaints`);
  console.log(`   - Municipal Portal: /api/municipal`);
  console.log(`   - Field Officer:    /api/officer`);
  console.log(`   - Master Admin:     /api/master`);
  console.log(`   - Notifications:    /api/notifications`);
  });
});

export default app;
