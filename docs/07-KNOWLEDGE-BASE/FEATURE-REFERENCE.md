# MAYA — Feature Reference

> Documentação de referência de todas as funcionalidades do sistema MAYA AIOS.  
> Última atualização: 20/03/2026

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Cockpit — Interface Principal](#2-cockpit--interface-principal)
3. [Sistema de Chat](#3-sistema-de-chat)
4. [Sistema de Voz](#4-sistema-de-voz)
5. [Speaker ID — Verificação por Voz](#5-speaker-id--verificação-por-voz)
6. [Modos de Voz Independentes](#6-modos-de-voz-independentes)
7. [Sistema de Memória](#7-sistema-de-memória)
8. [Base de Conhecimento](#8-base-de-conhecimento)
9. [Os 21 Agentes](#9-os-21-agentes)
10. [Widget Embeddable](#10-widget-embeddable)
11. [API de Embed Externa](#11-api-de-embed-externa)
12. [Deploy com Docker](#12-deploy-com-docker)
13. [Ferramentas de Debug](#13-ferramentas-de-debug)

---

## 1. Visão Geral da Arquitetura

```
Usuário (Texto ou Voz)
       │
       ├── [CHAT] → ChatPanel → /api/maya-chat (SSE) → Claude claude-sonnet-4-6
       │                                                       │
       │                                              [DELEGATE: {...}]
       │                                                       │
       │                                         21 agentes via /api/agent-execute
       │
       ├── [VOZ] → Wake Word → OpenAI Realtime WebSocket → PCM16 → resposta de voz
       │
       ├── [SPEAKER ID] → vosk_speaker.py → PostgreSQL/Supabase → allow/deny
       │
       └── [WIDGET] → iframe /embed → MayaWidget → mesma stack de chat+voz
```

### Banco de dados (DB_ADAPTER)

| Tabela | Uso |
|---|---|
| `jarvis_memory` | Histórico de conversas |
| `user_facts` | Fatos do usuário + perfis de voz (`category='voice_profile'`) |
| `agent_knowledge` | Base de conhecimento por agente (uploads + resultados de agentes) |
| `jarvis_files` | Arquivos entregues — aparecem na aba DOCS |
| `oraculo_knowledge` | Pesquisa autônoma periódica do ORÁCULO |

---

## 2. Cockpit — Interface Principal

Acessível em `/` (rota raiz). Estado gerenciado pelo `JarvisCockpit.tsx`.

### Fluxo de Boot

```
'locked' → PasswordGate ("1234")
         → 'mic-prompt' → MicPermissionOverlay (getUserMedia)
         → 'booting'    → BootSequence (~3s, linhas de typewriter)
         → 'ready'      → Cockpit completo
```

Quando `maya_no_mic_mode=true`, os passos de `mic-prompt` e init do microfone são pulados.

### Layout

```
┌─────────────────────────────────────────────────┐
│  StatusBar (40px) — relógio, indicadores VOZ/IA  │
├──────────┬──────────────────┬───────────────────┤
│ ChatPanel│   CentralOrb     │ AgentSquadPanel /  │
│  (320px) │   (flex center)  │ DeliveriesPanel    │
│          │   HexGrid fundo  │    (320px)         │
├──────────┴──────────────────┴───────────────────┤
│  SpeechCaption (transcrição em tempo real)       │
└─────────────────────────────────────────────────┘
```

### Componentes Principais

| Componente | Responsabilidade |
|---|---|
| `MayaCockpit.tsx` | Raiz; controla estado global de boot e flags de voz |
| `StatusBar.tsx` | Barra superior; relógio em tempo real; indicadores de status |
| `HexGrid.tsx` | Fundo SVG com hexágonos animados |
| `CentralOrb.tsx` | Orbe central; reage ao volume do microfone via Web Audio API |
| `ChatPanel.tsx` | Coluna esquerda; bolhas SSE; estados de status |
| `AgentSquadPanel.tsx` | Coluna direita; grid 21 agentes; ATIVO/OCIOSO em tempo real |
| `DeliveriesPanel.tsx` | Aba DOCS; ProjectCard (ZIP via jszip) + LooseFileCard |
| `SettingsPanel.tsx` | Painel de configurações; 4 seções incluindo Speaker ID |
| `BootSequence.tsx` | Typewriter de linhas de boot; barra de progresso |
| `MicPermissionOverlay.tsx` | Solicita `getUserMedia` antes do boot |
| `SpeechCaption.tsx` | Transcrição ao vivo da fala do usuário |
| `VoiceEnrollModal.tsx` | Modal de enrollment de voz no cockpit |

---

## 3. Sistema de Chat

### Fluxo SSE

```
useJarvisChat → POST /api/maya-chat
              ← ReadableStream (text/event-stream)
              ← tokens em tempo real
              → ChatPanel exibe token a token
```

### Estados do Chat

| Estado | Descrição |
|---|---|
| `idle` | Aguardando input |
| `thinking` | Requisição enviada, aguardando primeiro token |
| `streaming` | Recebendo tokens via SSE |
| `done` | Resposta completa |
| `error` | Falha na requisição |

### Contexto e Memória

Antes de cada resposta, `/api/maya-chat` busca:
1. Últimas 10 mensagens do `jarvis_memory` (histórico)
2. Top 5 fatos relevantes do `user_facts` (preferências)
3. Resultados de `searchMemory()` baseado no input do usuário

### Tools Disponíveis para o Claude

| Tool | Ação | Tabela destino |
|---|---|---|
| `remember_fact` | Salva fato sobre o usuário | `user_facts` |
| `search_memory` | Busca memórias relevantes | `jarvis_memory` + `user_facts` |
| `write_file` | Cria arquivo único | `jarvis_files` |
| `save_project` | Salva múltiplos arquivos | `jarvis_files` com `project_name` |

---

## 4. Sistema de Voz

### Wake Word

- **Tecnologia**: Web Speech API nativa do browser (Chrome only)
- **Detecção**: reconhecimento contínuo em background
- **Palavra padrão**: configurável via `NEXT_PUBLIC_WAKE_WORD` (padrão: `maya`)
- **Fluxo**: wake word detectada → janela de 30s → OpenAI Realtime WebSocket
- **Pausa durante enrollment**: SpeechRecognition para automaticamente quando o modal de enrollment está aberto para evitar conflito de microfone

### OpenAI Realtime (WebSocket)

- **Modelo**: `gpt-4o-realtime-preview` (configurável via `NEXT_PUBLIC_REALTIME_MODEL`)
- **Protocolo**: PCM16 em chunks de 100ms via `useAudioCapture.ts`
- **Barge-in**: Maya para de falar quando o usuário começa a falar
- **`create_response: false`**: obrigatório — sem isso Maya responde a qualquer fala aleatória

### TTS (Text-to-Speech)

- **Provider padrão**: Microsoft Edge TTS via `msedge-tts`
- **Voz configurável**: `NEXT_PUBLIC_JARVIS_VOICE` (padrão: `alloy`)
- **Fallback**: Web Speech API nativa do browser
- **Rota**: `POST /api/maya-tts { text, voice? }`
- **Desabilitar**: `maya_text_only_mode=true` (ver seção 6)

---

## 5. Speaker ID — Verificação por Voz

Sistema completo de reconhecimento de locutor baseado em embeddings de voz.

### Tecnologia

- **Biblioteca**: [Vosk](https://alphacephei.com/vosk/) (open source, offline)
- **Modelo SpkModel**: `models/vosk-model-spk-0.4` (~13 MB, incluso no repositório)
- **Modelo ASR**: auto-download na primeira execução (~30 MB, cache em `~/.vosk/`)
- **Embedding**: vetor 128-dimensional por sample de áudio
- **Script**: `src/scripts/vosk_speaker.py` (chamado via `child_process.execFile`)

### Enrollment (Cadastro de Voz)

1. Usuário abre modal e informa seu nome
2. Grava **35 segundos** de áudio falando livremente
3. O sistema extrai automaticamente **6 segmentos** de 5s (auto-segmentação por energia RMS)
4. 6 embeddings independentes são salvos na tabela `user_facts` com `category='voice_profile'`
5. Em verificações futuras, o score é a **média dos 3 melhores** de MAX(6 amostras × base) comparações

### Verificação (Session-Trust Model)

O sistema usa dois thresholds para reduzir falsos negativos em conversas longas:

| Parâmetro | Valor | Descrição |
|---|---|---|
| `INITIAL_THRESHOLD` | `0.70` | Score mínimo para a PRIMEIRA verificação da sessão |
| `SESSION_THRESHOLD` | `0.45` | Score mínimo para verificações subsequentes (mesma sessão) |
| `SESSION_EXPIRE_MS` | `8 minutos` | Tempo de inatividade para expirar a sessão confiável |

- Sessão é "tocada" (`_touchSession()`) a cada verificação bem-sucedida
- Sessão pode ser manualmente bloqueada via evento `maya:lock-session` (botão no SettingsPanel)
- Em modo sem perfis cadastrados: comportamento aberto (`reason: 'no_enrollment'`) — sem bloqueio

### API Routes

| Rota | Método | Descrição |
|---|---|---|
| `/api/speaker-enroll` | `POST` | Cadastra perfil de voz (`name`, `audioB64`) |
| `/api/speaker-enroll` | `GET` | Lista perfis cadastrados |
| `/api/speaker-enroll` | `DELETE` | Remove perfil por nome |
| `/api/speaker-verify` | `POST` | Verifica audio contra perfis (`audioB64`, `threshold?`) |

---

## 6. Modos de Voz Independentes

Dois flags independentes controlam o comportamento de voz, configuráveis via `SettingsPanel`:

### `maya_text_only_mode` — Desabilitar TTS

```
localStorage.setItem('maya_text_only_mode', 'true')
```

**Efeito:**
- Maya **não fala** — lê e ouve normalmente, mas sem síntese de voz
- `speakText()` e `playWelcomeTTS()` retornam imediatamente em `useMayaChat.ts`
- Botão ⏸ parar TTS oculto no ChatPanel
- Badge 'falando' oculto no ChatPanel
- Evento de sincronização: `maya:text-only-changed`

**Caso de uso**: ambientes de escritório onde TTS seria intrusivo

### `maya_no_mic_mode` — Desabilitar Microfone

```
localStorage.setItem('maya_no_mic_mode', 'true')
```

**Efeito:**
- `getUserMedia` nunca é chamado — zero permissões solicitadas
- `maya:init-mic` não é disparado no BootSequence
- `CentralOrb` é ocultado (não há volumetria sem microfone)
- `SpeechCaption` é ocultado
- Sub-configurações de voz no SettingsPanel ficam "dimmed"
- Botão de Enroll desabilitado
- Evento de sincronização: `maya:no-mic-changed`

**Caso de uso**: uso puramente textual em máquinas sem microfone; desktops shared

### Combinações

| `no_mic` | `text_only` | Resultado |
|---|---|---|
| false | false | Voz completa (wake word + TTS) |
| false | true | Maya ouve mas não fala |
| true | false | Texto + TTS (no wake word, sem orb) |
| true | true | Puramente texto + texto |

---

## 7. Sistema de Memória

### Armazenamento

Gerenciado por `src/lib/jarvisMemory.ts` e `POST /api/maya-memory`.

| Operation | Tool | Tabela |
|---|---|---|
| Salvar mensagem | interno | `jarvis_memory` |
| Salvar fato | `remember_fact` | `user_facts` |
| Buscar memória | `search_memory` | `jarvis_memory` + `user_facts` |
| Contexto recente | `getRecentContext()` | `jarvis_memory` |

### DB_ADAPTER

Todas as operações de banco passam pelo adapter em `src/lib/db/index.ts`:

| `DB_ADAPTER` | Adapter | Quando usar |
|---|---|---|
| `supabase` (padrão) | `src/lib/db/adapters/supabaseAdapter.ts` | Desenvolvimento + cloud Supabase |
| `postgres` | `src/lib/db/adapters/postgresAdapter.ts` | Docker/PontoCore + PostgreSQL local |

A variável `DATABASE_URL` é obrigatória quando `DB_ADAPTER=postgres`.

---

## 8. Base de Conhecimento

Upload de arquivos para enriquecer o contexto dos agentes.

### Formatos Suportados

- TXT, MD, PDF, DOCX (máximo 10 MB por arquivo)

### Chunking

- Tamanho do chunk: 600 caracteres
- Overlap entre chunks: 80 caracteres
- Armazenamento: tabela `agent_knowledge` com `agent_id='knowledge'`
- Metadado do arquivo: `skill_name='META::{fileId}'`
- Chunks: `skill_name='{fileId}::{i}'`

### API

```
GET  /api/knowledge          → lista de arquivos carregados
POST /api/knowledge          → upload (multipart/form-data ou JSON base64)
DELETE /api/knowledge?id=... → remove arquivo e todos seus chunks
```

### Interface

Disponível na aba **Conhecimento** do SettingsModal (widget) e SettingsPanel (cockpit):
- Drag-and-drop zone
- Listagem com chunk count
- Botão de remoção por arquivo

---

## 9. Os 21 Agentes

### AIOS Core (6) — Inteligência Geral

| ID | Nome | Especialidade |
|---|---|---|
| `@analyst` | Analista Estratégico | Mercado, ROI, decisões estratégicas |
| `@developer` | Dev Full-Stack Sênior | TypeScript, Node.js, Python, React |
| `@researcher` | Pesquisador Profundo | Pesquisa com fontes, benchmarking |
| `@writer` | Copywriter de Alto Impacto | Copy, conteúdo digital, roteiros |
| `@ux-design-expert` | Expert UX/UI | Wireframes, fluxos, especificações |
| `@manager` | Gerente de Projetos | OKRs, roadmaps, sprints |

### Fábrica Rentável (15) — Negócios e Monetização

`@ideias-nichos` · `@criador-conteudo` · `@produtor-cursos` · `@designer` · `@empacotador` · `@cortes-virais` · `@gestor-contas` · `@trafego-organico` · `@vendas` · `@relacionamento` · `@auditor` · `@analista-metricas` · `@automacao-tecnica` · `@financeiro-pix` · `@melhoria-continua`

### Protocolo de Delegação

Quando Maya detecta uma necessidade de especialização, emite no texto do chat:

```
[DELEGATE: {"agent":"@analyst","task":"Análise de mercado SaaS","priority":"high","context":"..."}]
```

O `useAgentOrchestrator.ts` parseia todos os blocos `[DELEGATE]`, chama `/api/agent-execute` em `Promise.all` paralelo, e atualiza o `AgentSquadPanel` com o status `ATIVO` de cada agente.

---

## 10. Widget Embeddable

Versão mini/compacta de Maya para embed em qualquer site.

### Estados do Widget

```
Minimizado (orbe 80px) → Sidebar (380px, slide-in) → Maximizado (fullscreen overlay)
```

### Orbe

- Flutuante no canto inferior direito (configurável)
- Draggable (arrasto mínimo de 4px distinguido de clique)
- Viewport clamp — nunca sai da tela
- Reage ao volume do microfone (Web Audio Analyser)
- Animação de pulso quando processando
- Sistema de orbs extensível: `src/components/widget/orbs/` com `OrbType` enum

### Sidebar (380px)

- Chat completo com streaming SSE
- Botão ⚙ abre SettingsModal
- Botão ⊞ expande para maximizado
- Botão × retorna ao orbe
- 100% inline styles (isolamento CSS completo — sem vazamento para o host)

### Maximizado (overlay)

- 3 colunas: Agentes | Chat | Docs
- ESC ou clique fora retorna para sidebar

### SettingsModal — 4 abas

| Aba | Conteúdo |
|---|---|
| **Geral** | Posição esq/dir, TTS voz, toggle áudio background, limpar memória |
| **Agentes** | 21 toggles individuais + toggle global |
| **Conhecimento** | Upload drag-drop TXT/MD/PDF/DOCX |
| **Vozes** | CRUD de perfis de Speaker ID + toggle verificação + threshold |

### Componentes do Widget

| Arquivo | Responsabilidade |
|---|---|
| `MayaWidget.tsx` | Raiz pública; compõe Orb + Sidebar + Modais |
| `MayaOrb.tsx` | Orbe draggable com viewport clamp |
| `MayaSidebar.tsx` | Painel 380px com chat e botões de navegação |
| `WidgetChatPanel.tsx` | Painel de chat adaptado para o widget |
| `WidgetSettingsModal.tsx` | Modal de configurações com 4 abas |
| `WidgetEnrollModal.tsx` | Modal de enrollment de voz nativo do widget |
| `orbs/DefaultOrb.tsx` | Canvas 2D — esfera 3D + anéis orbitais + atmosphere glow |
| `orbs/OrbRenderer.tsx` | Dispatcher por `OrbType` (extensível via switch) |

---

## 11. API de Embed Externa

### Método 1 — Script Tag (recomendado para PontoCore)

```html
<script
  src="http://localhost:3000/maya-widget.js"
  data-token="opcional"
  data-position="right"
  data-theme="#00d4ff">
</script>
```

Expõe `window.__maya` com a API pública:

```javascript
window.__maya.open()                          // abre o widget
window.__maya.enrollVoice(name, userId?)      // inicia enrollment
window.__maya.on('enroll-complete', (e) => {  // ouve resultado
  console.log(e.success, e.name)
})
window.__maya.on('open-change', (e) => {})    // ouve abertura/fechamento
window.__maya.off('enroll-complete', fn)      // remove listener
```

### Método 2 — iFrame (para sites de terceiros)

```html
<iframe
  src="http://localhost:3000/embed?position=right&theme=%2300d4ff"
  id="maya-widget-iframe"
  style="width:120px;height:120px;border:none;position:fixed;bottom:20px;right:20px;">
</iframe>
```

Comunicação via `window.postMessage`:

```javascript
// Host → Widget (abrir)
iframe.contentWindow.postMessage({ type: 'maya:open' }, '*')

// Host → Widget (enrollment)
iframe.contentWindow.postMessage({
  type: 'maya:enroll-voice',
  name: 'João Silva',
  userId: '123'
}, '*')

// Widget → Host (resultado enrollment)
window.addEventListener('message', (e) => {
  if (e.data.type === 'maya:enroll-complete') {
    console.log(e.data.success, e.data.name)
  }
})
```

### Integração PontoCore Frontend

Arquivo: `seneca-client/src/index.html` — script tag incluída antes de `</body>`.

Tela de funcionários: botão "Cadastrar Voz Maya" chama `window.__maya.enrollVoice(nome, id)`.

```typescript
// employee-list.component.ts
cadastrarVozMaya(employee: Funcionario): void {
  const maya = (window as any).__maya
  if (maya) {
    maya.enrollVoice(employee.nome, String(employee.idFuncionario))
  }
}
```

---

## 12. Deploy com Docker

### Build Rápido

```bash
docker build -t maya-widget .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e OPENAI_API_KEY=sk-proj-... \
  -e DB_ADAPTER=postgres \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  maya-widget
```

### Compose Standalone (widget + postgres próprio)

```bash
# Crie um .env com ANTHROPIC_API_KEY e OPENAI_API_KEY
cp .env.local.example .env.local
# edite .env.local com suas chaves

docker compose -f docker-compose.widget.yml up --build
```

O widget estará disponível em `http://localhost:3000`.  
As migrações SQL são aplicadas automaticamente no primeiro startup via `docker/entrypoint.sh`.

### Compose com PontoCore (fullstack)

```bash
# Em pontocore-backend/:
docker compose -f docker-compose.fullstack.onpremise.yml up --build
```

Adiciona o serviço `maya-widget` ao stack completo (PostgreSQL + Redis + RabbitMQ + MinIO + Vault + Frontend + Backend + Maya).

### Variáveis de Ambiente Docker

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API |
| `OPENAI_API_KEY` | ✅ | OpenAI Realtime Voice |
| `DB_ADAPTER` | ✅ | `postgres` para Docker |
| `DATABASE_URL` | ✅ com postgres | `postgresql://user:pass@host:5432/db` |
| `PYTHON` | Definida no Dockerfile | `/app/.venv/bin/python3` |
| `NEXT_PUBLIC_WAKE_WORD` | ❌ | Wake word (padrão: `maya`) |
| `GEMINI_API_KEY_FREE` | ❌ | Gemini gratuito (AIStudio) |
| `GEMINI_API_KEY` | ❌ | Gemini pago (fallback) |

### Arquitetura Docker Multi-stage

| Stage | Base | Propósito |
|---|---|---|
| `deps` | `node:20-slim` | Instala apenas prod deps (`npm ci --omit=dev`) |
| `builder` | `node:20-slim` | Instala todos deps + executa `next build` |
| `runner` | `node:20-slim` | Imagem final com Python + Vosk + artefatos de build |

---

## 13. Ferramentas de Debug

### Browser Log Collector

Atalho: **`Ctrl+Shift+L`** em qualquer lugar do cockpit.

- Intercepta `console.log`, `console.warn`, `console.error` desde o carregamento da página
- Serializa todos os logs para JSON
- Dispara download automático de `maya-logs-{timestamp}.json`
- Útil para enviar logs de produção sem acesso ao DevTools

### Suite de Testes (Vitest)

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

Cobertura atual: **100+ testes** distribuídos:

| Arquivo | Testes |
|---|---|
| `src/lib/db/__tests__/adapter.test.ts` | Adapter factory + Supabase shape |
| `src/components/widget/orbs/__tests__/DefaultOrb.pure.test.ts` | hexToRgb + resolveTarget |
| `src/components/widget/__tests__/MayaWidget.test.tsx` | Toggle + OrbRenderer |
| `src/components/widget/__tests__/WidgetSettingsModal.test.tsx` | 4 abas + toggles |
| `src/components/widget/__tests__/WidgetEnrollModal.test.tsx` | Steps + eventos |
| `src/components/widget/__tests__/WidgetChatPanel.test.tsx` | Chat interface |
| `src/app/embed/__tests__/embed.page.test.tsx` | PostMessage bridge |

### Verificação TypeScript

```bash
npx tsc --noEmit      # zero erros esperados
```

---

*Documentação gerada e mantida por GitHub Copilot no projeto JARVIS AIOS.*
