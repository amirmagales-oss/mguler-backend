import express from 'express';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const logs = await prisma.systemLog.findMany({
    include: { user: { select: { username: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(req.query.limit || 100)
  });
  return ok(res, { logs });
}));

export default router;
