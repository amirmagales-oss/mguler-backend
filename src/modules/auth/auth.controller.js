const authService = require('./auth.service');

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/auth',
  };
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth',
  });
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'USERNAME_PASSWORD_REQUIRED' });
    }

    const result = await authService.login({
      username,
      password,
      userAgent: req.get('user-agent') || null,
      ipAddress: req.ip || null,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return res.json({
      ok: true,
      user: result.user,
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (error.message === 'USER_DISABLED') {
      return res.status(403).json({ ok: false, error: 'USER_DISABLED' });
    }

    if (error.message === 'TOO_MANY_FAILED_ATTEMPTS') {
      return res.status(429).json({ ok: false, error: 'TOO_MANY_FAILED_ATTEMPTS' });
    }

    console.error('LOGIN_ERROR', error);
    return res.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR' });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({ ok: false, error: 'MISSING_REFRESH_TOKEN' });
    }

    const result = await authService.refreshSession({
      refreshToken,
      userAgent: req.get('user-agent') || null,
      ipAddress: req.ip || null,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    return res.json({
      ok: true,
      user: result.user,
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({ ok: false, error: 'INVALID_REFRESH_TOKEN' });
  }
}

async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await authService.logout({ refreshToken });
    }
  } catch (error) {
    // Always clear the cookie even if token/session is already invalid.
  }

  clearRefreshCookie(res);
  return res.json({ ok: true });
}

async function me(req, res) {
  try {
    const user = await authService.getMe(req.authUser.id);
    return res.json({ ok: true, user });
  } catch (error) {
    console.error('ME_ERROR', error);
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }
}

module.exports = {
  login,
  refresh,
  logout,
  me,
};
