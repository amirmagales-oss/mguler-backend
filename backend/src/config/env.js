import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').map((v) => v.trim()).filter(Boolean)
};
