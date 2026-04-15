import { prisma } from '../config/db.js';

export async function writeLog({ userId = null, actionType, module, description, metadata = null }) {
  try {
    await prisma.systemLog.create({
      data: { userId, actionType, module, description, metadata: metadata || undefined }
    });
  } catch (error) {
    console.error('Log write failed:', error.message);
  }
}
