import { db } from '@/lib/db'

export abstract class BaseRepository {
  protected db = db
}
