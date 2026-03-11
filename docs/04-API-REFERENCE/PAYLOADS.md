# API Payloads — Schemas and Examples

Referência rápida dos formatos de requisição/resposta usados pelos endpoints do Jarvis.

## JarvisChatRequest

```json
{
  "sessionId": "string",
  "userId": "string",
  "message": "Olá, explique como configurar o Jarvis",
  "options": { "temperature": 0.2 }
}
```

Response: SSE stream of tokens. Final payload (non-stream) example:

```json
{
  "id": "response-uuid",
  "text": "Resposta completa do modelo",
  "metadata": {}
}
```

## MemoryToolRequest (jarvis-memory)

Common shape:

```json
{
  "tool": "remember_fact|search_memory|write_file|save_project",
  "payload": { /* tool-specific */ }
}
```

Examples:

- remember_fact

```json
{
  "tool": "remember_fact",
  "payload": { "fact": "O usuário prefere tom formal", "importance": 5 }
}
```

- write_file

```json
{
  "tool": "write_file",
  "payload": { "path": "projects/demo/README.md", "content": "# Projeto Demo" }
}
```

## AgentExecuteRequest

```json
{
  "agent": "@developer",
  "task": "Implementar rota /api/jarvis-chat",
  "context": "...",
  "priority": "high"
}
```

Response example:

```json
{
  "agent": "@developer",
  "status": "completed",
  "result": "Arquivo src/app/api/jarvis-chat/route.ts criado (skeleton)",
  "metadata": {}
}
```

## RealtimeTokenResponse

```json
{
  "token": "eyJhbGci...",
  "expiresAt": "2026-03-10T12:34:56Z"
}
```

---
Keep these payloads updated as the implementation evolves. Use JSON Schema or TypeScript interfaces in code to maintain type safety.
