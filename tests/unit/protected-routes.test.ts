import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Memastikan setiap halaman aplikasi tercakup `PROTECTED_ROUTES` di proxy.ts.
 *
 * Dibuat setelah `/onboarding` dan `/products` terlewat dari daftar itu:
 * proxy tidak mengalihkan pengunjung tanpa sesi, halaman tetap dijalankan,
 * dan pengguna melihat layar 500 alih-alih halaman login.
 */

const ROOT = process.cwd()
const APP_DIR = join(ROOT, 'app')

/** Segmen yang tidak menjadi bagian URL: (auth), (main), @slot, _private. */
function isRouteGroup(segment: string): boolean {
  return segment.startsWith('(') || segment.startsWith('@') || segment.startsWith('_')
}

/** Menelusuri app/ dan mengumpulkan URL setiap page.tsx. */
function collectPageRoutes(dir: string, urlSegments: string[] = [], found: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)

    if (statSync(fullPath).isDirectory()) {
      const next = isRouteGroup(entry) ? urlSegments : [...urlSegments, entry]
      collectPageRoutes(fullPath, next, found)
      continue
    }

    if (entry === 'page.tsx') {
      found.push(`/${urlSegments.join('/')}`)
    }
  }
  return found
}

const PAGE_ROUTES = collectPageRoutes(APP_DIR)

const PROTECTED_ROUTES: string[] = (() => {
  const proxy = readFileSync(join(ROOT, 'proxy.ts'), 'utf8')
  const block = proxy.match(/const PROTECTED_ROUTES\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? ''
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]!)
})()

/** Halaman yang memang harus bisa diakses tanpa sesi. */
const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/order/[projectId]/[branchId]',
  '/o/[slug]',
])

describe('cakupan PROTECTED_ROUTES', () => {
  it('menemukan halaman untuk diperiksa', () => {
    expect(PAGE_ROUTES.length).toBeGreaterThan(5)
    expect(PROTECTED_ROUTES.length).toBeGreaterThan(5)
  })

  it('melindungi setiap halaman yang bukan publik', () => {
    const unprotected = PAGE_ROUTES.filter(
      (route) =>
        !PUBLIC_ROUTES.has(route) &&
        !PROTECTED_ROUTES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))
    )

    expect(unprotected, 'halaman ini belum ada di PROTECTED_ROUTES pada proxy.ts').toEqual([])
  })

  it('tidak mendaftarkan rute publik sebagai terproteksi', () => {
    const wronglyProtected = [...PUBLIC_ROUTES].filter((route) => PROTECTED_ROUTES.includes(route))

    expect(wronglyProtected, 'rute publik tidak boleh diproteksi').toEqual([])
  })
})
