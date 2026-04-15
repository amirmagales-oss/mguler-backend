import express from 'express';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok, fail } from '../../utils/http.js';
import { productCreateSchema, productUpdateSchema } from './products.schemas.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { writeLog } from '../../utils/log.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { search = '', active, critical } = req.query;
  const products = await prisma.product.findMany({
    where: {
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(active !== undefined ? { isActive: active === 'true' } : {})
    },
    include: {
      currentStocks: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const normalized = products.map((p) => {
    const totalStock = p.currentStocks.reduce((sum, s) => sum + s.quantity, 0);
    return { ...p, totalStock, isCritical: totalStock <= p.minStockLevel };
  }).filter((p) => critical === 'true' ? p.isCritical : true);

  return ok(res, { products: normalized });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      currentStocks: { include: { warehouse: true } },
      movements: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { sourceWarehouse: true, targetWarehouse: true, createdBy: { select: { username: true } } }
      }
    }
  });
  if (!product) fail(404, 'Ürün bulunamadı.');
  return ok(res, { product });
}));

router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz ürün verisi.', parsed.error.flatten());

  const product = await prisma.product.create({ data: parsed.data });
  await writeLog({ userId: req.user.id, actionType: 'CREATE', module: 'PRODUCTS', description: `Ürün oluşturuldu: ${product.sku}` });
  return created(res, { product }, 'Ürün oluşturuldu.');
}));

router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz ürün güncelleme verisi.', parsed.error.flatten());
  const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
  await writeLog({ userId: req.user.id, actionType: 'UPDATE', module: 'PRODUCTS', description: `Ürün güncellendi: ${product.sku}` });
  return ok(res, { product }, 'Ürün güncellendi.');
}));

router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') fail(400, 'isActive boolean olmalı.');
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
  await writeLog({ userId: req.user.id, actionType: 'STATUS', module: 'PRODUCTS', description: `Ürün durumu güncellendi: ${product.sku} => ${product.isActive}` });
  return ok(res, { product }, 'Durum güncellendi.');
}));

export default router;
