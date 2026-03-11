# API Endpoints — Overview

Este documento lista os endpoints principais do Jarvis (implementação mínima). Para detalhes de payloads e exemplos, veja `PAYLOADS.md`.

## Public endpoints

- **POST** `/api/jarvis-chat` — inicia uma conversa por texto com streaming SSE.
  - Auth: Bearer server key (server-side only)
  - Description: Recebe um prompt do usuário e proxy para Claude com Server-Sent Events (stream de tokens).
  - Request: `JarvisChatRequest` (ver `PAYLOADS.md`).
  - Response: SSE stream com eventos `data: <token>` e `data: [DONE]`.

- **POST** `/api/realtime-token` — gera token efêmero para OpenAI Realtime.
  - Auth: server-side only
  - Description: Retorna um token temporário usado pelo cliente para abrir WebSocket Realtime.
  - Request: { optional `sessionId` }
  - Response: `RealtimeTokenResponse` (ver `PAYLOADS.md`).


## Tool / internal endpoints

- **POST** `/api/jarvis-memory` — executa operações de memória (tool-call): `remember_fact`, `search_memory`, `write_file`, `save_project`.
  - Auth: server-side only
  - Request: `MemoryToolRequest` (ver `PAYLOADS.md`).
  - Response: operation result (tool specific).

- **POST** `/api/agent-execute` — executa um agente especializado (delegation executor).
  - Auth: server-side only
  - Request: `AgentExecuteRequest` (ver `PAYLOADS.md`).
  - Response: `AgentExecuteResponse` with result and metadata.


## Notes for implementers

- All server endpoints that call LLMs or hold API keys must run server-side (Next.js server or serverless functions). Do not expose secrets to the browser.
- Use `create_response: false` when updating realtime sessions to avoid unsolicited model replies.
- Keep request/response contracts in sync with `docs/04-API-REFERENCE/PAYLOADS.md`.
