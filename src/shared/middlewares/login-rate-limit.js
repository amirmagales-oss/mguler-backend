const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 10);
const attempts = new Map();

function getClientKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || 'unknown';
}

function loginRateLimit(req, res, next) {
  const key = getClientKey(req);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      ok: false,
      error: 'TOO_MANY_LOGIN_ATTEMPTS',
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    });
  }

  entry.count += 1;
  return next();
}

module.exports = {
  loginRateLimit,
};
