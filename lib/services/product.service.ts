import { productRepository } from '@/lib/repositories/product.repository'
import { checkPermission, requirePermission } from '@/lib/rbac'
import { COST_PERMISSION } from '@/lib/authz/permissions'
import { ForbiddenError } from '@/lib/errors/app-error'
import type { VariantView, VariantWithCost } from '@/lib/domain/catalog/variant-view'

export class ProductService {
  /**
   * Daftar varian, dengan atau tanpa HPP.
   *
   * Keputusan menyertakan biaya diambil di sini dari hasil pengecekan
   * permission — bukan parameter yang bisa diatur pemanggil. Ini yang membuat
   * kebocoran HPP tidak bisa terjadi lewat halaman atau action yang lupa
   * memfilter.
   */
  async listVariants(projectId: string, productId: string, userId: string): Promise<VariantView[]> {
    await requirePermission(projectId, userId, 'project:view')

    const canViewCost = await checkPermission(projectId, userId, COST_PERMISSION)

    return productRepository.findVariantsByProduct(projectId, productId, canViewCost)
  }

  /**
   * Membaca HPP secara eksplisit. Menolak keras bila pemanggil tidak berhak,
   * bukan mengembalikan nilai kosong — supaya kesalahan terlihat, tidak diam.
   */
  async getVariantCost(
    projectId: string,
    variantId: string,
    userId: string
  ): Promise<VariantWithCost | null> {
    const canViewCost = await checkPermission(projectId, userId, COST_PERMISSION)
    if (!canViewCost) {
      throw new ForbiddenError('Anda tidak memiliki akses ke data HPP.')
    }

    return productRepository.findVariantWithCost(projectId, variantId)
  }
}

export const productService = new ProductService()
