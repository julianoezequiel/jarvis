---
applyTo: "**"
---

# Domain Knowledge — Jarvis AIOS

> Este arquivo é carregado automaticamente em todos os contextos de código do workspace.
> Explica o **domínio de negócio** do sistema para que a IA não precise inferi-lo do código.

---

## Visão Geral do Projeto

**JARVIS AIOS** é um assistente pessoal com inteligência artificial baseado no modelo Claude da Anthropic. Funciona como um sistema operacional de agentes — o usuário conversa por texto ou voz e o JARVIS orquestra 21 agentes autônomos especializados para pesquisar, escrever, desenvolver, analisar e entregar resultados reais.

A interface é um cockpit estilo Iron Man / Tony Stark, rodando no browser. O projeto é construído pelo próprio usuário usando Claude Code CLI — sem escrever código manualmente.

| Aspecto | Descrição |
|---|---|
| **Nome** | JARVIS AIOS (AI Operating System) |
| **Tipo** | Assistente pessoal + orquestrador de 21 agentes autônomos |
| **Interface** | Cockpit visual Iron Man — chat + voz + painel de agentes |
| **Público-alvo** | Empreendedores digitais, criadores de conteúdo, profissionais autônomos |
| **Paradigma** | "Você como CEO — os agentes executam" |
| **Diferencial** | Voz (wake word "JARVIS"), memória persistente, 21 especialistas em paralelo |

---

## Arquitetura do Sistema

```
VOCÊ (usuário)
      │
      ├── [TEXTO] → ChatPanel → /api/jarvis-chat (SSE) → Claude claude-sonnet-4-6
      │                                                          │
      │                                                    [DELEGATE: {...}]
      │                                                          │
      │                                            ┌────────────┴────────────┐
      │                                            │   /api/agent-execute    │
      │                                            │  (Promise.all paralelo) │
      │                                            └────────────┬────────────┘
      │                                                         │
      │                                           21 agentes Claude (especializados)
      │
      ├── [VOZ] → "JARVIS, ..." → Web Speech API (wake word)
      │                                   │
      │                          OpenAI Realtime WebSocket
      │                          (PCM16 audio → resposta de voz)
      │
      └── [MEMÓRIA] → remember_fact/search_memory → /api/jarvis-memory → Supabase
                      write_file/save_project → jarvis_files (aparece em DOCS)

WORKER AUTÔNOMO (background, 3min)
      jarvis-worker.js → 6 agentes AIOS em paralelo → brief.md → Supabase

HIERARQUIA COMPLETA:
      VOCÊ
        └── JARVIS (orquestrador central — voz + chat)
              ├── AIOS CORE (6 agentes — intelecto geral)
              ├── FÁBRICA RENTÁVEL (15 agentes — negócios e vendas)
              └── ORÁCULO (pesquisa e conhecimento contínuo)
                    └── SUPABASE (memória) + DOCS (entregas)
```

---

## Stack Tecnológico

| Categoria | Tecnologia | Detalhe |
|---|---|---|
| **Frontend** | Next.js 15 + TypeScript + Tailwind CSS | App Router, `src/` directory |
| **LLM Principal** | Anthropic Claude | `claude-sonnet-4-6` — chat e todos os agentes |
| **Voz** | OpenAI Realtime API | `gpt-4o-realtime-preview` — PCM16 streaming |
| **Wake Word** | Web Speech API (browser nativo) | Só funciona no Chrome |
| **Banco de Dados** | Supabase (PostgreSQL hosted) | 5 tabelas, Row Level Security |
| **Deploy** | Vercel + GitHub | Auto-deploy no `git push`, gratuito |
| **Worker** | Node.js puro | `jarvis-worker.js` — setInterval 3min |
| **CLI** | Claude Code | `npm install -g @anthropic-ai/claude-code` |
| **Fontes** | Orbitron + Share Tech Mono | Google Fonts, via `layout.tsx` |

---

## Estrutura de Arquivos (Produção)

```
meu-jarvis/
  src/
    app/
      api/
        jarvis-chat/route.ts        ← POST; SSE streaming com Claude; processa tool_use
        jarvis-memory/route.ts      ← POST; executa remember_fact, search_memory, write_file, save_project
        agent-execute/route.ts      ← POST; recebe {agent, task, context, priority}; dict de 21 system prompts
        realtime-token/route.ts     ← POST; gera token efêmero para OpenAI Realtime
        oraculo/cycle/route.ts      ← POST (cron 6h via vercel.json); sincroniza oraculo_knowledge
      page.tsx                      ← Importa JarvisCockpit, server component
      layout.tsx                    ← Orbitron + Share Tech Mono via Google Fonts
      globals.css                   ← CSS reset + variáveis + animações pulse/float + scan lines
    components/cockpit/
      JarvisCockpit.tsx             ← Raiz; controla estados: 'locked'→'mic-prompt'→'booting'→'ready'
      StatusBar.tsx                 ← Barra top 40px; relógio em tempo real; indicadores VOZ/CLAUDE/AGENTES
      HexGrid.tsx                   ← Fundo SVG com hexágonos animados sutilmente
      CentralOrb.tsx                ← Orbe central; reage ao volume do microfone via Web Audio API analyser
      ChatPanel.tsx                 ← Coluna esquerda 320px; bolhas SSE; estado idle/thinking/streaming
      AgentSquadPanel.tsx           ← Coluna direita; grid de 21 agentes; status ATIVO/OCIOSO em tempo real
      DeliveriesPanel.tsx           ← Aba DOCS; ProjectCard (com ZIP jszip) + LooseFileCard; polling 5s
      PasswordGate.tsx              ← Tela preta fullscreen; senha padrão "1234"; shake em erro
      BootSequence.tsx              ← Typewriter de linhas de boot; barra de progresso; ~3s total
      MicPermissionOverlay.tsx      ← Solicita getUserMedia antes do boot
    hooks/
      useJarvisChat.ts              ← SSE; estados: idle/thinking/streaming/done/error; expõe messages[], sendMessage()
      useWakeWord.ts                ← SpeechRecognition contínuo; detecta "jarvis"; captura comando seguinte
      useAudioCapture.ts            ← getUserMedia → ScriptProcessor → PCM16 base64 em chunks de 100ms
      useAudioPlayback.ts           ← AudioContext; reproduz PCM16; barge-in (para quando usuário fala)
      useRealtimeSession.ts         ← Orquestra WebSocket OpenAI; session.update com create_response:false
      useAgentOrchestrator.ts       ← Gerencia agentStates[]; chama /api/agent-execute em paralelo
      useJarvisDeliveries.ts        ← Polling Supabase jarvis_files a cada 5s; auto-switch para aba DOCS
    lib/
      jarvisPrompt.ts               ← System prompt completo; personalidade britânica; chama de "Sir"; define tools
      jarvisMemory.ts               ← saveMessage(), searchMemory(), saveUserFact(), getRecentContext()
      supabase.ts                   ← createClient(); exporta supabase e isSupabaseEnabled
      realtimeClient.ts             ← WebSocket para wss://api.openai.com/v1/realtime; eventos tipados
      agentRouter.ts                ← parseDelegations(), parseExecutions(), stripProtocols()
    types/
      agents.ts                     ← AgentId (union type), AgentState, DelegateCommand
  jarvis-worker.js                  ← Node.js puro; @anthropic-ai/sdk direto; setInterval 3min; sem imports Next.js
  vercel.json                       ← maxDuration:60 para funções; cron 6h para /api/oraculo/cycle
  .env.local                        ← Nunca commitar; está no .gitignore
```

---

## Os 21 Agentes — AIOS CORE

### AIOS Core (6) — Intelecto Geral

| ID | Nome | Especialidade |
|---|---|---|
| `@analyst` | Analista Estratégico | Mercado, concorrência, ROI, decisões estratégicas baseadas em dados |
| `@developer` | Dev Full-Stack Sênior | TypeScript, Node.js, Python, React — código completo, comentado, nunca truncado |
| `@researcher` | Pesquisador Profundo | Pesquisa com fontes citadas, benchmarking, sínteses objetivas |
| `@writer` | Copywriter de Alto Impacto | Copy persuasivo, conteúdo digital, e-mails de conversão, posts virais |
| `@ux-design-expert` | Expert UX/UI | Wireframes, fluxos de usuário, acessibilidade, especificações visuais |
| `@manager` | Gerente de Projetos | OKRs, roadmaps, sprints, matrizes de prioridade, planos executáveis |

### Fábrica Rentável (15) — Negócios e Monetização

| ID | Área |
|---|---|
| `@ideias-nichos` | Descoberta de nichos e oportunidades de mercado |
| `@criador-conteudo` | Criação de conteúdo para redes sociais |
| `@produtor-cursos` | Estruturação e produção de cursos online |
| `@designer` | Design visual, identidade, materiais gráficos |
| `@empacotador` | Empacotamento de produtos digitais |
| `@cortes-virais` | Roteiros e cortes de vídeos virais |
| `@gestor-contas` | Gestão de contas em plataformas digitais |
| `@trafego-organico` | SEO, conteúdo orgânico, crescimento sem anúncios |
| `@vendas` | Estratégias de vendas e conversão |
| `@relacionamento` | CRM, relacionamento com clientes |
| `@auditor` | Auditoria de processos e conformidade |
| `@analista-metricas` | Análise de métricas e KPIs |
| `@automacao-tecnica` | Automações de processos técnicos |
| `@financeiro-pix` | Finanças, fluxo de caixa, PIX, DRE |
| `@melhoria-continua` | Kaizen, melhoria de processos, retrospectivas |

---

## Protocolo de Delegação

No texto do chat, o JARVIS emite e o `agentRouter` parseia:

```
[DELEGATE: {"agent":"@analyst","task":"Análise de mercado SaaS","priority":"high","context":"..."}]
[EXECUTE: {"command":"npm run build"}]
```

- `parseDelegations(text)` — extrai todos os blocos DELEGATE
- `parseExecutions(text)` — extrai todos os blocos EXECUTE
- `stripProtocols(text)` — remove os blocos para exibição limpa no chat

---

## Banco de Dados (Supabase)

```sql
-- Histórico de conversas
jarvis_memory (id uuid PK, role text, content text, session_id text, importance int, created_at timestamptz)

-- Fatos sobre o usuário (preferências, contexto pessoal)
user_facts (id uuid PK, fact text, category text, importance int, source text, created_at timestamptz)

-- Conhecimento acumulado por agente
agent_knowledge (id uuid PK, agent_id text, skill_name text, content text, quality int, created_at timestamptz)

-- Arquivos entregues pelo JARVIS (aparecem na aba DOCS)
jarvis_files (id uuid PK, path text, content text, project_name text, session_id text, created_at timestamptz)

-- Conhecimento do ORÁCULO (pesquisa autônoma periódica)
oraculo_knowledge (id uuid PK, topic text, content text, source text, quality int, created_at timestamptz)
```

Todas as tabelas têm Row Level Security com policy `allow_all` (acesso público via anon key).

---

## Ferramentas do JARVIS (Claude Tools)

Registradas em `jarvisPrompt.ts` (para Claude) e `useRealtimeSession.ts` (para OpenAI Realtime):

| Tool | Ação | Destino |
|---|---|---|
| `remember_fact` | Salva fato sobre o usuário | `user_facts` no Supabase |
| `search_memory` | Busca memórias relevantes | `jarvis_memory` + `user_facts` |
| `write_file` | Cria arquivo único | `jarvis_files` (aparece em DOCS) |
| `save_project` | Salva múltiplos arquivos agrupados | `jarvis_files` com `project_name` |

---

## Design System — Cockpit Iron Man

| Elemento | Valor |
|---|---|
| **Cor de fundo** | `#020609` (preto quase total) |
| **Azul principal** | `#00d4ff` (cyan brilhante) |
| **Verde de sucesso** | `#00ff88` |
| **Cyan** | `#00ffff` |
| **Roxo** | `#a78bfa` |
| **Layout** | 3 colunas: 320px esquerda \| flex centro \| 320px direita |
| **Status bar** | 40px no topo com relógio em tempo real |
| **Terminal** | 200px na base |
| **Efeitos** | Scan lines, vignette, HUD corners, hex grid, pulse/float animations |

---

## Variáveis de Ambiente

```env
ANTHROPIC_API_KEY=sk-ant-...               # Obrigatória — Claude API
OPENAI_API_KEY=sk-proj-...                 # Obrigatória — Voz Realtime
NEXT_PUBLIC_SUPABASE_URL=https://...       # Obrigatória
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...       # Obrigatória
NEXT_PUBLIC_WAKE_WORD=jarvis               # Padrão: jarvis (detectado pela Web Speech API)
NEXT_PUBLIC_JARVIS_VOICE=alloy             # Opções: alloy/echo/fable/onyx/nova
NEXT_PUBLIC_REALTIME_MODEL=gpt-4o-realtime-preview
GEMINI_API_KEY=...                         # Opcional
GROQ_API_KEY=...                           # Opcional
```

---

## Convenções Críticas de Código

- **TypeScript strict** — sem `any` implícito; tipar todos os estados e retornos de API
- **Wake word Chrome-only** — Web Speech API não funciona em Firefox/Edge; documentar isso no UI
- **`create_response: false`** — obrigatório no `session.update` do OpenAI Realtime; sem isso JARVIS responde a qualquer fala
- **SSE para chat** — nunca `await` a resposta completa; usar `ReadableStream` com `data: TOKEN\n\n`
- **Worker sem Next.js** — `jarvis-worker.js` usa `@anthropic-ai/sdk` diretamente; nunca importar `next/*`
- **Chaves de API** — `.env.local` sempre no `.gitignore`; nunca expor no frontend (prefixo `NEXT_PUBLIC_` só para Supabase e configurações não-secretas)
- **`project_name` em jarvis_files** — sem `project_name`: aparece como LooseFile; com `project_name`: agrupado em ProjectCard com botão ZIP

---

## Framework AIOS CORE (SynkraAI)

O AIOS CORE é um framework separado da SynkraAI para construir produtos digitais sem escrever código. Usado no Claude.ai (web) ou no IDE via Claude Code.

- **Repositório**: `https://github.com/SynkraAI/aios-core`
- **Versão**: v4.0
- **11 agentes**: `aiox-master`, `aiox-orchestrator`, `@analyst`, `@pm`, `@architect`, `@ux-expert`, `@sm`, `@dev`, `@qa`, `@po`, `@devops`
- **Duas fases**: Fase 1 — Planejamento (Web UI) → Fase 2 — Desenvolvimento (IDE)
- **Story Files**: arquivos estruturados que passam contexto completo entre agentes (elimina "telefone sem fio")
- **Planejamento Agêntico**: sequência estruturada onde cada agente especializado contribui antes do próximo

### Sequência AIOS CORE
```
@analyst (PRD) → @pm (roadmap) → @architect (tecnologia) → @ux-expert (UX/UI)
→ @sm (stories) → @dev (código) → @qa (testes) → @devops (deploy)
```

