import { eq, and, desc, sql, isNull } from 'drizzle-orm'
import { projects } from '@/lib/db/schema'
import { BaseRepository } from './base.repository'
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

    return (result as unknown as { rows: Project[] }).rows[0] ?? null
  }

  async create(data: NewProject): Promise<Project> {
    const [project] = await this.db.insert(projects).values(data).returning()
    return project!
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
