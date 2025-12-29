import { logger } from '@/lib/logger'

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
  content?: string
}

export interface AttachmentContext {
  files: FileAttachment[]
  totalCount: number
  totalSize: number
}

/**
 * Format attachments for AI context
 */
export function formatAttachmentsForAI(attachments: FileAttachment[]): string {
  if (attachments.length === 0) {
    return ''
  }

  const parts: string[] = ['## Attached Files']

  for (const file of attachments) {
    parts.push(`- **${file.name}** (${file.type}, ${formatBytes(file.size)})`)
    if (file.content) {
      parts.push(`  \`\`\`${getFileLanguage(file.type)}`)
      parts.push(truncateContent(file.content, 2000))
      parts.push('  ```')
    }
  }

  return parts.join('\n')
}

/**
 * Get file extension/content type language for code blocks
 */
function getFileLanguage(mimeType: string): string {
  const languageMap: Record<string, string> = {
    'application/json': 'json',
    'text/javascript': 'javascript',
    'text/typescript': 'typescript',
    'text/python': 'python',
    'text/html': 'html',
    'text/css': 'css',
    'text/markdown': 'markdown',
    'text/plain': 'text',
  }
  return languageMap[mimeType] || 'text'
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Truncate content for context
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.slice(0, maxLength) + '\n... (truncated)'
}
