import { and, desc, eq, ilike, isNull } from 'drizzle-orm'
import { customers } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { blindIndex, decryptToken, encryptToken } from '@/lib/encryption'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

// Customers are served by POS staff, so we gate on pos:operate rather than exposing PII to
// every role with project:view.
const MANAGE: Parameters<typeof requirePermission>[2] = 'pos:operate'

export interface CustomerInput {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
}

export interface CustomerContext {
  userId: string
  ip: string
  userAgent: string
}

export interface CustomerRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '')
}

function enc(value: string | null): string | null {
  return value && value.trim() ? encryptToken(value.trim()) : null
}

function dec(value: string | null): string | null {
  return value ? decryptToken(value) : null
}

export class CustomerService {
  async create(
    projectId: string,
    input: CustomerInput,
    context: CustomerContext
  ): Promise<{ id: string }> {
    await requirePermission(projectId, context.userId, MANAGE)
    if (!input.name.trim()) throw new ValidationError('Nama pelanggan wajib diisi')

    const phone = input.phone ? normalizePhone(input.phone) : null
    const phoneHash = phone ? blindIndex(phone) : null

    const created = await withTenant(projectId, async (tx) => {
      if (phoneHash) {
        const [existing] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.projectId, projectId),
              eq(customers.phoneHash, phoneHash),
              isNull(customers.deletedAt)
            )
          )
          .limit(1)
        if (existing) throw new ValidationError('Pelanggan dengan nomor ini sudah ada')
      }

      const [row] = await tx
        .insert(customers)
        .values({
          projectId,
          name: sanitizeText(input.name),
          phoneEnc: enc(phone),
          phoneHash,
          emailEnc: enc(input.email),
          addressEnc: enc(input.address),
          note: input.note ? sanitizeText(input.note) : null,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning({ id: customers.id })
      return row!
    })

    await auditRepository.log({
      action: 'create',
      resource: 'customer',
      resourceId: created.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { name: input.name },
    })
    logger.info({ projectId, customerId: created.id }, 'customer created')
    return created
  }

  async update(
    projectId: string,
    customerId: string,
    input: CustomerInput,
    context: CustomerContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)
    if (!input.name.trim()) throw new ValidationError('Nama pelanggan wajib diisi')

    const phone = input.phone ? normalizePhone(input.phone) : null
    const phoneHash = phone ? blindIndex(phone) : null

    const updated = await withTenant(projectId, async (tx) => {
      if (phoneHash) {
        const [clash] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.projectId, projectId),
              eq(customers.phoneHash, phoneHash),
              isNull(customers.deletedAt)
            )
          )
          .limit(1)
        if (clash && clash.id !== customerId) {
          throw new ValidationError('Nomor ini sudah dipakai pelanggan lain')
        }
      }
      return tx
        .update(customers)
        .set({
          name: sanitizeText(input.name),
          phoneEnc: enc(phone),
          phoneHash,
          emailEnc: enc(input.email),
          addressEnc: enc(input.address),
          note: input.note ? sanitizeText(input.note) : null,
          updatedBy: context.userId,
        })
        .where(and(eq(customers.id, customerId), eq(customers.projectId, projectId)))
        .returning({ id: customers.id })
    })
    if (updated.length === 0) throw new NotFoundError('Pelanggan tidak ditemukan')

    await auditRepository.log({
      action: 'update',
      resource: 'customer',
      resourceId: customerId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { name: input.name },
    })
  }

  async remove(projectId: string, customerId: string, context: CustomerContext): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)
    const removed = await withTenant(projectId, (tx) =>
      tx
        .update(customers)
        .set({ deletedAt: new Date(), phoneHash: null, updatedBy: context.userId })
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.projectId, projectId),
            isNull(customers.deletedAt)
          )
        )
        .returning({ id: customers.id })
    )
    if (removed.length === 0) throw new NotFoundError('Pelanggan tidak ditemukan')

    await auditRepository.log({
      action: 'delete',
      resource: 'customer',
      resourceId: customerId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {},
    })
  }

  // List/search customers, decrypting PII for display. A numeric query matches by the phone
  // blind index (exact); otherwise it's a name search.
  async list(projectId: string, userId: string, search?: string): Promise<CustomerRow[]> {
    await requirePermission(projectId, userId, MANAGE)

    const rows = await withTenant(projectId, (tx) => {
      const conditions = [eq(customers.projectId, projectId), isNull(customers.deletedAt)]
      const trimmed = search?.trim()
      if (trimmed) {
        if (/^[\d+][\d\s+-]*$/.test(trimmed)) {
          conditions.push(eq(customers.phoneHash, blindIndex(normalizePhone(trimmed))))
        } else {
          conditions.push(ilike(customers.name, `%${trimmed}%`))
        }
      }
      return tx
        .select({
          id: customers.id,
          name: customers.name,
          phoneEnc: customers.phoneEnc,
          emailEnc: customers.emailEnc,
          addressEnc: customers.addressEnc,
          note: customers.note,
        })
        .from(customers)
        .where(and(...conditions))
        .orderBy(desc(customers.createdAt))
        .limit(200)
    })

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: dec(r.phoneEnc),
      email: dec(r.emailEnc),
      address: dec(r.addressEnc),
      note: r.note,
    }))
  }

  // Resolve a customer by exact phone, for attaching one to a POS sale.
  async findByPhone(
    projectId: string,
    userId: string,
    phone: string
  ): Promise<{ id: string; name: string } | null> {
    await requirePermission(projectId, userId, MANAGE)
    const hash = blindIndex(normalizePhone(phone))
    const [row] = await withTenant(projectId, (tx) =>
      tx
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(
          and(
            eq(customers.projectId, projectId),
            eq(customers.phoneHash, hash),
            isNull(customers.deletedAt)
          )
        )
        .limit(1)
    )
    return row ?? null
  }
}

export const customerService = new CustomerService()
