# Jarvis AIOS — AI Coding Instructions

> **Projeto:** JARVIS AIOS — Assistente pessoal com IA e 21 agentes autônomos.
> **Interface:** Cockpit estilo Iron Man — chat + voz + agentes especializados.
> **Stack:** Next.js 15 + TypeScript + Claude AI (Anthropic) + OpenAI Realtime + Supabase + Vercel.
> **Documentação completa:** `docs/` (documentos `.md` convertidos dos PDFs originais).

---

## Architecture Overview

### Stack Tecnológico

| Categoria | Tecnologia | Versão / Detalhe |
|---|---|---|
| **Frontend** | Next.js + TypeScript + Tailwind CSS | v15, App Router |
| **Runtime** | Node.js | LTS |
| **LLM Principal** | Claude (Anthropic) | claude-sonnet-4-6 |
| **Voz** | OpenAI Realtime API | gpt-4o-realtime-preview |
| **Wake Word** | Web Speech API (nativa do browser) | Chrome only |
| **Banco de Dados** | Supabase (PostgreSQL hosted) | gratuito tier |
| **Background Worker** | Node.js puro | `jarvis-worker.js` |
| **Deploy** | Vercel + GitHub | gratuito |
| **CLI de Desenvolvimento** | Claude Code | `@anthropic-ai/claude-code` |

### Estrutura do Projeto

```
meu-jarvis/
  src/
    app/
      api/
        jarvis-chat/route.ts        ← SSE streaming com Claude (claude-sonnet-4-6)
        jarvis-memory/route.ts      ← Operações de memória no Supabase
        agent-execute/route.ts      ← Execução dos 21 agentes autônomos
        realtime-token/route.ts     ← Token efêmero OpenAI Realtime
        oraculo/cycle/route.ts      ← Ciclo do ORÁCULO (agendado via cron)
      page.tsx                      ← Cockpit principal
      layout.tsx                    ← Fontes: Orbitron + Share Tech Mono
      globals.css                   ← Animações, scan lines, efeitos HUD
    components/cockpit/
      JarvisCockpit.tsx             ← Componente raiz (estados: locked/booting/ready)
      StatusBar.tsx                 ← Barra de status com relógio em tempo real
      HexGrid.tsx                   ← Fundo de hexágonos animados (SVG)
      CentralOrb.tsx                ← Orbe central que reage ao áudio (Web Audio API)
      ChatPanel.tsx                 ← Painel esquerdo: chat com streaming
      AgentSquadPanel.tsx           ← Painel direito: grid de 21 agentes com status
      DeliveriesPanel.tsx           ← Painel direito: aba DOCS (download ZIP)
      PasswordGate.tsx              ← Tela de senha Iron Man (padrão: "1234")
      BootSequence.tsx              ← Boot sequence estilo Iron Man (~3s)
      MicPermissionOverlay.tsx      ← Pedido de permissão do microfone
    hooks/
      useJarvisChat.ts              ← Chat SSE (idle/thinking/streaming/done/error)
      useWakeWord.ts                ← Web Speech API — detecta "jarvis"
      useAudioCapture.ts            ← Mic → PCM16 em chunks de 100ms
      useAudioPlayback.ts           ← PCM16 → AudioContext com barge-in
      useRealtimeSession.ts         ← Orquestrador OpenAI Realtime
      useAgentOrchestrator.ts       ← Parseia DELEGATE/EXECUTE, executa agentes em paralelo
      useJarvisDeliveries.ts        ← Polling Supabase/jarvis_files a cada 5s
    lib/
      jarvisPrompt.ts               ← System prompt (personalidade britânica, chama de "Sir")
      jarvisMemory.ts               ← saveMessage, searchMemory, saveUserFact, getRecentContext
      supabase.ts                   ← Cliente Supabase
      realtimeClient.ts             ← WebSocket OpenAI
      agentRouter.ts                ← parseDelegations, parseExecutions, stripProtocols
    types/
      agents.ts                     ← AgentId, AgentState, DelegateCommand
  jarvis-worker.js                  ← Worker autônomo em background (ciclos de 3min)
  vercel.json                       ← Deploy (maxDuration 60s, cron 6h para ORÁCULO)
  .env.local                        ← Chaves de API (NÃO commitar)
```

### Os 21 Agentes — AIOS CORE

**AIOS Core (6) — Inteligência geral:**

| Agente | Especialidade |
|---|---|
| `@analyst` | Análise de mercado, ROI, inteligência competitiva, decisões estratégicas |
| `@developer` | Full-stack sênior: TypeScript/Node.js/Python/React, código completo e comentado |
| `@researcher` | Pesquisa profunda, benchmarking, curadoria de fontes primárias |
| `@writer` | Copywriting de alto impacto, conteúdo digital, roteiros, e-mails, posts virais |
| `@ux-design-expert` | UX/UI, wireframes, arquitetura de informação, acessibilidade |
| `@manager` | Gestão de projetos, OKRs, roadmaps, metodologias ágeis |

**Fábrica Rentável (15) — Negócios e monetização:**

`@ideias-nichos` · `@criador-conteudo` · `@produtor-cursos` · `@designer` · `@empacotador` · `@cortes-virais` · `@gestor-contas` · `@trafego-organico` · `@vendas` · `@relacionamento` · `@auditor` · `@analista-metricas` · `@automacao-tecnica` · `@financeiro-pix` · `@melhoria-continua`

### Protocolo de Delegação (no texto do chat)

```
[DELEGATE: {"agent":"@analyst","task":"Análise de mercado SaaS","priority":"high","context":"..."}]
[EXECUTE: {"command":"npm run build"}]
```

### Banco de Dados — Supabase (5 tabelas)

```sql
jarvis_memory     (id uuid, role text, content text, session_id text, importance int, created_at timestamptz)
user_facts        (id uuid, fact text, category text, importance int, source text, created_at timestamptz)
agent_knowledge   (id uuid, agent_id text, skill_name text, content text, quality int, created_at timestamptz)
jarvis_files      (id uuid, path text, content text, project_name text, session_id text, created_at timestamptz)
oraculo_knowledge (id uuid, topic text, content text, source text, quality int, created_at timestamptz)
```

### Variáveis de Ambiente

```env
ANTHROPIC_API_KEY=sk-ant-...               # Obrigatória — Claude API
OPENAI_API_KEY=sk-proj-...                 # Obrigatória — Voz Realtime
NEXT_PUBLIC_SUPABASE_URL=https://...       # Obrigatória — Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...       # Obrigatória — Supabase
NEXT_PUBLIC_WAKE_WORD=jarvis               # Padrão: jarvis
NEXT_PUBLIC_JARVIS_VOICE=alloy             # Opções: alloy/echo/fable/onyx/nova
NEXT_PUBLIC_REALTIME_MODEL=gpt-4o-realtime-preview
GEMINI_API_KEY=...                         # Opcional
GROQ_API_KEY=...                           # Opcional
```

---

## Fluxos Principais

### Fluxo 1 — Wake Word (Voz)
```
Microfone → Web Speech API → detecta "jarvis" → OpenAI Realtime WebSocket
→ PCM16 chunks → resposta de voz → 30s de conversa livre
```

### Fluxo 2 — Chat (Texto)
```
Input do usuário → /api/jarvis-chat → Claude claude-sonnet-4-6 com SSE
→ streaming token a token → ChatPanel
```

### Fluxo 3 — Delegação de Agentes
```
JARVIS detecta [DELEGATE: {agent, task}] → agentRouter.parseDelegations()
→ /api/agent-execute em paralelo (Promise.all) → Claude com system prompt do agente
→ resultado no chat + AgentSquadPanel muda para "ATIVO"
```

### Fluxo 4 — Memória Persistente
```
JARVIS executa tool call (remember_fact / search_memory / write_file)
→ /api/jarvis-memory → Supabase → confirma no chat
```

### Fluxo 5 — Worker Autônomo
```
jarvis-worker.js → setInterval(3min) → 6 agentes AIOS em Promise.all
→ brief completo.md → salvo em jarvis_files → aparece na aba DOCS
```

### Fluxo 6 — Autenticação / Boot
```
'locked' → PasswordGate (senha "1234") → 'mic-prompt' → MicPermissionOverlay
→ 'booting' → BootSequence (~3s) → 'ready' → JarvisCockpit completo
```

---

## Developer Workflows

```bash
# Instalar Claude Code (única instalação manual)
npm install -g @anthropic-ai/claude-code
claude

# Desenvolvimento local
npm run dev                    # Next.js em localhost:3000
npx tsc --noEmit               # Verificação TypeScript
node jarvis-worker.js          # Worker autônomo em terminal separado

# Deploy
git add -A && git commit -m "feat: descrição" && git push
# Vercel redeploya automaticamente em ~30s
```

### Custo Mensal Estimado

| Serviço | Uso pessoal (1-2h/dia) | Uso intenso (8h/dia) |
|---|---|---|
| Anthropic (Claude) | ~$5–10 USD | ~$30–60 USD |
| OpenAI (Voz Realtime) | ~$3–8 USD | ~$20–40 USD |
| Supabase | Gratuito | Gratuito |
| Vercel | Gratuito | Gratuito |

---

## Critical Conventions

- **TypeScript strict** — sem `any` implícito; tipar todos os estados e retornos de API
- **Wake word somente no Chrome** — Web Speech API não funciona em Firefox/Edge
- **`create_response: false`** no `session.update` do OpenAI Realtime — JARVIS só responde após wake word, nunca a falas aleatórias
- **SSE para streaming** — nunca bloquear a resposta aguardando o texto completo; usar Server-Sent Events
- **Ferramentas do JARVIS** — `remember_fact`, `search_memory`, `write_file`, `save_project` devem estar registradas tanto no jarvis-chat (Claude tools) quanto no Realtime session.update
- **`jarvis_files` com `project_name`** — arquivos sem projeto aparecem como "LooseFile"; com projeto são agrupados em ProjectCard
- **Worker** — `jarvis-worker.js` usa `@anthropic-ai/sdk` diretamente (Node.js puro), nunca importa libs do Next.js
- **Senhas / API Keys** — nunca commitar `.env.local`; sempre está no `.gitignore`

---

## Workflow de Tasks — Jarvis AIOS

Ao iniciar, trabalhar ou concluir qualquer task, **sempre seguir o instrucional**:

📄 `.github/instructions/task-workflow-jarvis.md`

**Resumo do padrão obrigatório:**
1. **Iniciar** → criar branch `feature/jarvis-TASK-XXX` + pasta `docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/` com `ANDAMENTO.md`, `ANALISE.md` e `CRITERIOS_ACEITE.md`
2. **Durante** → atualizar `ANDAMENTO.md` + commits atômicos com `Refs: TASK-XXX`
3. **Concluir** → 100% dos critérios marcados + merge para `main`
