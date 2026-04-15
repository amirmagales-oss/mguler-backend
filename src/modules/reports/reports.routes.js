import express from 'express';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';

const router = express.Router();

router.get('/critical', asyncHandler(async (req, res) => {
  const stocks = await prisma.currentStock.findMany({ include: { product: true, warehouse: true } });
  const criticalItems = stocks.filter((item) => item.quantity <= item.product.minStockLevel);
  return ok(res, { items: criticalItems });
}));

router.get('/movements', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
    },
    include: { product: true, sourceWarehouse: true, targetWarehouse: true, createdBy: { select: { username: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return ok(res, { movements });
}));

router.get('/stock-summary', asyncHandler(async (req, res) => {
  const [productsCount, warehousesCount, critical, todayMovements] = await Promise.all([
    prisma.product.count(),
    prisma.warehouse.count(),
    prisma.currentStock.findMany({ include: { product: true } }),
    prisma.stockMovement.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } })
  ]);

  return ok(res, {
    summary: {
      productsCount,
      warehousesCount,
      criticalCount: critical.filter((item) => item.quantity <= item.product.minStockLevel).length,
      todayMovements
    }
  });
}));

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [summary, latestMovements, criticalItems, warehouseStock] = await Promise.all([
    Promise.all([
      prisma.product.count(),
      prisma.warehouse.count(),
      prisma.currentStock.findMany({ include: { product: true } }),
      prisma.stockMovement.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } })
    ]),
    prisma.stockMovement.findMany({
      take: 10,
      include: { product: true, sourceWarehouse: true, targetWarehouse: true, createdBy: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.currentStock.findMany({ include: { product: true, warehouse: true } }),
    prisma.currentStock.findMany({ include: { warehouse: true } })
  ]);

  const [productsCount, warehousesCount, allStocks, todayMovements] = summary;
  const criticalCount = allStocks.filter((item) => item.quantity <= item.product.minStockLevel).length;
  const criticalList = criticalItems.filter((item) => item.quantity <= item.product.minStockLevel).slice(0, 10);

  const warehouseMap = new Map();
  warehouseStock.forEach((item) => {
    const key = item.warehouse.name;
    warehouseMap.set(key, (warehouseMap.get(key) || 0) + item.quantity);
  });

  return ok(res, {
    dashboard: {
      cards: { productsCount, warehousesCount, criticalCount, todayMovements },
      latestMovements,
      criticalList,
      warehouseSummary: Array.from(warehouseMap.entries()).map(([name, quantity]) => ({ name, quantity }))
    }
  });
}));

export default router;
