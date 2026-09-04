import { eq, and, desc, sql, isNull } from 'drizzle-orm'
import { branches, projects } from '@/lib/db/schema'
import { BaseRepository } from './base.repository'
import { execRows } from '@/lib/db/rows'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export type Project = InferSelectModel<typeof projects>
export type NewProject = InferInsertModel<typeof projects>
export type ProjectUpdate = { [K in keyof NewProject]?: NewProject[K] | undefined }

export class ProjectRepository extends BaseRepository {
  async findAllByUser(userId: string): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(
        and(eq(projects.userId, userId), eq(projects.isArchived, false), isNull(projects.deletedAt))
      )
      .orderBy(desc(projects.createdAt))
  }

  async findByIdAndUser(id: string, userId: string): Promise<Project | null> {
    const result = await this.db.execute(sql`
      SELECT p.* FROM projects p
      WHERE p.id = ${id}
        AND p.is_archived = false
        AND p.deleted_at IS NULL
        AND (
          p.user_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.project_id = p.id
              AND tm.user_id = ${userId}
              AND tm.status = 'active'
              AND tm.deleted_at IS NULL
          )
        )
      LIMIT 1
    `)

    return execRows<Project>(result)[0] ?? null
  }

  // Create a project with its first branch in one transaction. Every project needs at least one branch, since stock, POS, and production are all branch-scoped; without it a new project would be unusable. Old projects got a "Pusat" branch via migration 0002; this is the equivalent for new ones.
  async createWithDefaultBranch(data: NewProject): Promise<Project> {
    return this.db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values(data).returning()
      const created = project!

      await tx.insert(branches).values({
        projectId: created.id,
        name: 'Pusat',
        code: 'PUSAT',
        createdBy: data.userId,
        updatedBy: data.userId,
      })

      return created
    })
  }

  async update(id: string, data: ProjectUpdate): Promise<Project | null> {
    const [updated] = await this.db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.isArchived, false), isNull(projects.deletedAt)))
      .returning()
    return updated ?? null
  }

  async archive(id: string): Promise<boolean> {
    const result = await this.db
      .update(projects)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.isArchived, false), isNull(projects.deletedAt)))
      .returning({ id: projects.id })
    return result.length > 0
  }
}

export const projectRepository = new ProjectRepository()
