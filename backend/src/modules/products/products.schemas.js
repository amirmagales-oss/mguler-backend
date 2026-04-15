import { z } from 'zod';

export const productCreateSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional().or(z.literal('')).transform(v => v || undefined),
  name: z.string().min(2),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1),
  minStockLevel: z.coerce.number().int().min(0).default(0),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true)
});

export const productUpdateSchema = productCreateSchema.partial();
