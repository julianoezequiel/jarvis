# 🔌 API-REFERENCE — Endpoints, Schemas, Payloads

> Documentação focada em **COMO USAR AS APIs**. Endpoints REST, SSE, WebSocket, schemas de request/response, exemplos, Postman collection.
>
> **Público**: Desenvolvedores, Integradores, QA

---

## 📁 Conteúdo desta Pasta

```
04-API-REFERENCE/
├── README.md                    ← Você está aqui
├── ENDPOINTS.md                 ← Lista e descrição de todos endpoints
├── AUTHENTICATION.md            ← Como autenticar (Supabase, headers)
├── PAYLOADS.md                  ← Estrutura de request/response
├── ERRORS.md                    ← Tratamento de erros, status codes
├── EXAMPLES.md                  ← Exemplos de calls (cURL, fetch, Postman)
├── WEBSOCKET.md                 ← WebSocket para realtime
├── SSE.md                       ← Server-Sent Events (streaming)
├── RATE_LIMITING.md             ← Rate limits, quotas
├── schemas/                     ← JSON schemas
│   ├── ChatMessage.json
│   ├── DelegateCommand.json
│   ├── AgentState.json
│   └── ...
└── postman/
    └── PontoCore_API.postman_collection.json
```

---

## Que Informações Estão Aqui?

| Documento | Descrição | Tempo | Público |
|---|---|---|---|
| **ENDPOINTS.md** | Todos endpoints (método, path, descrição) | 20–30 min | Todos |
| **AUTHENTICATION.md** | Headers, tokens, Supabase RLS | 10–15 min | Devs |
| **PAYLOADS.md** | Request/response structures | 15–20 min | Devs |
| **ERRORS.md** | Status codes, error messages | 10–15 min | Devs, QA |
| **EXAMPLES.md** | cURL, fetch, Postman examples | 15–20 min | Devs |
| **WEBSOCKET.md** | Realtime WebSocket com OpenAI | 20–30 min | Backend devs |
| **SSE.md** | Server-Sent Events (streaming) | 15–20 min | Backend devs |
| **RATE_LIMITING.md** | Limites, quotas, throttling | 10–15 min | Devs, Ops |

---

## 🎯 Guia de Navegação

### "Qual é o endpoint para X?"
→ Leia **ENDPOINTS.md** (30 min)

### "Como autenticar?"
→ Leia **AUTHENTICATION.md** (15 min)

### "Qual é a estrutura de request/response?"
→ Leia **PAYLOADS.md** (20 min)

### "Como faço uma chamada?"
→ Leia **EXAMPLES.md** (20 min) + use Postman

### "Qual erro recebi e o que significa?"
→ Leia **ERRORS.md** (15 min)

### "Como uso WebSocket?"
→ Leia **WEBSOCKET.md** (30 min)

### "Como funciona SSE?"
→ Leia **SSE.md** (20 min)

---

## 📊 Endpoints Rápidos

| Método | Path | Descrição |
|---|---|---|
| **POST** | `/api/jarvis-chat` | Chat com streaming SSE |
| **POST** | `/api/jarvis-memory` | CRUD memória (remember_fact, search_memory, etc) |
| **POST** | `/api/agent-execute` | Executar agentes em paralelo |
| **POST** | `/api/realtime-token` | Token ephemeral para OpenAI Realtime |
| **POST** | `/api/oraculo/cycle` | Ciclo autônomo do ORÁCULO (6h) |
| **GET** | `/api/health` | Health check |

---

## 🔐 Autenticação

```
Headers:
X-Auth-Token: {{token}}

OU

Body:
{
  "session_id": "...",
  "user_id": "..." (opcional, via Supabase)
}
```

---

## 📝 Exemplo de Call (Fetch)

```javascript
const response = await fetch('/api/jarvis-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Prefer': 'text/event-stream'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Olá JARVIS!' }
    ]
  })
});

// Fazer streaming SSE
for await (const chunk of response.body) {
  const text = new TextDecoder().decode(chunk);
  console.log(text); // Token por token
}
```

---

## 🔗 Links Relacionados

- **Architecture (fluxos)** → [`02-ARCHITECTURE/API_DESIGN.md`](../02-ARCHITECTURE/API_DESIGN.md)
- **Development (implementação)** → [`03-DEVELOPMENT/`](../03-DEVELOPMENT/)
- **Database schema** → [`02-ARCHITECTURE/DATABASE_SCHEMA.md`](../02-ARCHITECTURE/DATABASE_SCHEMA.md)

---

## 📝 Checklist para API Consumer

- [ ] ENDPOINTS.md revisado
- [ ] AUTHENTICATION.md entendido
- [ ] Exemplo testado localmente
- [ ] Headers corretos
- [ ] Payload structures validados
- [ ] Tratamento de errors implementado
- [ ] Rate limits considerados

---

## 💡 Postman Collection

Importe em Postman:
```
postman/PontoCore_API.postman_collection.json
```

Configure variáveis:
```
base_url: http://localhost:8090/apiponto
token: {{token}}
session_id: {{session_id}}
```

---

**Próximo**: Leia [`ENDPOINTS.md`](./ENDPOINTS.md) →

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: API Team
