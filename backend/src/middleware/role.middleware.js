export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Kimlik doğrulama gerekli.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'Bu işlem için yetkiniz yok.' });
    }

    next();
  };
}
