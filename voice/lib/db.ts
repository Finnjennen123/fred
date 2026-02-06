import { neon } from '@neondatabase/serverless'
import type { LearnerProfile } from './prompts'

const connectionString = process.env.DATABASE_URL

/**
 * Neon serverless SQL client. Use in API routes:
 *
 *   import { sql } from '../lib/db'
 *   const rows = await sql`SELECT * FROM learner_profiles WHERE id = ${id}`
 */
export const sql = connectionString
  ? neon(connectionString)
  : (null as unknown as ReturnType<typeof neon>)

/** Run only when DATABASE_URL is set (e.g. in API routes). */
export function getSql() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  return neon(connectionString)
}

// --- Helpers for learner profiles (optional; you can use raw sql instead)

export interface LearnerProfileRow {
  id: string
  created_at: Date
  profile: LearnerProfile
  user_id: string | null
}

export async function insertLearnerProfile(userId: string, profile: LearnerProfile): Promise<string> {
  const s = getSql()
  const rows = (await s`
    INSERT INTO learner_profiles (user_id, profile)
    VALUES (${userId}, ${JSON.stringify(profile)})
    RETURNING id
  `) as { id: string }[]
  const row = rows?.[0]
  if (!row) throw new Error('Insert failed')
  return row.id
}

export async function getLearnerProfile(id: string): Promise<LearnerProfileRow | null> {
  if (!sql) return null
  const rows = (await sql`
    SELECT id, created_at, profile, user_id
    FROM learner_profiles
    WHERE id = ${id}
  `) as LearnerProfileRow[]
  return rows?.[0] ?? null
}

export async function getLatestLearnerProfileForUser(userId: string): Promise<LearnerProfileRow | null> {
  if (!sql) return null
  const rows = (await sql`
    SELECT id, created_at, profile, user_id
    FROM learner_profiles
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `) as LearnerProfileRow[]
  return rows?.[0] ?? null
}
