---
applyTo: "**"
---

# Domain Knowledge — Jarvis AIOS (Quick Reference)

> Referência completa do **domínio de negócio** e **arquitetura** do projeto **Jarvis AIOS**.
> Assistente pessoal com IA que orquestra **21 agentes autônomos**.

---

## 🏢 O Que é Jarvis AIOS?

**Jarvis AIOS** é um assistente de IA que permite que você converse (texto + voz) com um orquestrador que delega para **21 agentes Claude especializados**. Sem alternar ferramentas, sem perder contexto, com memória persistente, e entregando resultados como arquivos.

**Interface**: Um cockpit estilo Iron Man (Tony Stark) — web, interactive, visual, futurista.

---

## 📊 Stack Tecnológico

| Camada | Tecnologia | Versão | Propósito |
|---|---|---|---|
| **Frontend** | Next.js 15, TypeScript, React, Tailwind CSS | v15 | UI cockpit |
| **Backend APIs** | Next.js Route Handlers (serverless) | v15 | Endpoints SSE, agent orchestration |
| **LLM Principal** | Claude Sonnet 4.6 (Anthropic) | - | All chat + all agents |
| **Voz / Realtime** | OpenAI Realtime API | gpt-4o-realtime-preview | Live speech 30s |
| **Banco de Dados** | Supabase (PostgreSQL hosted) | - | Memory, files, facts |
| **Cache / Session** | Redis (em Supabase) | - | Session state |
| **Storage** | Supabase Storage | - | Project files delivery |
| **Autenticação** | Supabase Auth (anon + RLS) | - | Row-level security |
| **Deploy** | Vercel + GitHub | - | CD/CI auto |
| **Wake Word** | Web Speech API (Chrome native) | - | Voice trigger |
| **Worker Background** | Node.js puro (@anthropic-ai/sdk) | - | JARVIS ORÁCULO 3min cycles |

---

## 👥 OS 21 AGENTES

### AIOS CORE (6) — Inteligência Geral

| ID | Nome | Especialidade |
|---|---|---|
| `@analyst` | Analista Estratégico | Análise de mercado, ROI, competição, decisões data-driven |
| `@developer` | Dev Full-Stack | TypeScript, Node.js, Python, React, código completo |
| `@researcher` | Pesquisador Profundo | Pesquisa com fontes, benchmarking, sínteses objetivas |
| `@writer` | Copywriter Impact | Copy persuasivo, conteúdo digital, e-mails, posts virais |
| `@ux-design-expert` | Expert UX/UI | Wireframes, fluxos, acessibilidade, specs visuais |
| `@manager` | Gerente Projetos | OKRs, roadmaps, sprints, planos executáveis |

### Fábrica Rentável (15) — Negócios e Monetização

`@ideias-nichos`, `@criador-conteudo`, `@produtor-cursos`, `@designer`, `@empacotador`, `@cortes-virais`, `@gestor-contas`, `@trafego-organico`, `@vendas`, `@relacionamento`, `@auditor`, `@analista-metricas`, `@automacao-tecnica`, `@financeiro-pix`, `@melhoria-continua`

---

## 🗄️ Banco de Dados (Supabase)

### 5 Tabelas Principais

```sql
jarvis_memory      -- Histórico de conversas (role, content, session_id, importance)
user_facts         -- Fatos sobre o usuário (fact, category, importance, source)
agent_knowledge    -- Knowledge por agente (agent_id, skill_name, content, quality)
jarvis_files       -- Arquivos entregues (path, content, project_name, session_id)
oraculo_knowledge  -- Conhecimento do ORÁCULO (topic, content, source, quality)
```

Todos com **Row Level Security** — acesso anônimo via Supabase anon key.

---

## 🔄 Protocolo de Delegação

No texto do chat, o JARVIS emite blocos que o orquestrador parseia:

```
[DELEGATE: {"agent":"@analyst","task":"Análise de mercado SaaS","priority":"high","context":"..."}]
```

O agentRouter.ts:
- Detecta blocos `[DELEGATE: {...}]`
- Chama `/api/agent-execute` em paralelo (Promise.all)
- Cada agente recebe seu system prompt especializado
- Resultado retorna ao chat

---

## 🎬 6 Fluxos Principais

### 1. Voz (Wake Word + 30s)
```
Mic → Web Speech API → detecta "jarvis" → OpenAI Realtime
→ PCM16 chunks → gpt-4o-realtime-preview → resposta de voz
```

### 2. Chat (Texto SSE)
```
Input → /api/jarvis-chat → Claude sonnet-4-6
→ SSE streaming (token a token) → Bolha no ChatPanel
```

### 3. Delegação de Agentes (Paralelo)
```
JARVIS detecta [DELEGATE] → /api/agent-execute
→ Promise.all(21 agentes) → Claude com system prompts → Resultados agrupados
```

### 4. Memória Persistente
```
Tool call (remember_fact, search_memory, write_file, save_project)
→ /api/jarvis-memory → Supabase jarvis_memory / user_facts / jarvis_files
```

### 5. Worker Autônomo (3min)
```
jarvis-worker.js → 6 agentes AIOS em paralelo → Brief.md
→ INSERT jarvis_files (project_name: "💡 BRIEF-Autônomo")
```

### 6. Boot Sequence
```
locked → mic-prompt → booting (typewriter ~3s) → ready → Cockpit ativo
```

---

## 📁 Estrutura de Arquivos (Produção)

```
meu-jarvis/src/
├── app/
│   ├── api/
│   │   ├── jarvis-chat/route.ts         ← SSE Claude
│   │   ├── jarvis-memory/route.ts       ← CRUD Supabase
│   │   ├── agent-execute/route.ts       ← 21 agentes paralelo
│   │   ├── realtime-token/route.ts      ← Token OpenAI ephemeral
│   │   └── oraculo/cycle/route.ts       ← Self-loop 6h
│   ├── page.tsx                         ← Cockpit
│   ├── layout.tsx                       ← Fontes Orbitron, Share Tech Mono
│   └── globals.css                      ← Animações, scan lines, vignette
│
├── components/cockpit/
│   ├── JarvisCockpit.tsx                ← Estado raiz
│   ├── ChatPanel.tsx                    ← Chat SSE (esquerda)
│   ├── AgentSquadPanel.tsx              ← Grid 21 agentes (direita)
│   ├── DeliveriesPanel.tsx              ← Tab DOCS com ZIP download
│   ├── StatusBar.tsx                    ← Relógio (top 40px)
│   ├── HexGrid.tsx                      ← Fundo SVG animado
│   ├── CentralOrb.tsx                   ← Orbe reage ao áudio
│   ├── BootSequence.tsx                 ← Typewriter ~3s
│   ├── PasswordGate.tsx                 ← Tela senha Iron Man ("1234")
│   └── MicPermissionOverlay.tsx         ← Permissão mic
│
├── hooks/
│   ├── useJarvisChat.ts                 ← SSE states: idle/thinking/streaming
│   ├── useWakeWord.ts                   ← SpeechRecognition "jarvis"
│   ├── useAudioCapture.ts               ← Mic → PCM16 (100ms chunks)
│   ├── useAudioPlayback.ts              ← PCM16 → Audio (barge-in)
│   ├── useRealtimeSession.ts            ← OpenAI Realtime WebSocket
│   ├── useAgentOrchestrator.ts          ← Parseia DELEGATE, executa paralelo
│   └── useJarvisDeliveries.ts           ← Polling Supabase jarvis_files (5s)
│
├── lib/
│   ├── jarvisPrompt.ts                  ← System prompt (personalidade "Sir")
│   ├── jarvisMemory.ts                  ← saveMessage, searchMemory, saveUserFact
│   ├── supabase.ts                      ← Client @supabase/supabase-js
│   ├── realtimeClient.ts                ← WebSocket OpenAI
│   └── agentRouter.ts                   ← parseDelegations, parseExecutions
│
└── types/
    └── agents.ts                        ← AgentId, AgentState, DelegateCommand

Root:
├── jarvis-worker.js                     ← Node.js puro; setInterval 3min
├── vercel.json                          ← maxDuration 60s; cron 6h
└── .env.local                           ← NEVER COMMIT
```

---

## 🎨 Design System

| Aspecto | Valor |
|---|---|
| **Fundo** | `#020609` (preto total) |
| **Azul Principal** | `#00d4ff` (cyan brilhante) |
| **Verde Sucesso** | `#00ff88` |
| **Roxo Accent** | `#a78bfa` |
| **Layout** | 3 colunas: 320px \| flex \| 320px + 40px top + 200px bottom |
| **Fontes** | Orbitron (headings), Share Tech Mono (code) |
| **Efeitos** | Scan lines, vignette, HUD corners, hex grid, pulse/float animations |
| **Estados Boot** | locked → mic-prompt → booting → ready |
| **Senha Padrão** | "1234" (configurável) |

---

## 🔧 Variáveis de Ambiente

```env
# Obrigatórias
ANTHROPIC_API_KEY=sk-ant-...                    # Claude API
OPENAI_API_KEY=sk-proj-...                      # Realtime API
NEXT_PUBLIC_SUPABASE_URL=https://...            # Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...            # Supabase anon key

# Opcionais
NEXT_PUBLIC_WAKE_WORD=jarvis                    # Default: jarvis
NEXT_PUBLIC_JARVIS_VOICE=alloy                  # Opções: alloy/echo/fable/onyx/nova
NEXT_PUBLIC_REALTIME_MODEL=gpt-4o-realtime-preview
```

---

## 🔐 Segurança

- **Chaves de API**: Backend-only (never in frontend code)
- **WebSocket**: TLS/WSS
- **Autenticação**: Supabase RLS + anon key (sem login individual)
- **Memória**: Isolada por session_id
- **Wake Word**: Chrome-only (Web Speech API)
- **CORS**: Configurado em vercel.json

---

## 💰 Custo Mensal

| Serviço | Uso Pessoal (1-2h/dia) | Uso Intenso (8h/dia) |
|---|---|---|
| Anthropic (Claude) | ~$5–10 | ~$30–60 |
| OpenAI (Realtime) | ~$3–8 | ~$20–40 |
| Supabase | Gratuito | Gratuito |
| Vercel | Gratuito | Gratuito |
| **TOTAL** | **~$8–18 USD** | **~$50–100 USD** |

---

## 🚀 Como Iniciar (Local)

```bash
# 1. Clone + dependências
git clone https://github.com/seu-user/meu-jarvis.git
cd meu-jarvis
npm install

# 2. Configure .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Dev server
npm run dev
# Acessa localhost:3000

# 4. Worker autônomo (terminal separado)
node jarvis-worker.js
```

---

## 📚 Referências

| Arquivo | Propósito |
|---|---|
| `domain-knowledge.instructions.md` | Canonical (carregado applyTo: "**") |
| `copilot-instructions.md` | Instruções GitHub Copilot |
| `task-workflow-migracao.instructions.md` | Workflow de development |
| `docs/02-ARCHITECTURE/ANALISE_DETALHADA.md` | Arquitetura completa |

---

## ⚠️ Padrões Críticos — NÃO QUEBRAR

1. **SSE Streaming** — Nunca `await response.text()` completo; use `response.body` streaming
2. **Wake Word Chrome-only** — Web Speech API não funciona em Firefox/Safari
3. **`create_response: false`** — Obrigatório no OpenAI Realtime (ou JARVIS responde tudo)
4. **Delegação Strict** — `[DELEGATE: {...}]` no texto; parseia via agentRouter
5. **TypeScript Strict** — Sem `any` implícito; tipar tudo
6. **Worker sem Next.js** — jarvis-worker.js usa `@anthropic-ai/sdk` direto, nunca imports Next.js

---

**Versão**: 1.0 (Production)  
**Última atualização**: 2026-03-10  
**Stack**: Next.js 15 + Claude + OpenAI Realtime + Supabase + Vercel
