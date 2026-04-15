import express from 'express';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok, fail } from '../../utils/http.js';
import { warehouseCreateSchema, warehouseUpdateSchema } from './warehouses.schemas.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { writeLog } from '../../utils/log.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({
    include: { currentStocks: true },
    orderBy: { createdAt: 'desc' }
  });

  const normalized = warehouses.map((w) => ({
    ...w,
    totalQuantity: w.currentStocks.reduce((sum, s) => sum + s.quantity, 0),
    productCount: w.currentStocks.filter((s) => s.quantity > 0).length
  }));

  return ok(res, { warehouses: normalized });
}));

router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  const parsed = warehouseCreateSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz depo verisi.', parsed.error.flatten());
  const warehouse = await prisma.warehouse.create({ data: parsed.data });
  await writeLog({ userId: req.user.id, actionType: 'CREATE', module: 'WAREHOUSES', description: `Depo oluşturuldu: ${warehouse.code}` });
  return created(res, { warehouse }, 'Depo oluşturuldu.');
}));

router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  const parsed = warehouseUpdateSchema.safeParse(req.body);
  if (!parsed.success) fail(400, 'Geçersiz depo güncelleme verisi.', parsed.error.flatten());
  const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data: parsed.data });
  await writeLog({ userId: req.user.id, actionType: 'UPDATE', module: 'WAREHOUSES', description: `Depo güncellendi: ${warehouse.code}` });
  return ok(res, { warehouse }, 'Depo güncellendi.');
}));

router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') fail(400, 'isActive boolean olmalı.');
  const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
  await writeLog({ userId: req.user.id, actionType: 'STATUS', module: 'WAREHOUSES', description: `Depo durumu güncellendi: ${warehouse.code} => ${warehouse.isActive}` });
  return ok(res, { warehouse }, 'Durum güncellendi.');
}));

export default router;
