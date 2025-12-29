import { z } from 'zod'

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
})

export const OAuthCredential = z.object({
  accessToken: z.string(),
  accountId: z.string(),
  name: z.string(),
})

export const CredentialsSchema = z.object({
  oauth: z.record(OAuthCredential),
  apiKeys: z.array(z.string()),
})

export const ChatRequestSchema = z.object({
  message: z.string(),
  workflowId: z.string(),
  userId: z.string(),
  model: z.string(),
  mode: z.enum(['ask', 'agent', 'plan']),
  stream: z.boolean().default(true),
  context: z.array(z.object({
    type: z.string(),
    content: z.string(),
  })).optional(),
  tools: z.array(ToolSchema).optional(),
  credentials: CredentialsSchema.optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type Tool = z.infer<typeof ToolSchema>
