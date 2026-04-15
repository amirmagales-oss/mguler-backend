import { z } from 'zod';

export const userCreateSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  password: z.string().min(6),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'])
});

export const userUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  username: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  password: z.string().min(6).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional()
});
