import { NextResponse, type NextRequest } from 'next/server'
import { getAccessibleBranches, resolveSessionState } from '@/lib/auth/session-context'
import { storeService } from '@/lib/services/store.service'
import { getAccessToken, getShopInfo } from '@/lib/integrations/shopee/client'
import { readRequestMeta } from '@/lib/observability/server-context'
import { logger } from '@/lib/logging/logger'

// Shopee redirects the merchant here with code and shop_id after they approve.
export async function GET(request: NextRequest) {
  const state = await resolveSessionState()
  if (state.status !== 'ready') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const shopId = request.nextUrl.searchParams.get('shop_id')
  if (!code || !shopId) {
    return NextResponse.redirect(new URL('/settings?shopee=error', request.url))
  }

  try {
    const tokens = await getAccessToken(code, shopId)
    const branches = await getAccessibleBranches(state.context)
    const meta = await readRequestMeta()

    // Honor the branch chosen before connecting, falling back to the first one.
    const requestedBranch = request.nextUrl.searchParams.get('branch')
    const branchId = branches.find((b) => b.id === requestedBranch)?.id ?? branches[0]?.id ?? null

    let storeName = `Shopee ${shopId}`
    try {
      storeName = (await getShopInfo(tokens.accessToken, shopId)).shopName
    } catch {
      // Non-fatal: keep the id-based name if the shop-info call fails.
    }

    await storeService.connectShopee({
      projectId: state.context.projectId,
      userId: state.context.userId,
      platformStoreId: shopId,
      storeName,
      branchId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresInSeconds: tokens.expiresInSeconds,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })

    return NextResponse.redirect(new URL('/settings?shopee=connected', request.url))
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'shopee callback failed'
    )
    return NextResponse.redirect(new URL('/settings?shopee=error', request.url))
  }
}
