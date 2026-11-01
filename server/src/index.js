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

// Configurable CORS for production Vercel frontends & local development
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '';
const customOrigins = rawAllowedOrigins.split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || customOrigins.includes('*') || customOrigins.length === 0) {
      return callback(null, true);
    }
    if (customOrigins.includes(origin) || /\.vercel\.app$/.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not permitted by CORS policy: ' + origin));
  },
  credentials: true,
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

// Root status endpoint for browser and API probes
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FixItNow Civic Backend</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 600px; width: 100%; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: #059669; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    h1 { margin: 0 0 8px 0; font-size: 24px; color: #ffffff; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0; }
    .links { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .btn { display: flex; align-items: center; justify-content: space-between; background: #334155; color: #f8fafc; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; transition: background 0.2s; }
    .btn:hover { background: #475569; }
    .btn-primary { background: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; }
    .footer { margin-top: 24px; font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">● Server Online</span>
    <h1>FixItNow Civic Backend API</h1>
    <p>The Express civic backend is running healthy on <code>port 5000</code>. This is an API service. To use the platform, open the citizen or municipal web applications below:</p>
    
    <div class="links">
      <a href="http://localhost:5173" class="btn btn-primary" target="_blank">
        <span>👤 Open Citizen Portal</span>
        <span>localhost:5173 &rarr;</span>
      </a>
      <a href="http://localhost:5174" class="btn" target="_blank">
        <span>🏛️ Open Municipal Admin Portal</span>
        <span>localhost:5174 &rarr;</span>
      </a>
      <a href="http://127.0.0.1:8000/docs" class="btn" target="_blank">
        <span>🤖 Open FastAPI AI Docs & Swagger</span>
        <span>127.0.0.1:8000 &rarr;</span>
      </a>
      <a href="/api/health" class="btn" target="_blank">
        <span>🩺 Inspect JSON Health Probe</span>
        <span>/api/health &rarr;</span>
      </a>
    </div>

    <div class="footer">
      FixItNow Platform v1.0.0 &bull; Environment: development &bull; Local Persistent DB Active
    </div>
  </div>
</body>
</html>`);
  }

  res.json({
    status: 'online',
    service: 'FixItNow Civic Backend',
    version: '1.0.0',
    port: config.port,
    endpoints: {
      health: '/api/health',
      complaints: '/api/complaints',
      auth: '/api/auth',
      municipal: '/api/municipal',
      officer: '/api/officer'
    },
    frontends: {
      citizen: 'http://localhost:5173',
      admin: 'http://localhost:5174',
      aiService: 'http://127.0.0.1:8000'
    }
  });
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
