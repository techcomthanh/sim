import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

/**
 * User API Keys - Per-user custom provider keys (AES-256-GCM encrypted)
 * Format: iv:authTag:salt:encrypted
 */
export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserProvider: index().on(table.userId, table.provider),
}))

/**
 * Chat History - Stores conversation messages
 */
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: varchar('workflow_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  workflowIdx: index().on(table.workflowId, table.createdAt),
  userIdx: index().on(table.userId, table.createdAt),
}))

/**
 * Usage Stats - Tracks diff creation/acceptance for analytics
 */
export const usageStats = pgTable('usage_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  workflowId: varchar('workflow_id', { length: 255 }).notNull(),
  messageId: varchar('message_id'),
  diffCreated: boolean('diff_created').default(false),
  diffAccepted: boolean('diff_accepted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})
