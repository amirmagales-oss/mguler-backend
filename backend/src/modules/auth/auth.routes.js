import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { signToken } from '../../utils/jwt.js';
import { ok, fail } from '../../utils/http.js';
import { loginSchema } from './auth.schemas.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { writeLog } from '../../utils/log.js';

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(400, 'Geçersiz giriş verisi.', parsed.error.flatten());
  }

  const { username, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }]
    }
  });

  if (!user || !user.isActive) {
    fail(401, 'Kullanıcı adı veya şifre hatalı.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    fail(401, 'Kullanıcı adı veya şifre hatalı.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeLog({ userId: user.id, actionType: 'LOGIN', module: 'AUTH', description: `${user.username} giriş yaptı.` });

  const token = signToken({ userId: user.id, role: user.role });
  return ok(res, {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role
    }
  }, 'Giriş başarılı.');
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  return ok(res, {
    user: {
      id: req.user.id,
      fullName: req.user.fullName,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      lastLoginAt: req.user.lastLoginAt
    }
  });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await writeLog({ userId: req.user.id, actionType: 'LOGOUT', module: 'AUTH', description: `${req.user.username} çıkış yaptı.` });
  return ok(res, {}, 'Çıkış başarılı.');
}));

export default router;
