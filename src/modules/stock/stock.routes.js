import express from 'express';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok, fail } from '../../utils/http.js';
import { stockInSchema, stockOutSchema, stockTransferSchema } from './stock.schemas.js';
import { generateGroupKey, generateMovementNo } from '../../utils/movement.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { writeLog } from '../../utils/log.js';

const router = express.Router();

async function ensureProductAndWarehouse(productId, warehouseId) {
  const [product, warehouse] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } })
  ]);
  if (!product || !product.isActive) fail(404, 'Ürün bulunamadı veya pasif.');
  if (!warehouse || !warehouse.isActive) fail(404, 'Depo bulunamadı veya pasif.');
  return { product, warehouse };
}

router.get('/movements', asyncHandler(async (req, res) => {
  const { type, productId, warehouseId, userId, limit = 100 } = req.query;
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(type ? { movementType: type } : {}),
      ...(productId ? { productId } : {}),
      ...(userId ? { createdById: userId } : {}),
      ...(warehouseId ? {
        OR: [
          { sourceWarehouseId: warehouseId },
          { targetWarehouseId: warehouseId }
        ]
      } : {})
    },
    include: {
      product: true,
      sourceWarehouse: true,
      targetWarehouse: true,
      createdBy: { select: { id: true, username: true, fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit)
  });
  return ok(res, { movements });
}));

router.get('/current', asyncHandler(async (req, res) => {
  const { warehouseId, productId, critical } = req.query;
  const items = await prisma.currentStock.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      ...(productId ? { productId } : {})
    },
    include: {
      product: true,
      warehouse: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const normalized = items.map((item) => ({
    ...item,
    isCritical: item.quantity <= item.product.minStockLevel
  })).filter((item) => critical === 'true' ? item.isCritical : true);

  return ok(res, { items: normalized });
}));

router.get('/current/product/:id', asyncHandler(async (req, res) => {
  const items = await prisma.currentStock.findMany({ where: { productId: req.params.id }, include: { warehouse: true, product: true } });
  return ok(res, { items });
}));

router.get('/current/warehouse/:id', asyncHandler(async (req, res) => {
  const items = await prisma.currentStock.findMany({ where: { warehouseId: req.params.id }, include: { warehouse: true, product: true } });
  return ok(res, { items });
}));

router.post('/in', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), asyncHandler(async (req, res) => {
  const parsed = stockInSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz stok giriş verisi.', parsed.error.flatten());
  const { productId, targetWarehouseId, quantity, note, referenceNo } = parsed.data;
  await ensureProductAndWarehouse(productId, targetWarehouseId);

  const movement = await prisma.$transaction(async (tx) => {
    const stock = await tx.currentStock.upsert({
      where: { productId_warehouseId: { productId, warehouseId: targetWarehouseId } },
      update: { quantity: { increment: quantity } },
      create: { productId, warehouseId: targetWarehouseId, quantity }
    });

    const movement = await tx.stockMovement.create({
      data: {
        movementNo: generateMovementNo('IN'),
        movementType: 'IN',
        productId,
        targetWarehouseId,
        quantity,
        note,
        referenceNo,
        createdById: req.user.id
      },
      include: { product: true, targetWarehouse: true, createdBy: { select: { username: true } } }
    });

    return { movement, stock };
  });

  await writeLog({ userId: req.user.id, actionType: 'STOCK_IN', module: 'STOCK', description: `${quantity} adet stok girişi yapıldı.`, metadata: { productId, targetWarehouseId } });
  return created(res, movement, 'Stok girişi oluşturuldu.');
}));

router.post('/out', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), asyncHandler(async (req, res) => {
  const parsed = stockOutSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz stok çıkış verisi.', parsed.error.flatten());
  const { productId, sourceWarehouseId, quantity, note, referenceNo } = parsed.data;
  await ensureProductAndWarehouse(productId, sourceWarehouseId);

  const result = await prisma.$transaction(async (tx) => {
    const stock = await tx.currentStock.findUnique({ where: { productId_warehouseId: { productId, warehouseId: sourceWarehouseId } } });
    if (!stock || stock.quantity < quantity) fail(400, 'Yetersiz stok.');

    const updatedStock = await tx.currentStock.update({
      where: { productId_warehouseId: { productId, warehouseId: sourceWarehouseId } },
      data: { quantity: { decrement: quantity } }
    });

    const movement = await tx.stockMovement.create({
      data: {
        movementNo: generateMovementNo('OUT'),
        movementType: 'OUT',
        productId,
        sourceWarehouseId,
        quantity,
        note,
        referenceNo,
        createdById: req.user.id
      },
      include: { product: true, sourceWarehouse: true, createdBy: { select: { username: true } } }
    });

    return { movement, stock: updatedStock };
  });

  await writeLog({ userId: req.user.id, actionType: 'STOCK_OUT', module: 'STOCK', description: `${quantity} adet stok çıkışı yapıldı.`, metadata: { productId, sourceWarehouseId } });
  return created(res, result, 'Stok çıkışı oluşturuldu.');
}));

router.post('/transfer', requireRole('SUPER_ADMIN', 'ADMIN', 'OPERATOR'), asyncHandler(async (req, res) => {
  const parsed = stockTransferSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz transfer verisi.', parsed.error.flatten());
  const { productId, sourceWarehouseId, targetWarehouseId, quantity, note, referenceNo } = parsed.data;
  await ensureProductAndWarehouse(productId, sourceWarehouseId);
  await ensureProductAndWarehouse(productId, targetWarehouseId);

  const groupKey = generateGroupKey();

  const result = await prisma.$transaction(async (tx) => {
    const sourceStock = await tx.currentStock.findUnique({ where: { productId_warehouseId: { productId, warehouseId: sourceWarehouseId } } });
    if (!sourceStock || sourceStock.quantity < quantity) fail(400, 'Transfer için kaynak depoda yeterli stok yok.');

    await tx.currentStock.update({
      where: { productId_warehouseId: { productId, warehouseId: sourceWarehouseId } },
      data: { quantity: { decrement: quantity } }
    });

    await tx.currentStock.upsert({
      where: { productId_warehouseId: { productId, warehouseId: targetWarehouseId } },
      update: { quantity: { increment: quantity } },
      create: { productId, warehouseId: targetWarehouseId, quantity }
    });

    const [outMovement, inMovement] = await Promise.all([
      tx.stockMovement.create({
        data: {
          movementNo: generateMovementNo('TRFOUT'),
          movementType: 'TRANSFER',
          productId,
          sourceWarehouseId,
          targetWarehouseId,
          quantity,
          note,
          referenceNo,
          createdById: req.user.id,
          groupKey
        }
      }),
      tx.stockMovement.create({
        data: {
          movementNo: generateMovementNo('TRFIN'),
          movementType: 'TRANSFER',
          productId,
          sourceWarehouseId,
          targetWarehouseId,
          quantity,
          note,
          referenceNo,
          createdById: req.user.id,
          groupKey
        }
      })
    ]);

    return { outMovement, inMovement, groupKey };
  });

  await writeLog({ userId: req.user.id, actionType: 'TRANSFER', module: 'STOCK', description: `${quantity} adet depo transferi yapıldı.`, metadata: { productId, sourceWarehouseId, targetWarehouseId, groupKey } });
  return created(res, result, 'Transfer oluşturuldu.');
}));

export default router;
