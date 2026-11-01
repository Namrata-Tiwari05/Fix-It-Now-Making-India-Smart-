import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server or root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    projectId: process.env.SUPABASE_PROJECT_ID || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
  },

  ai: {
    embeddingDimensions: parseInt(process.env.AI_EMBEDDING_DIMENSIONS || '384', 10),
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75'),
    duplicateThreshold: parseFloat(process.env.AI_DUPLICATE_THRESHOLD || '0.80'),
  }
};
