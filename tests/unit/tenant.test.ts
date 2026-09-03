import { describe, expect, it } from 'vitest'
import { TENANT_SETTING, withTenant } from '@/lib/db/tenant'

describe('withTenant', () => {
  it('memakai nama setting yang sama dengan policy RLS', () => {
    expect(TENANT_SETTING).toBe('app.current_project_id')
  })

  it('menolak project id yang bukan UUID sebelum menyentuh database', async () => {
    const invalid = [
      '',
      'bukan-uuid',
      "' OR 1=1 --",
      '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301; DROP TABLE users',
    ]

    for (const projectId of invalid) {
      await expect(
        withTenant(projectId, async () => 'tidak boleh sampai sini'),
        projectId
      ).rejects.toThrow('Project id tidak valid')
    }
  })
})
