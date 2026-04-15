import { z } from 'zod';

export const stockInSchema = z.object({
  productId: z.string().uuid(),
  targetWarehouseId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().optional(),
  referenceNo: z.string().optional()
});

export const stockOutSchema = z.object({
  productId: z.string().uuid(),
  sourceWarehouseId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().optional(),
  referenceNo: z.string().optional()
});

export const stockTransferSchema = z.object({
  productId: z.string().uuid(),
  sourceWarehouseId: z.string().uuid(),
  targetWarehouseId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().optional(),
  referenceNo: z.string().optional()
}).refine((data) => data.sourceWarehouseId !== data.targetWarehouseId, {
  message: 'Kaynak ve hedef depo aynı olamaz.',
  path: ['targetWarehouseId']
});
