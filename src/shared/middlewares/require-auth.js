const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.slice(7);

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.authUser = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: 'INVALID_OR_EXPIRED_TOKEN',
    });
  }
}

module.exports = {
  requireAuth,
};
