import { and, eq, gte, sql } from 'drizzle-orm'
import { customers, loyaltyLedger, projects, transactions } from '@/lib/db/schema'
import { withTenant, type Transaction } from '@/lib/db/tenant'
import { fromDecimalString } from '@/lib/domain/money'
import { ValidationError } from '@/lib/errors/app-error'

export interface LoyaltyConfig {
  enabled: boolean
  earnRate: number // rupiah of net sale per 1 point earned (0 disables earning)
  redeemValue: number // rupiah discount per 1 point spent (0 disables redemption)
}

export class LoyaltyService {
  async getConfig(projectId: string): Promise<LoyaltyConfig> {
    const [row] = await withTenant(projectId, (tx) =>
      tx
        .select({
          enabled: projects.loyaltyEnabled,
          earnRate: projects.loyaltyEarnRate,
          redeemValue: projects.loyaltyRedeemValue,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
    )
    return row ?? { enabled: false, earnRate: 0, redeemValue: 0 }
  }

  // Earn and/or redeem inside the sale's own transaction, so points never drift from the sale.
  // Redemption uses a conditional decrement (balance >= points) — a concurrent sale that drains
  // the balance leaves 0 rows updated and rolls this sale back. earnedFrom is the net (post-discount,
  // post-tax) amount so points reflect what was actually paid. Every change appends a ledger row.
  async accrue(
    tx: Transaction,
    params: {
      projectId: string
      customerId: string
      transactionId: string
      redeemPoints: number
      config: LoyaltyConfig
      actorId: string
    }
  ): Promise<void> {
    const { projectId, customerId, transactionId, redeemPoints, config, actorId } = params

    if (redeemPoints > 0) {
      const dec = await tx
        .update(customers)
        .set({ loyaltyPoints: sql`${customers.loyaltyPoints} - ${redeemPoints}` })
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.projectId, projectId),
            gte(customers.loyaltyPoints, redeemPoints)
          )
        )
        .returning({ balance: customers.loyaltyPoints })
      if (dec.length === 0) throw new ValidationError('Poin pelanggan tidak mencukupi')
      await tx.insert(loyaltyLedger).values({
        projectId,
        customerId,
        transactionId,
        type: 'redeem',
        points: -redeemPoints,
        balanceAfter: dec[0]!.balance,
        createdBy: actorId,
      })
    }

    if (config.enabled && config.earnRate > 0) {
      const [txRow] = await tx
        .select({ net: transactions.netAmount })
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1)
      // net is in minor units (cents); earnRate is rupiah per point → *100 to compare in cents.
      const netMinor = fromDecimalString(txRow!.net)
      const earned = Number(netMinor / BigInt(config.earnRate * 100))
      if (earned > 0) {
        const inc = await tx
          .update(customers)
          .set({ loyaltyPoints: sql`${customers.loyaltyPoints} + ${earned}` })
          .where(and(eq(customers.id, customerId), eq(customers.projectId, projectId)))
          .returning({ balance: customers.loyaltyPoints })
        if (inc.length > 0) {
          await tx.insert(loyaltyLedger).values({
            projectId,
            customerId,
            transactionId,
            type: 'earn',
            points: earned,
            balanceAfter: inc[0]!.balance,
            createdBy: actorId,
          })
        }
      }
    }
  }
}

export const loyaltyService = new LoyaltyService()
