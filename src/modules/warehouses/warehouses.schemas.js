import { z } from 'zod';

export const warehouseCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true)
});

export const warehouseUpdateSchema = warehouseCreateSchema.partial();
