# Análise Detalhada: Fluxos e Estrutura do Jarvis AIOS

> **STATUS**: Documento técnico completo — Jarvis AIOS v1.0
> **DATA**: 2026-03-10
> **STACK**: Next.js 15 + Claude claude-sonnet-4-6 + OpenAI Realtime + Supabase + Vercel

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Componentes Principais](#3-componentes-principais)
4. [Fluxos de Trabalho](#4-fluxos-de-trabalho)
5. [Camadas de Código](#5-camadas-de-código)
6. [Padrões de Desenvolvimento](#6-padrões-de-desenvolvimento)
7. [Banco de Dados](#7-banco-de-dados)
8. [Segurança](#8-segurança)
9. [Deployment](#9-deployment)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Visão Geral

### O que é JARVIS AIOS?

**JARVIS AIOS** — AI Operating System — é um assistente pessoal com inteligência artificial que orquestra **21 agentes autônomos especializados** para pesquisar, escrever, desenvolver, analisar e entregar resultados reais.

A interface é um **cockpit estilo Iron Man**, rodando no browser. O usuário conversa por texto ou voz, e JARVIS orquestra os agentes em paralelo para resolver tarefas complexas.

### Problema → Solução

| Aspecto | Detalhe |
|---|---|
| **Problema** | Executar múltiplas tarefas complexas de conhecimento requer alternar entre ferramentas diferentes, perder contexto, ficar preso em pesquisa/escrita/análise |
| **Solução** | Um único interface conversacional (chat + voz) que delega para 21 agentes especializados, com memória persistente e integração profunda com ferramentas reais |
| **Público-alvo** | Empreendedores digitais, criadores de conteúdo, profissionais autônomos, gerentes de projetos |
| **Diferencial** | Wake word ("JARVIS"), voz de 30s, 21 agentes em paralelo, memória entre conversas, delivery de arquivos em DOCS |

### Escopo — IN-SCOPE vs OUT-OF-SCOPE

**IN-SCOPE:**
- ✅ Chat com SSE streaming (texto + voz)
- ✅ 21 agentes Claude autônomos
- ✅ Memória persistente no Supabase
- ✅ Delegação de tarefas paralelas
- ✅ Web UI cockpit (React + Tailwind)
- ✅ Worker autônomo (background jobs)
- ✅ Download de arquivos (ZIP projects)

**OUT-OF-SCOPE:**
- ❌ Mobile app nativa (só web responsive)
- ❌ Modelos de IA customizados (usar Claude API)
- ❌ Data warehouse advanced (usar Supabase básico)
- ❌ Integração com Jira/Asana (só delivery de docs)

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama Arquitetural Completo

```
┌──────────────────────────────────────────────────────────────┐
│                     VOCÊ (USUÁRIO)                            │
│                (Text + Voice + Memória)                      │
└──────────────┬───────────────────────────────────────────────┘
               │
        ┌──────▼──────────┐
        │ JARVIS COCKPIT  │  ← Next.js 15 + React
        │ (Front-end)     │     TypeScript + Tailwind CSS
        └──────┬──────────┘
               │
       ┌───────┴────────────────────────┐
       │                                │
    [TEXTO]                         [VOZ]
       │                                │
   /api/jarvis-chat              OpenAI Realtime WebSocket
      (SSE)                      gpt-4o-realtime-preview
       │                         (PCM16 audio)
       ▼                                ▼
  Claude sonnet-4-6              Claude sonnet-4-6
  (Text completions)             (Speech streaming)
       │                                │
       └────────────┬────────────────────┘
                    │
        ┌───────────▼───────────┐
        │  /api/agent-execute   │
        │  (Orchestrator)       │
        │  Promise.all (21x)    │
        └───────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    [DELEGATE]          [Resultado]
         │                     │
    21 Agentes Claude         JSON
    (@analyst,              (metadata,
     @developer,           agent_states,
     @writer,              brief)
     ... +18)              
                    │
        ┌───────────▼──────────────┐
        │  Supabase (PostgreSQL)   │
        │  5 Tabelas + RLS         │
        ├──────────────────────────┤
        │ jarvis_memory            │
        │ user_facts               │
        │ agent_knowledge          │
        │ jarvis_files             │
        │ oraculo_knowledge        │
        └──────────────────────────┘
```

### 2.2 Data Flow — 6 Fluxos Principais

#### Fluxo 1: Wake Word (Voz)
```
Microfone
  ↓ getUserMedia()
  ├↓ Web Audio API → ScriptProcessor
  │  └↓ PCM16 + 100ms chunks
  │    └↓ OpenAI Realtime WebSocket
  │      └↓ gpt-4o-realtime-preview
  │        └↓ detecta instrução
  │          └↓ responde com voz (barge-in)
  │
  └→ SpeechRecognition API
     └↓ detecta "jarvis"
       └↓ captura próxima fala
         └↓ inicia conversa de 30s
```

#### Fluxo 2: Chat (Texto)
```
Input (usuário digita)
  ↓ ChatPanel.tsx
  ├↓ /api/jarvis-chat POST
  │ └↓ Claude claude-sonnet-4-6
  │   └↓ system: jarvisPrompt
  │     └↓ tools: [remember_fact, search_memory, write_file, save_project]
  │       └↓ SSE streaming (token a token)
  │         └↓ ChatPanel mostra tokens em tempo real
  │           └↓ "thinking" → "streaming" → "done"
```

#### Fluxo 3: Delegação de Agentes
```
JARVIS detecta [DELEGATE: {...}]
  ↓ agentRouter.parseDelegations()
  ├↓ /api/agent-execute POST
  │ ├→ Promise.all([agent1, agent2, ..., agent21])
  │ │   ├↓ @analyst + system prompt → Claude
  │ │   ├↓ @developer + system prompt → Claude
  │ │   ├↓ @writer + system prompt → Claude
  │ │   └↓ ... (todos em paralelo)
  │ │
  │ └↓ Aguarda tudo terminar
  │   └↓ Mensagens de agente aparecem agrupadas
  │     └↓ AgentSquadPanel marca cada um como ✅ ATIVO
```

#### Fluxo 4: Persistência (Memória)
```
JARVIS executa tool call
  ├↓ remember_fact {fact, category, importance}
  │ └↓ /api/jarvis-memory POST
  │   └↓ INSERT user_facts
  │
  ├↓ search_memory {query}
  │ └↓ /api/jarvis-memory POST
  │   └↓ SELECT * FROM jarvis_memory + user_facts
  │     └↓ retorna [{"role":"assistant","content":"..."}]
  │
  └↓ write_file {path, content}
    └↓ /api/jarvis-memory POST
      └↓ INSERT jarvis_files (sem project_name)
        └↓ aparece em DOCS como LooseFile
          └↓ usuário pode download individual ou ZIP projeto
```

#### Fluxo 5: Worker Autônomo
```
jarvis-worker.js → setInterval(3min)
  ├→ 6 agentes AIOS em Promise.all
  │  ├↓ @analyst + contexto da sessão
  │  ├↓ @developer + tarefas pendentes
  │  ├↓ @researcher + tópicos trending
  │  ├↓ @writer + brief semanal
  │  └↓ ... (6 especializados)
  │
  └→ Consolida resultados → brief.md
     └→ INSERT jarvis_files (project_name: "💡 BRIEF-Autônomo")
        └→ Aparece em aba DOCS como ProjectCard
           └→ Usuário vê "BRIEF de hoje" sempre atualizado
```

#### Fluxo 6: Boot Sequence
```
Browser carrega localhost:3000
  ├→ Estado: 'locked' (tela preta + PasswordGate)
  │  └← Padrão: "1234"
  │
  ├→ Estado: 'mic-prompt' (pede permissão de mic)
  │  └← getUserMedia() → Chrome pede acesso
  │
  ├→ Estado: 'booting' (BootSequence com typewriter)
  │  ├← Linhas de boot estilo Iron Man
  │  ├← Barra de progresso (~3s)
  │  └← Sons do S.H.I.E.L.D [opcional]
  │
  └→ Estado: 'ready' (JarvisCockpit completo)
     └← Chat ativo, agentes em grid, DOCS carregado
```

---

## 3. Componentes Principais

### 3.1 Estrutura de Arquivos (Produção)

```
meu-jarvis/
├── src/
│  ├── app/
│  │  ├── api/
│  │  │  ├── jarvis-chat/route.ts           ← SSE com Claude
│  │  │  ├── jarvis-memory/route.ts         ← CRUD memória
│  │  │  ├── agent-execute/route.ts         ← Executa 21 agentes
│  │  │  ├── realtime-token/route.ts        ← Token OpenAI ephemeral
│  │  │  └── oraculo/cycle/route.ts         ← ORÁCULO self-loop (6h)
│  │  ├── page.tsx                          ← Cockpit principal
│  │  ├── layout.tsx                        ← Fontes (Orbitron, Share Tech Mono)
│  │  └── globals.css                       ← Scan lines, vignette, animations
│  │
│  ├── components/cockpit/
│  │  ├── JarvisCockpit.tsx                 ← Estado raiz (locked/mic-prompt/booting/ready)
│  │  ├── StatusBar.tsx                     ← Relógio em tempo real (40px)
│  │  ├── HexGrid.tsx                       ← Fundo animado (SVG hexágonos)
│  │  ├── CentralOrb.tsx                    ← Orbe que reage ao áudio
│  │  ├── ChatPanel.tsx                     ← Chat SSE (esquerda 320px)
│  │  ├── AgentSquadPanel.tsx               ← Grid 21 agentes (direita 320px)
│  │  ├── DeliveriesPanel.tsx               ← Aba DOCS com ProjectCard + LooseFile
│  │  ├── PasswordGate.tsx                  ← Tela senha Iron Man
│  │  ├── BootSequence.tsx                  ← Typewriter + barra (~3s)
│  │  └── MicPermissionOverlay.tsx          ← Pedido getUserMedia
│  │
│  ├── hooks/
│  │  ├── useJarvisChat.ts                  ← SSE chat (states: idle/thinking/streaming/done/error)
│  │  ├── useWakeWord.ts                    ← SpeechRecognition + detecta "jarvis"
│  │  ├── useAudioCapture.ts                ← Mic → PCM16 chunks (100ms)
│  │  ├── useAudioPlayback.ts               ← PCM16 → AudioContext (barge-in)
│  │  ├── useRealtimeSession.ts             ← Orquestra OpenAI Realtime WebSocket
│  │  ├── useAgentOrchestrator.ts           ← Parseia DELEGATE, executa agentes paralelo
│  │  └── useJarvisDeliveries.ts            ← Polling Supabase jarvis_files (5s)
│  │
│  ├── lib/
│  │  ├── jarvisPrompt.ts                   ← System prompt (personalidade britânica "Sir")
│  │  ├── jarvisMemory.ts                   ← saveMessage, searchMemory, saveUserFact
│  │  ├── supabase.ts                       ← createClient() + exports
│  │  ├── realtimeClient.ts                 ← WebSocket OpenAI + event handlers
│  │  └── agentRouter.ts                    ← parseDelegations, parseExecutions, stripProtocols
│  │
│  └── types/
│     └── agents.ts                         ← AgentId union, AgentState, DelegateCommand
│
├── jarvis-worker.js                        ← Node.js puro; @anthropic-ai/sdk direto
├── vercel.json                             ← maxDuration 60s; cron 6h /api/oraculo/cycle
├── .env.local                              ← NEVER COMMIT (no .gitignore)
└── package.json
```

### 3.2 Responsabilidades dos Componentes

| Componente | Responsabilidade | Stack |
|---|---|---|
| **JarvisCockpit** | Estado raiz, transições de estado | React hooks + Context |
| **ChatPanel** | Streaming SSE, bolhas de mensagens | `useJarvisChat` |
| **AgentSquadPanel** | Grid 21 agentes + status em tempo real | `useAgentOrchestrator` |
| **DeliveriesPanel** | Listagem de arquivos entregues, ZIP download | jszip + Supabase |
| **jarvis-chat/route.ts** | Streaming Claude, processa tool_use | `@anthropic-ai/sdk` |
| **agent-execute/route.ts** | Executa agentes em paralelo (Promise.all) | Dicionário de 21 system prompts |
| **useRealtimeSession** | Mantém WebSocket OpenAI ativo | `openai-js-client` |
| **supabase.ts** | Cliente PostgreSQL autenticado | `@supabase/supabase-js` |

---

## 4. Fluxos de Trabalho Detalhados

### 4.1 Início de uma Conversa (Chat)

```
1. Usuário digita: "Analise o mercado de SaaS brasileiro"
   ├↓ ChatPanel captura input
   ├↓ Envia para /api/jarvis-chat POST
   │  ├─ body: { messages: [...], system: jarvisPrompt, tools: [...] }
   │  └─ headers: { "Prefer": "text/event-stream" }
   │
   ├↓ Claude processa
   │  ├─ Lê system prompt (personalidade "Sir", 21 agentes disponíveis)
   │  ├─ Analisa entrada → reconhece delegação necessária
   │  ├─ Emite streaming:
   │  │  "Vou analisar o mercado SaaS para você, Sir.\n"
   │  │  "\n"
   │  │  "[DELEGATE: {"agent":"@analyst","task":"Análise completa do mercado SaaS...
   │  │  "status":"entregando resultados"
   │  │
   │
   ├↓ ChatPanel recebe tokens SSE (data: TOKEN\n\n)
   │  └─ Exibe em bolha "thinking → streaming → done"
   │
   ├↓ Route.ts detecta [DELEGATE: {...}]
   │  └─ Chama /api/agent-execute com parsed delegation
   │
   └→ Resultado final + agentes marcados "ATIVO" na grid
```

### 4.2 Chamada Paralela de Múltiplos Agentes

```
/api/agent-execute recebe:
{
  "agent": "@analyst",
  "task": "Análise de mercado...",
  "priority": "high",
  "context": "contexto anterior..."
}

Múltiplas chamadas simultâneas (Promise.all):

Promise.all([
  claudeCall({ system: analystPrompt, ... }),
  claudeCall({ system: developerPrompt, ... }),
  claudeCall({ system: writerPrompt, ... }),
  ... (18 mais)
])
  ├↓ Aguarda TODAS terminarem (race condition = não há)
  ├→ Consolida resultados
  └→ Retorna ao chat com:
     {
       "results": [
         { "agent": "@analyst", "output": "..." },
         { "agent": "@developer", "output": "..." },
         ...
       ],
       "elapsed_ms": 8340,
       "agent_states": { "@analyst": "ATIVO", ... }
     }
```

### 4.3 Tool Call: Remember Fact

```
Chat: "JARVIS, lembre que meu email é contato@empresa.com"

Claude emite:
{
  "type": "tool_use",
  "id": "toolu_01...",
  "name": "remember_fact",
  "input": {
    "fact": "O usuário tem email contato@empresa.com",
    "category": "contact_info",
    "importance": 9
  }
}

Route.ts processa:
  ├↓ POST /api/jarvis-memory
  │  ├─ INSERT user_facts (PostgreSQL Supabase)
  │  ├─ Retorna: { "status": "saved", "fact_id": "..." }
  │  │
  │  └→ Claude recebe resposta do tool
  │     └→ Emite: "Anotei! Seu email está salvo no meu banco de memória."
```

### 4.4 Work Flow: Save Project

```
Claude: "Vou organizar sua documentação de projeto..."
[EXECUTE: { "command": "save_project", "files": [...] }]

Tool call:
{
  "type": "tool_use",
  "name": "save_project",
  "input": {
    "project_name": "Documentação SEO Q1/2026",
    "files": [
      {
        "path": "docs/seo-strategy.md",
        "content": "[conteúdo...]"
      },
      {
        "path": "docs/keywords.csv",
        "content": "[conteúdo...]"
      },
      ...
    ]
  }
}

Route.ts processa:
  ├→ INSERT jarvis_files (project_name SET)
  ├→ Polling em useJarvisDeliveries (5s) detecta novo project
  ├→ DeliveriesPanel muda para aba DOCS
  │  └→ Novo ProjectCard ("Documentação SEO Q1/2026")
  │     ├─ Exibe: 3 arquivos encontrados
  │     ├─ Botão: "Download ZIP"
  │     └─ Clica → jszip cria arquivo
  │        └→ Salva localmente: "Documentação-SEO-Q1-2026.zip"
```

---

## 5. Camadas de Código

### 5.1 Estrutura TypeScript Aplicada

```
src/
├── app/
│  └── api/
│     └── jarvis-chat/
│        └── route.ts            ← Controller: POST request HTTP → resposta SSE
│
├── lib/
│  ├── jarvisPrompt.ts           ← Domain: System prompt com regras de negócio
│  ├── jarvisMemory.ts           ← Domain: Lógica de memória
│  └── supabase.ts               ← Persistence: Acesso ao DB
│
├── types/
│  └── agents.ts                 ← Domain: Tipos TypeScript (AgentId, AgentState)
│
└── hooks/
   ├── useJarvisChat.ts          ← Application: Pega chat state e expõe API
   └── [...]
```

**Padrão CLEAN ARCHITECTURE:**
1. **Routes** (API) — recebe HTTP, valida, chama services
2. **Services** (App Logic) — orquestra, toma decisões, chama repositórios
3. **Repositories** (Persistence) — acessa BD
4. **Types** (Domain) — entidades, enums, tipos puros

### 5.2 Padrão TypeScript Strict (SEM any implícito)

```typescript
// ✅ BOM
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function sendMessage(msg: ChatMessage): Promise<ChatMessage> {
  return fetch('/api/jarvis-chat', {
    method: 'POST',
    body: JSON.stringify(msg)
  }).then(r => r.json() as Promise<ChatMessage>);
}

// ❌ EVITAR
function sendMessage(msg: any): any {
  // ...
}
```

### 5.3 Estado com React Hooks

```typescript
// useJarvisChat.ts
export function useJarvisChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'streaming' | 'done' | 'error'>('idle');

  const sendMessage = async (input: string) => {
    setStatus('thinking');
    const reader = /* resposta SSE */;
    // stream tokens → setMessages update
    setStatus('done');
  };

  return { messages, status, sendMessage };
}

// JarvisCockpit.tsx
export function JarvisCockpit() {
  const { messages, status, sendMessage } = useJarvisChat();
  return (
    <ChatPanel 
      messages={messages} 
      status={status}
      onSendMessage={sendMessage}
    />
  );
}
```

---

## 6. Padrões de Desenvolvimento

### 6.1 Convenções do Projeto

| Item | Padrão | Exemplo |
|---|---|---|
| **Variáveis** | camelCase | `currentUser`, `isLoading` |
| **Tipos/Classes** | PascalCase | `ChatMessage`, `AgentState` |
| **Constantes** | UPPER_SNAKE_CASE | `MAX_AGENTS`, `API_TIMEOUT_MS` |
| **Métodos** | verboCamelCase | `sendMessage()`, `saveMemory()` |
| **Arquivos** | PascalCase (components), camelCase (libs/hooks) | `ChatPanel.tsx`, `useJarvisChat.ts` |
| **Commits** | feat/Refs: TASK-XXX | `feat: adiciona @developer agent Refs: TASK-001` |
| **Branches** | feature/jarvis-TASK-XXX | `feature/jarvis-TASK-002` |

### 6.2 Padrões Críticos — NÃO QUEBRAR

#### 1. SSE Streaming (nunca await completo)
```typescript
// ✅ BOM
const response = await fetch('/api/jarvis-chat', { ... });
for await (const chunk of response.body) {
  const text = new TextDecoder().decode(chunk);
  setMessages(prev => [...prev, { role: 'assistant', content: text }]);
}

// ❌ ERRADO
const text = await response.text(); // Bloqueia até fim!
```

#### 2. Wake Word Chrome-Only
```typescript
// ⚠️ AVISO: SpeechRecognition é Chrome-only
if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
  return <ErrorMessage>Wake word requer Chrome/Edge com suporte a SpeechRecognition</ErrorMessage>;
}
```

#### 3. `create_response: false` no OpenAI Realtime
```typescript
// ✅ OBRIGATÓRIO
session.update({
  type: 'session.update',
  session: {
    input_audio_transcription: { enabled: true },
    turn_detection: { type: 'server_vad' }
  },
  // create_response: false ← CRÍTICO: JARVIS só responde após wake word
});

// SEM create_response: false, JARVIS responde qualquer som!
```

#### 4. Delegação Strict
```typescript
// ✅ Sempre usar [DELEGATE: {...}] no texto
"Vou usar o @analyst para isso.\n[DELEGATE: {\"agent\":\"@analyst\",\"task\":\"...\"}]"

// ❌ EVITAR: tentar chamar agente diretamente
"@analyst please analyze..." // Isso é só texto, não executa
```

### 6.3 SOLID Aplicado

| Princípio | Aplicação Jarvis |
|---|---|
| **S**ingle Responsibility | `jarvisPrompt.ts` só define prompt; `useJarvisChat.ts` só maneja estado chat |
| **O**pen/Closed | Novos agentes = adicionar ao dicionário em `agent-execute`, sem mexer em routes |
| **L**iskov | `AgentState` abstracto; `AnalystAgent`, `DeveloperAgent` são subtypes |
| **I**nterface Segregation | `IChatMessage`, `IAgentResult`, `IMemory` separadas |
| **D**ependency Inversion | `useJarvisChat` recebe `supabase` como prop, não hardcoded |

---

## 7. Banco de Dados

### 7.1 Schema Supabase (PostgreSQL)

```sql
-- 1. Histórico de conversas
CREATE TABLE jarvis_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  session_id TEXT,
  importance INT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_session_id ON jarvis_memory(session_id),
  INDEX idx_importance ON jarvis_memory(importance DESC)
);

-- 2. Fatos sobre o usuário
CREATE TABLE user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact TEXT NOT NULL,
  category TEXT, -- contact_info, preferences, business, etc
  importance INT DEFAULT 7,
  source TEXT, -- 'user_input', 'tool_call', 'inferred'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_category ON user_facts(category)
);

-- 3. Conhecimento por agente
CREATE TABLE agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL, -- @analyst, @developer, etc
  skill_name TEXT NOT NULL,
  content TEXT NOT NULL,
  quality INT DEFAULT 5, -- 1=draft, 5=production, 10=expert
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (agent_id, skill_name),
  INDEX idx_agent ON agent_knowledge(agent_id)
);

-- 4. Arquivos entregues
CREATE TABLE jarvis_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  project_name TEXT, -- NULL = LooseFile, SET = ProjectCard
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_project ON jarvis_files(project_name),
  INDEX idx_session ON jarvis_files(session_id)
);

-- 5. Conhecimento do ORÁCULO
CREATE TABLE oraculo_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT, -- URL, pessoa, API
  quality INT DEFAULT 3, -- 1=hypothesis, 5=confirmed, 10=primary_source
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_topic ON oraculo_knowledge(topic)
);

-- Row Level Security (tudo público para anon key)
ALTER TABLE jarvis_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE oraculo_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON jarvis_memory FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON jarvis_memory FOR INSERT WITH CHECK (true);
-- [similar para outras tabelas...]
```

### 7.2 Migrations (Flyway / Liquibase style)

```
supabase/migrations/
├── 20260310_001__create_jarvis_memory_table.sql
├── 20260310_002__create_user_facts_table.sql
├── 20260310_003__add_rls_policies.sql
└── 20260310_004__index_optimization.sql
```

---

## 8. Segurança

### 8.1 Autenticação e Autorização

**Supabase Auth (via anon key):**
- Row Level Security (RLS) garante isolamento
- Anon key público (só lê/escreve próprio contexto)
- Session token gerenciado pelo browser

**JARVIS não tem login:**
- Padrão: acesso anônimo ao Supabase
- Senha local: "1234" (PasswordGate) protege no device
- Memória persiste por session_id (não cross-user)

### 8.2 Segredos de API — NUNCA no Frontend

```env
# ✅ SEGURO (backend only)
ANTHROPIC_API_KEY=sk-ant-xxx          # Server route (/api/jarvis-chat)
OPENAI_API_KEY=sk-proj-xxx            # Server route (/api/realtime-token)

# ✅ SEGURO (público)
NEXT_PUBLIC_SUPABASE_URL=https://...  # Frontend (anon key apenas)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ❌ NUNCA
# const anthropicKey = process.env.NEXT_PUBLIC_... ← ERRADO!
```

### 8.3 CORS e HTTPS

```typescript
// vercel.json
{
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    }
  ]
}
```

---

## 9. Deployment

### 9.1 Infraestrutura (Vercel + GitHub)

```
Local Development:
$ npm run dev              # localhost:3000

GitHub Push:
$ git push origin main

Vercel Auto-Deploy:
- Webhook triggered
- Build: npm run build
- Deploy: ~30s
- URL: https://meu-jarvis.vercel.app

Env Vars (Vercel Dashboard):
- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 9.2 vercel.json

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "crons": [
    {
      "path": "/api/oraculo/cycle",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 9.3 Startup Scripts (Local)

```bash
# startup_jarvis.sh (Linux/Mac)
#!/bin/bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-proj-...
export NEXT_PUBLIC_SUPABASE_URL=...
npm run dev

# startup_jarvis.ps1 (Windows PowerShell)
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:OPENAI_API_KEY = "sk-proj-..."
npm run dev
```

---

## 10. Troubleshooting

### Problema: Wake word não funciona

**Causa:** não é Chrome, ou usuário rejeitou permissão de mic

**Solução:**
```typescript
if (!('webkitSpeechRecognition' in window)) {
  console.warn('Wake word requer Chrome/Edge');
}

// Forçar permissão:
await navigator.mediaDevices.getUserMedia({ audio: true });
```

### Problema: Chat não mostra mensagens

**Causa:** SSE não está sendo parseado corretamente

**Solução:**
```typescript
for await (const chunk of response.body) {
  const text = new TextDecoder().decode(chunk);
  // Linha vem com "data: TOKEN\n\n"
  const lines = text.split('\n').filter(line => line.startsWith('data:'));
  lines.forEach(line => {
    const token = line.replace('data: ', '');
    setMessages(prev => [...prev, { content: token }]);
  });
}
```

### Problema: Agentes não aparecem na grid

**Causa:** `useAgentOrchestrator` não está propagando estado

**Solução:** verificar `Promise.all` terminou
```typescript
const results = await Promise.all(agentCalls);
// setState completado
setAgentStates(prev => ({...prev, '@analyst': 'ATIVO'}));
```

### Problema: Memória vazia no Supabase

**Causa:** `remember_fact` não foi chamado pelo Claude

**Solução:** verificar `jarvisPrompt.ts` tem `remember_fact` em tools
```typescript
// jarvisPrompt.ts
const tools = [
  { name: 'remember_fact', description: '...' }, // ✅ Incluir
  // ...
];
```

---

## Referências Rápidas

| Documento | Uso |
|---|---|
| `domain-knowledge.instructions.md` | Carregado em todos os copilot contexts |
| `copilot-instructions.md` | Instruções Copilot GitHub |
| `task-workflow-migracao.instructions.md` | Workflow de tasks Jarvis |

---

**Última atualização:** 2026-03-10  
**Versão:** 1.0 (Production-ready)  
**Autores:** Jarvis AIOS Team
