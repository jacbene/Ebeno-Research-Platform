// backend/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { requireSecret } from './secrets';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5001,

  // ✅ Secrets validés (crash si manquants en production)
  JWT_SECRET: requireSecret('JWT_SECRET'),

  // ✅ Optionnels (peuvent être vides en dev)
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || '',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',

  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || '',
};

export default env;
