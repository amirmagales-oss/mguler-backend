function parseAllowedOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

function applyCors(req, res, next) {
  const requestOrigin = req.headers.origin;

  if (!requestOrigin) {
    return next();
  }

  const allowAnyInDevelopment = process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0;
  const isAllowed = allowAnyInDevelopment || allowedOrigins.includes(requestOrigin);

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(isAllowed ? 204 : 403);
  }

  if (!isAllowed) {
    return res.status(403).json({
      ok: false,
      error: 'CORS_ORIGIN_FORBIDDEN',
    });
  }

  return next();
}

module.exports = {
  applyCors,
};
