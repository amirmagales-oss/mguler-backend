import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';

async function start() {
  try {
    await prisma.$connect();
    app.listen(env.port, () => {
      console.log(`MGULER STOCK API running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

start();
