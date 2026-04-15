import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('UMG2026!', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'UMG' },
    update: {
      fullName: 'Mustafa Güler',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      passwordHash
    },
    create: {
      fullName: 'Mustafa Güler',
      username: 'UMG',
      email: 'admin@mgulerstock.local',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true
    }
  });

  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: 'MAIN' },
      update: {},
      create: { code: 'MAIN', name: 'Ana Depo', description: 'Merkez ana depo' }
    }),
    prisma.warehouse.upsert({
      where: { code: 'STORE' },
      update: {},
      create: { code: 'STORE', name: 'Mağaza', description: 'Satış noktası' }
    })
  ]);

  const productsData = [
    { sku: 'MG-001', barcode: '869000000001', name: 'Milwaukee M18 Matkap', category: 'Makineler', brand: 'Milwaukee', unit: 'ADET', minStockLevel: 2 },
    { sku: 'MG-002', barcode: '869000000002', name: 'Bahco Tornavida Seti', category: 'El Aletleri', brand: 'Bahco', unit: 'ADET', minStockLevel: 3 },
    { sku: 'MG-003', barcode: '869000000003', name: 'Mirka Zımpara Disk', category: 'Sarf', brand: 'Mirka', unit: 'ADET', minStockLevel: 20 }
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p
    });

    await prisma.currentStock.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: warehouses[0].id } },
      update: { quantity: 10 },
      create: { productId: product.id, warehouseId: warehouses[0].id, quantity: 10 }
    });
  }

  await prisma.systemLog.create({
    data: {
      userId: admin.id,
      actionType: 'SEED',
      module: 'SYSTEM',
      description: 'Seed işlemi tamamlandı.'
    }
  });

  console.log('Seed completed.');
  console.log('Login => username: UMG / password: UMG2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
