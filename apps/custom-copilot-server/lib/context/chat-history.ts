import { db } from '@/lib/db'
import { chatMessages } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export interface ChatMessage {
  id: string
  userId: string
  workflowId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}

export interface CreateMessageInput {
  userId: string
  workflowId: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Store a chat message
 */
export async function storeMessage(input: CreateMessageInput): Promise<void> {
  try {
    await db.insert(chatMessages).values({
      userId: input.userId,
      workflowId: input.workflowId,
      role: input.role,
      content: input.content,
    })
    logger.info(`Stored message for user ${input.userId}, workflow ${input.workflowId}`)
  } catch (error) {
    logger.error('Error storing chat message:', error)
    throw error
  }
}

/**
 * Load chat history for a user/workflow
 */
export async function loadChatHistory(
  userId: string,
  workflowId: string,
  limit = 20
): Promise<ChatMessage[]> {
  try {
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.workflowId, workflowId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)

    // Reverse to get chronological order and cast role type
    return history.reverse().map((msg) => ({
      ...msg,
      role: msg.role as 'user' | 'assistant' | 'system',
      createdAt: msg.createdAt ?? new Date(),
    }))
  } catch (error) {
    logger.error('Error loading chat history:', error)
    return []
  }
}

/**
 * Format chat history for AI provider
 */
export function formatChatHistory(
  history: ChatMessage[]
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Clear chat history for a workflow
 */
export async function clearChatHistory(
  userId: string,
  workflowId: string
): Promise<void> {
  try {
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.workflowId, workflowId))
    logger.info(`Cleared chat history for workflow ${workflowId}`)
  } catch (error) {
    logger.error('Error clearing chat history:', error)
    throw error
  }
}
