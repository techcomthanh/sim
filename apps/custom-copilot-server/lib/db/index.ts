import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let client: postgres.Sql | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

export function getDb() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  if (!client || !dbInstance) {
    client = postgres(connectionString)
    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

// Export a db proxy for convenience
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const instance = getDb()
    const value = instance[prop as keyof typeof instance]
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
