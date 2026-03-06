import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama project wajib diisi')
    .max(100, 'Nama terlalu panjang')
    .regex(
      /^[a-zA-Z0-9\s\-_.()]+$/,
      'Nama hanya boleh mengandung huruf, angka, spasi, dan - _ . ()'
    ),

  description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional(),

  defaultCalcMethod: z.enum(['income_based', 'order_based']).default('income_based'),
})

export const updateProjectSchema = createProjectSchema.partial()

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
