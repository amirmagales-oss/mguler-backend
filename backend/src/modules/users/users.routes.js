import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok, fail } from '../../utils/http.js';
import { userCreateSchema, userUpdateSchema } from './users.schemas.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { writeLog } from '../../utils/log.js';

const router = express.Router();

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, fullName: true, username: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true
    }
  });
  return ok(res, { users });
}));

router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = userCreateSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz kullanıcı verisi.', parsed.error.flatten());

  const data = parsed.data;
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      passwordHash,
      role: data.role
    },
    select: { id: true, fullName: true, username: true, email: true, role: true, isActive: true, createdAt: true }
  });

  await writeLog({ userId: req.user.id, actionType: 'CREATE', module: 'USERS', description: `Yeni kullanıcı oluşturuldu: ${user.username}` });
  return created(res, { user }, 'Kullanıcı oluşturuldu.');
}));

router.put('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz kullanıcı güncelleme verisi.', parsed.error.flatten());

  const data = { ...parsed.data };
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }
  delete data.password;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, fullName: true, username: true, email: true, role: true, isActive: true, createdAt: true }
  });

  await writeLog({ userId: req.user.id, actionType: 'UPDATE', module: 'USERS', description: `Kullanıcı güncellendi: ${user.username}` });
  return ok(res, { user }, 'Kullanıcı güncellendi.');
}));

router.patch('/:id/status', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') fail(400, 'isActive boolean olmalı.');
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: req.body.isActive },
    select: { id: true, username: true, isActive: true }
  });
  await writeLog({ userId: req.user.id, actionType: 'STATUS', module: 'USERS', description: `Kullanıcı durumu değişti: ${user.username} => ${user.isActive}` });
  return ok(res, { user }, 'Durum güncellendi.');
}));

export default router;
