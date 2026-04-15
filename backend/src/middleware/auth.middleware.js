import { prisma } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Yetkisiz erişim.' });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, message: 'Kullanıcı geçersiz veya pasif.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Oturum doğrulanamadı.' });
  }
}
