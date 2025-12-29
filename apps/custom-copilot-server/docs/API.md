# Custom Copilot Server - API Documentation

## Base URL

```
http://localhost:3001
```

## Authentication

### Copilot API Key

Optional `x-api-key` header for requests from SIM app.

```http
x-api-key: your-copilot-api-key
```

If `COPILOT_API_KEY` is set server-side, requests must include this header.

## Endpoints

### 1. Chat Completion (Streaming)

`POST /api/chat-completion-streaming`

Stream chat completions with Server-Sent Events (SSE).

#### Request

```http
POST /api/chat-completion-streaming
Content-Type: application/json
x-api-key: optional-api-key

{
  "userId": "user-123",
  "workflowId": "workflow-abc",
  "mode": "agent",
  "model": "claude-3-5-sonnet-20241022",
  "message": "Hello!",
  "tools": [...]
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User identifier |
| workflowId | string | Yes | Workflow identifier for context |
| mode | string | Yes | "agent" or "chat" |
| model | string | Yes | AI model identifier |
| message | string | Yes | User message |
| tools | Tool[] | No | Available tools for agent mode |

#### Tool Schema

```typescript
{
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}
```

#### Response (SSE Stream)

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-12-28T12:01:00Z
```

#### SSE Events

**Content Event**
```
event: content
data: {"content": "Hello"}
```

**Tool Call Event**
```
event: tool_call
data: {"id":"tc-1","name":"echo","arguments":{...}}
```

**Tool Result Event**
```
event: tool_result
data: {"toolCallId":"tc-1","result":{...}}
```

**Done Event**
```
event: done
data: {"id":"resp-1234567890"}
```

**Error Event**
```
event: error
data: {"error":"Error message"}
```

#### Response Codes

| Code | Description |
|------|-------------|
| 200 | Success (SSE stream) |
| 401 | Unauthorized (invalid API key) |
| 429 | Rate limit exceeded |
| 400 | Invalid request |

---

### 2. Health Check

`GET /api/health`

Check server and service health.

#### Response

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

---

### 3. Statistics

`GET /api/stats`

Get usage statistics.

#### Response

```json
{
  "totalMessages": 1234,
  "totalUsers": 56,
  "totalRequests": 7890
}
```

---

## Rate Limiting

### User-based Limits

- **Limit**: 100 requests/minute
- **Key**: `ratelimit:{userId}`

### IP-based Limits

- **Limit**: 200 requests/minute
- **Key**: `ratelimit:ip:{ipAddress}`

### Rate Limit Headers

```http
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-12-28T12:01:00Z
```

### Rate Limit Error Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "resetAt": "2025-12-28T12:01:00Z"
}
```

---

## CORS Headers

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
```

---

## Model Provider Mapping

| Model Prefix | Provider |
|--------------|----------|
| `claude-*` | Anthropic |
| `gpt-*` | OpenAI |
| `ollama:*` | Ollama |
| Other | `DEFAULT_PROVIDER` env var |

---

## Example Usage

### curl

```bash
curl -X POST http://localhost:3001/api/chat-completion-streaming \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "userId": "user-123",
    "workflowId": "workflow-abc",
    "mode": "chat",
    "model": "claude-3-5-sonnet-20241022",
    "message": "Hello!"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3001/api/chat-completion-streaming', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key',
  },
  body: JSON.stringify({
    userId: 'user-123',
    workflowId: 'workflow-abc',
    mode: 'chat',
    model: 'claude-3-5-sonnet-20241022',
    message: 'Hello!',
  }),
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const text = decoder.decode(value)
  console.log(text)
}
```

### Python

```python
import requests
import json

response = requests.post(
    'http://localhost:3001/api/chat-completion-streaming',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key',
    },
    json={
        'userId': 'user-123',
        'workflowId': 'workflow-abc',
        'mode': 'chat',
        'model': 'claude-3-5-sonnet-20241022',
        'message': 'Hello!',
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```
