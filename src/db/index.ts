import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

/**
 * Create a Drizzle ORM instance using Neon's HTTP driver.
 * This is compatible with Cloudflare Workers (no TCP sockets needed).
 *
 * Usage in server functions:
 *   import { db } from '#/db'
 *   const result = await db.select().from(schema.users)
 */
function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local or set it as a Cloudflare secret.',
    )
  }
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

export const db = createDb()
