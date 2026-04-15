const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  if (process.env.ALLOW_SEED !== 'true') {
    console.log('Seed skipped: set ALLOW_SEED=true to enable seeding.');
    return;
  }

  const username = process.env.SEED_ADMIN_USERNAME || 'UMG';
  const fullName = process.env.SEED_ADMIN_FULL_NAME || 'Mustafa Guler';
  const plainPassword = process.env.SEED_ADMIN_PASSWORD || 'UMG2026!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  await prisma.user.create({
    data: {
      username,
      fullName,
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log(`Admin user created: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
