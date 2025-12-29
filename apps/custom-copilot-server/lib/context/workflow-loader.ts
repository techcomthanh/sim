import { logger } from '@/lib/logger'

interface WorkflowContext {
  workflowId: string
  name: string
  description: string
  context?: string
  tools: string[]
}

interface SimWorkflowResponse {
  workflow?: {
    id: string
    name: string
    description: string
    context?: string
    tools: Array<{ name: string }>
  }
}

/**
 * Fetch workflow context from SIM app
 */
export async function loadWorkflowContext(
  workflowId: string,
  simUrl: string,
  apiKey?: string
): Promise<WorkflowContext | null> {
  try {
    const response = await fetch(
      `${simUrl}/api/copilot/workflow/${encodeURIComponent(workflowId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
      }
    )

    if (!response.ok) {
      logger.warn(`Failed to load workflow ${workflowId}: ${response.status}`)
      return null
    }

    const data: SimWorkflowResponse = await response.json()

    if (!data.workflow) {
      logger.warn(`Workflow not found: ${workflowId}`)
      return null
    }

    return {
      workflowId: data.workflow.id,
      name: data.workflow.name,
      description: data.workflow.description,
      context: data.workflow.context,
      tools: data.workflow.tools.map((t) => t.name),
    }
  } catch (error) {
    logger.error(`Error loading workflow ${workflowId}:`, error)
    return null
  }
}

/**
 * Build system prompt from workflow context
 */
export function buildSystemPrompt(workflow: WorkflowContext): string {
  const parts: string[] = []

  parts.push(`# Workflow: ${workflow.name}`)
  parts.push(``)
  parts.push(`${workflow.description}`)

  if (workflow.context) {
    parts.push(``)
    parts.push(`## Context`)
    parts.push(workflow.context)
  }

  if (workflow.tools.length > 0) {
    parts.push(``)
    parts.push(`## Available Tools`)
    parts.push(`You have access to the following tools: ${workflow.tools.join(', ')}`)
  }

  return parts.join('\n')
}
