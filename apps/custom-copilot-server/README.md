# Custom Copilot Server

Self-hosted alternative to SIM AI's copilot server. Supports multiple AI providers (Anthropic, OpenAI, Ollama) with PostgreSQL for chat history and Redis for rate limiting.

## Features

- **Multiple AI Providers**: Anthropic (Claude), OpenAI (GPT), Ollama (local models)
- **User API Keys**: Users can store their own encrypted API keys (AES-256-GCM)
- **Chat History**: Persistent chat history stored in PostgreSQL
- **Rate Limiting**: Redis-based rate limiting (per-user and per-IP)
- **Tool Execution**: Dual-tool architecture (client tools delegated to SIM, server tools local)
- **Workflow Context**: Loads workflow context from SIM app for contextual AI responses
- **SSE Streaming**: Server-Sent Events for real-time streaming responses

## Quick Start

### Prerequisites

- Node.js 18+ / Bun
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
cd apps/custom-copilot-server
bun install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/copilot

# Redis
REDIS_URL=redis://localhost:6379

# Encryption (32 bytes hex for AES-256-GCM)
ENCRYPTION_KEY=your-32-byte-hex-key-here

# Copilot API (optional, for SIM app communication)
COPILOT_API_KEY=your-secret-api-key
SIM_APP_URL=http://localhost:3000

# AI Providers (fallback when user key not provided)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_URL=http://localhost:11434

# Default Provider
DEFAULT_PROVIDER=anthropic
DEFAULT_MODEL=claude-3-5-sonnet-20241022
```

### Database Setup

```bash
bun run db:generate  # Generate migrations
bun run db:push      # Push schema to database
```

### Development

```bash
bun run dev
```

Server runs on `http://localhost:3001`

### Production

```bash
bun run build
bun run start
```

## API Endpoints

### POST `/api/chat-completion-streaming`

Main chat endpoint with SSE streaming.

**Headers:**
- `Content-Type: application/json`
- `x-api-key: your-copilot-api-key` (optional)

**Request Body:**
```json
{
  "userId": "user-123",
  "workflowId": "workflow-abc",
  "mode": "agent" | "chat",
  "model": "claude-3-5-sonnet-20241022",
  "message": "Hello, how can you help?",
  "tools": [
    {
      "name": "echo",
      "description": "Echo back input",
      "inputSchema": { ... }
    }
  ]
}
```

**Response (SSE):**
```
event: content
data: {"content": "Hello"}

event: tool_call
data: {"id": "tc-1", "name": "echo", "arguments": {...}}

event: tool_result
data: {"toolCallId": "tc-1", "result": {...}}

event: done
data: {"id": "resp-1"}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-28T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### GET `/api/stats`

Usage statistics.

**Response:**
```json
{
  "totalMessages": 1234,
  "totalUsers": 56,
  "totalRequests": 7890
}
```

## Architecture

### Directory Structure

```
lib/
├── auth/           # Authentication & rate limiting
├── context/        # Workflow context & chat history
├── crypto/         # AES-256-GCM encryption
├── db/             # Database schema & client
├── providers/      # AI provider implementations
├── schemas/        # Zod validation schemas
├── streaming/      # SSE utilities
└── tools/          # Tool execution framework
```

### Provider Selection

Models are routed to providers by prefix:
- `claude-*` → Anthropic
- `gpt-*` → OpenAI
- `ollama:*` → Ollama
- Other → `DEFAULT_PROVIDER` env var

### Tool Execution

- **Client Tools**: Delegated to SIM app via `/api/copilot/execute-tool`
- **Server Tools**: Executed locally (e.g., `echo`, `get_current_time`)

### Rate Limiting

- User-based: 100 requests/minute
- IP-based: 200 requests/minute

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install
COPY . .
RUN bun run build
EXPOSE 3001
CMD ["bun", "run", "start"]
```

### Environment Variables for Production

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ENCRYPTION_KEY=... # 32-byte hex
COPILOT_API_KEY=... # Strong secret
```

## Security

- API keys encrypted with AES-256-GCM before storage
- Rate limiting to prevent abuse
- CORS configurable via headers
- Optional copilot API key validation

## License

MIT
