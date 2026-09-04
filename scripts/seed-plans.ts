import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans } from '@/lib/db/schema'

/**
 * Mengisi paket bawaan. Idempoten: menyisip bila kode belum ada, memperbarui
 * bila sudah — jadi aman dijalankan berulang. Angka di sini hanya titik awal;
 * harga dan lama trial dimaksudkan diubah lewat DB, bukan lewat deploy.
 *
 * Jalankan: pnpm tsx scripts/seed-plans.ts
 */
const DEFAULT_PLANS = [
  {
    code: 'trial',
    name: 'Coba Gratis',
    description: 'Akses penuh selama masa coba.',
    interval: 'trial' as const,
    price: '0',
    trialDays: 14,
    sortOrder: 0,
  },
  {
    code: 'monthly',
    name: 'Bulanan',
    description: 'Tagih tiap bulan.',
    interval: 'monthly' as const,
    price: '99000',
    trialDays: null,
    sortOrder: 1,
  },
  {
    code: 'yearly',
    name: 'Tahunan',
    description: 'Tagih tiap tahun, lebih hemat.',
    interval: 'yearly' as const,
    price: '990000',
    trialDays: null,
    sortOrder: 2,
  },
]

async function main() {
  for (const plan of DEFAULT_PLANS) {
    const existing = await db
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.code, plan.code), isNull(plans.deletedAt)))
      .limit(1)

    if (existing[0]) {
      await db.update(plans).set(plan).where(eq(plans.id, existing[0].id))
      console.log(`diperbarui: ${plan.code}`)
    } else {
      await db.insert(plans).values(plan)
      console.log(`disisipkan: ${plan.code}`)
    }
  }
  console.log('selesai.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
