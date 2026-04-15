const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1d';
const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);
const MAX_FAILED_LOGIN_COUNT = Number(process.env.MAX_FAILED_LOGIN_COUNT || 5);

function buildSafeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` }
  );
}

async function markFailedLogin(user) {
  const nextFailedLoginCount = user.failedLoginCount + 1;
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: nextFailedLoginCount },
  });

  if (nextFailedLoginCount >= MAX_FAILED_LOGIN_COUNT) {
    throw new Error('TOO_MANY_FAILED_ATTEMPTS');
  }

  throw new Error('INVALID_CREDENTIALS');
}

async function createSessionAndTokens(user, { userAgent, ipAddress, sessionId } = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  const session = sessionId
    ? await prisma.userSession.update({
        where: { id: sessionId },
        data: {
          refreshTokenHash,
          userAgent,
          ipAddress,
          isActive: true,
          expiresAt,
        },
      })
    : await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          userAgent,
          ipAddress,
          isActive: true,
          expiresAt,
        },
      });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginCount: 0,
    },
  });

  return {
    user: buildSafeUser(user),
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
}

async function login({ username, password, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new Error('USER_DISABLED');
  }

  if (user.failedLoginCount >= MAX_FAILED_LOGIN_COUNT) {
    throw new Error('TOO_MANY_FAILED_ATTEMPTS');
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);

  if (!passwordOk) {
    await markFailedLogin(user);
  }

  return createSessionAndTokens(user, { userAgent, ipAddress });
}

async function verifyRefreshToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || !user.isActive) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: user.id,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const session of sessions) {
    const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (isMatch) {
      return { user, session };
    }
  }

  throw new Error('INVALID_REFRESH_TOKEN');
}

async function refreshSession({ refreshToken, userAgent, ipAddress }) {
  const { user, session } = await verifyRefreshToken(refreshToken);
  return createSessionAndTokens(user, {
    userAgent,
    ipAddress,
    sessionId: session.id,
  });
}

async function logout({ refreshToken }) {
  const { session } = await verifyRefreshToken(refreshToken);

  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      isActive: false,
    },
  });

  return { ok: true };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      lastLoginAt: true,
      failedLoginCount: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
}

module.exports = {
  login,
  refreshSession,
  logout,
  getMe,
};
