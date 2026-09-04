import { productRepository } from '@/lib/repositories/product.repository'
import { checkPermission, requirePermission } from '@/lib/rbac'
import { COST_PERMISSION } from '@/lib/authz/permissions'
import { ForbiddenError } from '@/lib/errors/app-error'
import type { VariantView, VariantWithCost } from '@/lib/domain/catalog/variant-view'

export class ProductService {
  // Variant list, with or without HPP. The include-cost decision is made here from a permission check, not a caller parameter, so cost can't leak via a page or action that forgot to filter.
  async listVariants(projectId: string, productId: string, userId: string): Promise<VariantView[]> {
    await requirePermission(projectId, userId, 'project:view')

    const canViewCost = await checkPermission(projectId, userId, COST_PERMISSION)

    return productRepository.findVariantsByProduct(projectId, productId, canViewCost)
  }

  // Read HPP explicitly. Hard-refuses if the caller isn't entitled, rather than returning empty, so mistakes surface instead of going silent.
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
