# 🏗️ Arquitetura do Jarvis AIOS — Visão Geral

> **Documento**: Resumo arquitetural do sistema  
> **Status**: ✅ Completo  
> **Público**: Arquitetos, Engenheiros, Tech Leads  
> **Tempo de Leitura**: 10-15 minutos

---

## O que é JARVIS AIOS?

**JARVIS AIOS** (AI Operating System) é um assistente pessoal inteligente que orquestra **21 agentes autônomos especializados** para pesquisar, escrever, desenvolver, analisar e entregar resultados reais.

### Valores-Chave
| Aspecto | Detalhe |
|---|---|
| **Interface** | Cockpit estilo Iron Man + Chat/Voz |
| **Modelo Principal** | Claude Sonnet 4.6 (Anthropic) |
| **Agentes** | 21 especializados em paralelo |
| **Memória** | Persistente (Supabase PostgreSQL) |
| **Público-alvo** | Empreendedores, criadores, profissionais autônomos |
| **Diferencial** | Wake word "JARVIS", voz streaming, 21 especialistas |

---

## 🏛️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript strict
- **Estilo**: Tailwind CSS + Orbitron/Share Tech Mono
- **UI/UX**: Cockpit Iron Man com 3 painéis, animações HUD

### Backend & APIs
- **LLM Principal**: Claude Sonnet 4.6 (Anthropic)
- **Voz**: OpenAI Realtime API (gpt-4o-realtime-preview)
- **Wake Word**: Web Speech API (Chrome only)
- **Runtime**: Node.js LTS

### Infrastructure & Persistence
- **Database**: Supabase (PostgreSQL hosted)
- **Deploy**: Vercel + GitHub
- **Background Jobs**: Node.js worker (`jarvis-worker.js`)
- **Protocolo**: REST API (SSE, WebSocket)

---

## 🎯 Arquitetura de Alto Nível

```
                    ┌────── VOCÊ ──────┐
                    │   (Usuário)       │
                    │ Text + Voice      │
                    └────────┬──────────┘
                             │
                  ┌──────────▼────────────┐
                  │  JARVIS COCKPIT       │
                  │  (Next.js 15 + React) │
                  └──────────┬────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                 [TEXTO]           [VOZ]
                    │                 │
             /api/jarvis-chat    OpenAI Realtime
                 (SSE)          WebSocket
                    │                 │
                    ├─────────┬────────┤
                    │         │        │
                Claude Sonnet 4.6      │
                (text & voice)         │
                    │                  │
                    └────────┬─────────┘
                             │
                   ┌─────────▼───────────┐
                   │ /api/agent-execute  │
                   │  Orchestrator       │
                   │  Promise.all (21x)  │
                   └─────────┬───────────┘
                             │
                   ┌─────────▼───────────┐
                   │   21 Agentes        │
                   │  (Claude paralelo)  │
                   └─────────┬───────────┘
                             │
                   ┌─────────▼───────────┐
                   │  Supabase DB        │
                   │  (5 tabelas)        │
                   └─────────────────────┘
```

---

## 📊 6 Fluxos Principais

### Fluxo 1: Wake Word (Voz)
**Como funciona**: Usuário diz "JARVIS, ..." → Web Speech API detecta → OpenAI Realtime inicia → resposta de voz

**Componentes**: `useWakeWord`, `useAudioCapture`, `useRealtimeSession`, `useAudioPlayback`

**Timeout**: 30 segundos de conversa contínua

---

### Fluxo 2: Chat (Texto)
**Como funciona**: Usuário digita → `/api/jarvis-chat` com SSE → Claude responde token-por-token → `ChatPanel` exibe em tempo real

**Componentes**: `useJarvisChat`, `ChatPanel.tsx`, `jarvisPrompt.ts`

**Estados**: `idle` → `thinking` → `streaming` → `done`/`error`

---

### Fluxo 3: Delegação de Agentes
**Como funciona**: JARVIS detecta `[DELEGATE: {agent, task}]` → `agentRouter` parseia → `/api/agent-execute` executa 21 agentes em `Promise.all` → resultado no chat

**Componentes**: `useAgentOrchestrator`, `agentRouter.ts`, `agent-execute/route.ts`

**Retorno**: Cada agente retorna JSON `{status, result, metadata}`

---

### Fluxo 4: Memória Persistente
**Como funciona**: JARVIS executa tool call (`remember_fact`, `search_memory`, `write_file`, `save_project`) → `/api/jarvis-memory` → Supabase → confirmação no chat

**Componentes**: `jarvisMemory.ts`, `jarvis-memory/route.ts`, Supabase tables

**Tabelas**: `jarvis_memory`, `user_facts`, `jarvis_files`

---

### Fluxo 5: Worker Autônomo
**Como funciona**: `jarvis-worker.js` executa a cada 3 minutos → 6 agentes AIOS em paralelo → brief.md salvo → aparece na aba DOCS

**Componentes**: `jarvis-worker.js` (Node.js puro, sem Next.js)

**Ciclo**: 3 minutos (configurável)

---

### Fluxo 6: Boot Sequence
**Como funciona**: Usuário abre → `locked` (senha) → `mic-prompt` (permissão) → `booting` (sequência 3s) → `ready` (cockpit operacional)

**Componentes**: `JarvisCockpit.tsx`, `PasswordGate.tsx`, `BootSequence.tsx`, `MicPermissionOverlay.tsx`

**Estados**: locked → mic-prompt → booting → ready

---

## 🧠 Os 21 Agentes

### AIOS Core (6 — Intelecto Geral)
| Agente | Especialidade |
|---|---|
| `@analyst` | Análise de mercado, ROI, decisões estratégicas |
| `@developer` | Full-stack sênior (TypeScript/Node/Python/React) |
| `@researcher` | Pesquisa profunda com fontes citadas |
| `@writer` | Copywriting, conteúdo digital, e-mails |
| `@ux-design-expert` | UX/UI, wireframes, acessibilidade |
| `@manager` | Gerência de projetos, OKRs, metodologias |

### Fábrica Rentável (15 — Negócios e Monetização)
`@ideias-nichos` · `@criador-conteudo` · `@produtor-cursos` · `@designer` · `@empacotador` · `@cortes-virais` · `@gestor-contas` · `@trafego-organico` · `@vendas` · `@relacionamento` · `@auditor` · `@analista-metricas` · `@automacao-tecnica` · `@financeiro-pix` · `@melhoria-continua`

---

## 💾 Banco de Dados — 5 Tabelas

```sql
jarvis_memory     -- Histórico de conversas
user_facts        -- Fatos sobre o usuário
agent_knowledge   -- Conhecimento acumulado por agente
jarvis_files      -- Arquivos entregues (aparecem em DOCS)
oraculo_knowledge -- Pesquisa autônoma (ORÁCULO)
```

**Segurança**: Row Level Security (RLS) com policy `allow_all` (acesso público via chave anônima)

---

## 🔌 Protocolo de Delegação

```
[DELEGATE: {
  "agent": "@analyst",
  "task": "Análise de mercado SaaS",
  "priority": "high",
  "context": "..."
}]

[EXECUTE: {
  "command": "npm run build"
}]
```

**Parsing**: `agentRouter.parseDelegations()`, `parseExecutions()`

---

## 🎨 Design System

| Elemento | Valor |
|---|---|
| **Cor de fundo** | `#020609` (preto) |
| **Primária** | `#00d4ff` (cyan) |
| **Sucesso** | `#00ff88` (verde) |
| **Fontes** | Orbitron (display) + Share Tech Mono (code) |
| **Layout** | 3 colunas: 320px esquerda \| flex centro \| 320px direita |
| **Status bar** | 40px com relógio em tempo real |
| **Efeitos** | Scan lines, vignette, HUD corners, hex grid |

---

## 📡 Convenções Críticas

- ✅ **TypeScript strict** — sem `any` implícito
- ✅ **Wake word Chrome-only** — Web Speech API não funciona em Firefox/Edge
- ✅ **`create_response: false`** no OpenAI Realtime — evita respostas automáticas
- ✅ **SSE para chat** — nunca bloquear aguardando resposta completa
- ✅ **Worker sem Next.js** — `jarvis-worker.js` usa `@anthropic-ai/sdk` direto
- ✅ **Chaves de API no `.env.local`** — nunca commitar

---

## 📖 Próximas Leituras

| Se você quer... | Leia... |
|---|---|
| Análise técnica detalhada | [`ANALISE_DETALHADA.md`](./ANALISE_DETALHADA.md) (896 linhas) |
| Implementar um novo agente | [`03-DEVELOPMENT/WORKFLOW_TASKS.md`](../03-DEVELOPMENT/WORKFLOW_TASKS.md) |
| Entender as APIs | [`04-API-REFERENCE/ENDPOINTS.md`](../04-API-REFERENCE/ENDPOINTS.md) |
| Fazer deploy | [`05-DEPLOYMENT/VERCEL.md`](../05-DEPLOYMENT/VERCEL.md) |
| Troubleshoot | [`06-OPERATIONS/TROUBLESHOOTING.md`](../06-OPERATIONS/TROUBLESHOOTING.md) |
| Dúvidas rápidas | [`07-KNOWLEDGE-BASE/GLOSSARIO.md`](../07-KNOWLEDGE-BASE/GLOSSARIO.md) |

---

## 🎯 Checklist de Entendimento

- [ ] Entendi o que é Jarvis AIOS (assistente + 21 agentes)
- [ ] Conheço os 6 fluxos principais
- [ ] Sei o stack: Next.js, Claude, OpenAI, Supabase
- [ ] Entendo a orquestração de agentes com `[DELEGATE: {...}]`
- [ ] Sou capaz de localizar um arquivo específico na estrutura
- [ ] Sei aonde está documentado cada componente

**Quando marcar tudo**: Você está pronto para explorar módulos específicos.
