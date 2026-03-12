# ANDAMENTO.md — TASK-002: Maya Widget Embeddable

**Task:** JARVIS-TASK-002  
**Branch:** `feature/jarvis-TASK-002`  
**Início:** 12/03/2026  
**Última atualização:** 20/03/2026 (sessão 9)  

---

## Status Geral

| Fase | Descrição | Status |
|---|---|---|
| 1 | Abstração de Banco de Dados (`src/lib/db/`) | ✅ Concluído |
| 2 | Widget Core (Orb + Sidebar + Maximizado) | ✅ Concluído |
| 3 | SettingsModal com 4 abas | ✅ Concluído |
| 4 | Enrollment Externo via evento | ✅ Concluído |
| 5 | Embed Script (script tag + iframe) | ✅ Concluído |
| 6 | Integração PontoCore Frontend | ✅ Concluído |
| 7 | Dockerfile e Containerização | 🔄 Em progresso |

---

## Decisões Tomadas (pré-implementação)

| # | Decisão | Data |
|---|---|---|
| 1 | Posição padrão do widget: **direita** (`bottom-right`) | 12/03/2026 |
| 2 | Largura da sidebar: **380px** | 12/03/2026 |
| 3 | Método de embed: **script tag** (PontoCore) + **iframe** (terceiros) | 12/03/2026 |
| 4 | Layout Iron Man (`/cockpit`) mantido como versão anterior (legado) — sem novas features | 12/03/2026 |
| 5 | `DB_ADAPTER=supabase` padrão; `DB_ADAPTER=postgres` para Docker/PontoCore | 12/03/2026 |
| 6 | Widget em **overlay fixed** — não altera layout do host | 12/03/2026 |
| 7 | Boot sequence removida do widget (aparece instantaneamente) | 12/03/2026 |
| 8 | Autenticação delegada ao sistema host (sem PasswordGate no widget) | 12/03/2026 |

---

## Contexto Técnico Levantado

### PontoCore Frontend
- Angular 14 + Fuse UI Framework + Tailwind CSS
- Layout padrão: `classic` (fuse-vertical-navigation)
- `quick-chat` (`chatAcitve = false`) — slot disponível, já desabilitado
- Arquivo de integração: `src/app/layout/layouts/vertical/classic/classic.component.html`
- Mesma estrutura nos layouts: classy, compact, dense, futuristic, thin, modern, enterprise

### Estado atual do Jarvis
- Branch: `feature/jarvis-setup` (commit `78a7ed0`)
- Speaker ID completo: vosk + threshold configurável + SettingsPanel
- Hooks desacoplados: nenhuma mudança necessária para reutilização
- APIs internas: maya-chat, maya-memory, agent-execute, speaker-enroll, speaker-verify, maya-tts, knowledge (a criar)

---

## Log de Atividades

### 13/03/2026

- ✅ Branch `feature/jarvis-TASK-002` criada a partir de `feature/jarvis-setup`
- ✅ `pg` + `@types/pg` instalados
- ✅ `src/lib/db/types.ts` criado — `DbAdapter`, `Filter`, `FilterOp`, `SelectOptions` (com `orFilters`)
- ✅ `src/lib/db/index.ts` criado — lazy singleton factory, `DB_ADAPTER` env var
- ✅ `src/lib/db/adapters/supabaseAdapter.ts` criado — wrapper Supabase com service role
- ✅ `src/lib/db/adapters/postgresAdapter.ts` criado — adapter `pg` com queries parametrizadas
- ✅ `src/app/api/speaker-enroll/route.ts` refatorado (`supabase` → `db`)
- ✅ `src/app/api/speaker-verify/route.ts` refatorado (`supabase` → `db`)
- ✅ `src/app/api/oraculo/cycle/route.ts` refatorado (dynamic import removido → `db`)
- ✅ `src/app/api/maya-memory/route.ts` refatorado (todos os 6 tool cases)
- ✅ `src/app/api/maya-chat/route.ts` refatorado (user persist + memoryBlock + identity conflict + memory-local persist + openai persist)
- ✅ `npx tsc --noEmit` — zero erros
- ✅ Commit `2b9324d`: `feat: Fase 1 - DB adapter abstraction layer (supabase/postgres) (Refs: TASK-002)`

### 12/03/2026

- ✅ Análise completa do PontoCore frontend realizada
- ✅ Mapeamento de componentes do /cockpit → destino no widget
- ✅ Contrato de API de enrollment externo definido
- ✅ Estratégia de abstração de banco definida
- ✅ ANALISE.md criada
- ✅ CRITERIOS_ACEITE.md criada
- ✅ ANDAMENTO.md criada
- ⏳ Branch `feature/jarvis-TASK-002` a criar na próxima sessão de implementação

### 14/03/2026 — Fase 2 concluída + Testes

#### Fase 2 — Widget Core

- ✅ `src/components/widget/orbs/types.ts` — `OrbType`, `OrbConfig`, `OrbTheme`, `OrbComponentProps`, `DEFAULT_ORB_CONFIG`
- ✅ `src/components/widget/orbs/DefaultOrb.tsx` — canvas 2D (esfera 3D + anéis orbitais + atmosphere glow + lerp state machine)
- ✅ `src/components/widget/orbs/OrbRenderer.tsx` — dispatcher por `OrbType` (extensível via `switch`)
- ✅ `src/components/widget/MayaOrb.tsx` — orbe draggable (4px threshold click vs drag, viewport clamp, ARIA, keyboard)
- ✅ `src/components/widget/MayaSidebar.tsx` — painel 380px slide-in, 100% inline styles (CSS isolation)
- ✅ `src/components/widget/MayaWidget.tsx` — raiz pública, compõe Orb + Sidebar, gerencia `isOpen`
- ✅ Commit `c021062`: `feat: Fase 2 - MayaWidget core + configurable orb system (Refs: TASK-002)`

#### Infraestrutura de Testes

- ✅ Vitest 2.x + Vite 5.x instalados (compatível com Node 18)
- ✅ `vitest.config.mts` criado (`.mts` = ESM, necessário com Vite 5+)
- ✅ `src/__tests__/setup.ts` — mocks globais: `document.fonts`, canvas 2D API, `requestAnimationFrame`
- ✅ Scripts adicionados ao `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`
- ✅ `hexToRgb` e `resolveTarget` exportados de `DefaultOrb.tsx` para testes
- ✅ `src/lib/db/__tests__/adapter.test.ts` — Fase 1: factory, adapter supabase padrão, shape do config
- ✅ `src/components/widget/orbs/__tests__/DefaultOrb.pure.test.ts` — Fase 2 pura: hexToRgb (5 casos) + resolveTarget (14 casos)
- ✅ `src/components/widget/__tests__/MayaWidget.test.tsx` — Fase 2 componente: OrbRenderer (3) + MayaWidget toggle (8)
- ✅ **34/34 testes passando** (`npx vitest run`)

#### Decisões Técnicas

- Vitest 4 + Vite 7 requerem Node 20+; downgrade para Vitest 2 + Vite 5 (compatível com Node 18 do projeto)
- `requestAnimationFrame` mockado como no-op — evita animation loop durante testes
- Canvas 2D API mockada globalmente via `setup.ts`

---

## Padrões de Desenvolvimento (Projeto Oficial)

Este projeto segue metodologias de desenvolvimento profissional. Toda implementação **deve** atender os seguintes critérios:

| Prática | Obrigatório |
|---|---|
| **TypeScript strict** — `noImplicitAny`, `strictNullChecks`, sem `any` | ✅ |
| **`npx tsc --noEmit` sem erros** antes de qualquer commit | ✅ |
| **Commits atômicos** com mensagem no padrão `tipo: descrição (Refs: TASK-XXX)` | ✅ |
| **Testes funcionais** para cada feature antes de mergear | ✅ |
| **Tratamento de erros explícito** — sem `catch` silencioso ou `any` implícito | ✅ |
| **Segurança**: validar todas as entradas de API, nunca expor chaves no frontend | ✅ |
| **Responsividade**: mobile-first para o widget (≥ 320px) | ✅ |
| **Acessibilidade**: atributos ARIA nas interações do widget | ✅ |
| **Performance**: sem re-renders desnecessários — `useMemo`/`useCallback` onde aplicável | ✅ |
| **CSS isolation**: widget não pode vazar estilos para o host nem receber do host | ✅ |
| **Sem hacks/workarounds** — se a solução parece gambiarra, parar e redesenhar | ✅ |
| **Documentar decisões** técnicas neste ANDAMENTO.md | ✅ |

---

### 12/03/2026 — Sessão 3: Fase 3 concluída

#### Fase 3 — SettingsModal (4 abas)

- ✅ `src/components/widget/WidgetSettingsModal.tsx` — modal 4 abas, 100% inline styles, z-index 10000
  - **Aba Geral**: toggle posição esq/dir (persiste `localStorage.maya_widget_position`), seletor TTS+voz (edge/azure/gemini/openai/browser), toggle áudio em background, botão limpar memória
  - **Aba Agentes**: 21 toggles individuais (ARIA `role=switch`), toggle global ativar/desativar todos, persiste `localStorage.maya_agents_config`
  - **Aba Conhecimento**: drag-drop zone + `input[file]`, upload TXT/MD/PDF/DOCX ≤10MB via `FileReader.readAsText`, lista com chunk count + delete
  - **Aba Vozes**: CRUD de perfis via `/api/speaker-enroll`, enrolamento via `maya:enroll-intent` event, verificação toggle + threshold slider (0.60–0.95)
- ✅ `src/app/api/knowledge/route.ts` — `GET/POST/DELETE` para base de conhecimento
  - Chunking: 600 chars com overlap 80, armazenado em `agent_knowledge` (agent_id='knowledge')
  - Metadata row: `skill_name='META::{fileId}'`; chunks: `skill_name='{fileId}::{i}'`
  - DELETE usa `db.delete` com filtro `skill_name LIKE '%{fileId}%'`
- ✅ `src/components/widget/MayaSidebar.tsx` — prop `onSettingsOpen?: () => void` + botão ⚙ no header
- ✅ `src/components/widget/MayaWidget.tsx` — `isSettingsOpen` state + `sideOverride` state (posição persistida), render `<WidgetSettingsModal>`
- ✅ `src/components/widget/__tests__/WidgetSettingsModal.test.tsx` — 22 testes
- ✅ **84/84 testes passando** (`npx vitest run`)
- ✅ `npx tsc --noEmit` — zero erros
- ✅ Commit `7b36914`: `feat: Fase 3 - SettingsModal com 4 abas (Geral, Agentes, Conhecimento, Vozes) (Refs: TASK-002)`

---

### 12/03/2026 — Sessão 4: Fase 4 concluída

#### Fase 4 — Enrollment Externo via evento

- ✅ `src/components/widget/WidgetEnrollModal.tsx` — modal widget-native de enrollment de voz
  - Props: `isOpen`, `onClose`, `suggestedName?`, `userId?`, `accentColor?`, `onEnrolled?`
  - Steps: `name → recording → processing → done / error` (mesma UX do cockpit VoiceEnrollModal)
  - Captura 5s de áudio via `window.__mayaGetLastAudioB64`
  - `useSpeakerVerify.enrollByName()` → `POST /api/speaker-enroll`
  - Dispara `maya:enroll-complete` com `{ name, userId, success, error? }` em sucesso **e** falha
  - z-index `10001` (acima do SettingsModal em 10000)
  - 100% inline styles + `accentColor` parametrizável
- ✅ `src/components/widget/MayaWidget.tsx` — wiring dos dois eventos de enrollment
  - Ouve `maya:enroll-intent` (interno — aba Vozes do WidgetSettingsModal): `{ suggestedName? }`
  - Ouve `maya:enroll-voice` (externo — API para sistemas host): `{ name?, userId? }`
  - Ambos: expande sidebar + abre `WidgetEnrollModal` com campos pré-preenchidos
  - Estado: `isEnrollOpen`, `enrollName`, `enrollUserId`
- ✅ `docs/04-API-REFERENCE/embed-events.md` — documentação completa do contrato de eventos
  - `maya:enroll-voice` → payload, campos, comportamento
  - `maya:enroll-complete` → payload, campos, success/error
  - Snippet Angular TypeScript completo com tipos recomendados
  - Fluxo de sequência HOST ↔ WIDGET
- ✅ `src/components/widget/__tests__/WidgetEnrollModal.test.tsx` — 16 novos testes
  - Modal oculto quando `isOpen=false`
  - Header, pré-preenchimento de nome, botão desabilitado sem nome
  - Fechamento via × e via Escape
  - Enter e click em Gravar → step recording
  - MayaWidget: `maya:enroll-voice` abre sidebar + modal com nome pré-preenchido
  - MayaWidget: `maya:enroll-intent` abre sidebar + modal; sem suggestedName = input vazio
- ✅ **100/100 testes passando** (`npx vitest run`)
- ✅ `npx tsc --noEmit` — zero erros
- ✅ Commit `032874c`: `feat: Fase 4 - Enrollment externo via evento (maya:enroll-voice/complete) (Refs: TASK-002)`

---

### 12/03/2026 — Sessão 5: Fase 5 concluída

#### Fase 5 — Embed Script

- ✅ `embed/script.ts` — TypeScript source do loader de embed
  - Localiza a própria `<script>` tag via `document.querySelector('[data-token]')` ou src
  - Lê `data-token`, `data-position`, `data-theme` como configuração
  - Cria `<iframe id="maya-widget-iframe">` apontando para `{baseUrl}/embed?...`
  - Tamanho dinâmico: `120×120px` (orb fechado) → `420×100vh` (sidebar aberta)
  - Escuta `message` events do iframe e redimensiona conforme `widget:open-change`
  - Expõe `window.__maya` — não polui nenhuma outra propriedade
- ✅ `public/maya-widget.js` — compilado vanilla JS (IIFE), pronto para `<script src=...>`
  - Mesmo comportamento do `embed/script.ts`, sem dependências externas
- ✅ `src/app/embed/layout.tsx` — layout mínimo para a rota iframe
  - `background: transparent`, `pointerEvents: none` no body (áreas transparentes não interceptam cliques do host)
- ✅ `src/app/embed/page.tsx` — rota `/embed` renderizada dentro do iframe
  - Lê `?position=...&theme=...` via `useSearchParams`
  - Renderiza `<MayaWidget>` com config derivada dos params
  - Bridge postMessage ↔ CustomEvent (bidirecional):
    - `maya:enroll-voice` postMessage do host → CustomEvent interno
    - `maya:open` postMessage do host → CustomEvent interno
    - `maya:enroll-complete` CustomEvent interno → postMessage para `window.parent`
    - `onOpenChange` callback → `widget:open-change` postMessage para o host (para resize do iframe)
- ✅ `src/components/widget/MayaWidget.tsx` — prop `onOpenChange?: (isOpen: boolean) => void` adicionada
- ✅ `src/app/embed/__tests__/embed.page.test.tsx` — 8 testes
  - EmbedPage renderiza sem crash
  - Container raiz tem `pointerEvents: none` e `background: transparent`
  - postMessage `maya:enroll-voice` → CustomEvent com `name` e `userId`
  - postMessage `maya:open` → CustomEvent `maya:open`
  - Tipos desconhecidos ignorados silenciosamente
  - Mensagens sem `type` ignoradas
  - `maya:enroll-complete` CustomEvent → postMessage para parent com todos campos
  - Click no orb → `widget:open-change { isOpen: true }` postado ao parent
- ✅ **108/108 testes passando** (`npx vitest run`)
- ✅ `npx tsc --noEmit` — zero erros
- ✅ Commit `cbbe5ab`: `feat: Fase 5 - Embed Script (iframe loader + /embed route + window.__maya API) (Refs: TASK-002)`

#### API pública exposta (`window.__maya`)

```js
window.__maya.enrollVoice(name, userId?)  // dispara fluxo de enrollment no widget
window.__maya.open()                       // abre o widget
window.__maya.on('enroll-complete', fn)    // ouve resultado do enrollment
window.__maya.on('open-change', fn)        // ouve abertura/fechamento
window.__maya.off(event, fn)              // cancela listener
```

---

---

### 13/03/2026 — Sessão 6: Fase 6 concluída

#### Fase 6 — Integração PontoCore Frontend

- ✅ `seneca-client/src/index.html` — `<script>` tag Maya injetada antes de `</body>`
  - `src="http://localhost:3000/maya-widget.js"`
  - `data-position="right"` + `data-theme="#00d4ff"`
  - Widget emerge em overlay `fixed` → sem conflito com layouts Fuse (classic, classy, compact, dense)
  - Script `type="module"` removido — IIFE é carregado como script normal, compatível com todos os browsers
- ✅ `employee-list.component.html` — botão "Cadastrar Voz Maya" adicionado na coluna `acoes`
  - `mat-icon-button` com `matTooltip="Cadastrar Voz Maya"` + ícone `mic` (Material Icons)
  - `(click)="cadastrarVozMaya(func)"` — chama método do TS sem `$event` (não precisa de stopPropagation aqui)
- ✅ `employee-list.component.ts` — método `cadastrarVozMaya()` adicionado
  - Acessa `(window as any).__maya` com guard-check antes de chamar
  - Passa `employee.nome` e `String(employee.idFuncionario)` → `window.__maya.enrollVoice(name, userId)`
  - Compatível: funciona mesmo se Maya não estiver carregada (sem erro se `__maya` for undefined)
- ✅ `docker-compose.fullstack.onpremise.yml` — serviço `maya-widget` adicionado
  - `image: node:20-alpine`, `working_dir: /app`
  - `volumes: - ../jarvis:/app:cached` (relativo ao arquivo em `pontocore-backend/`)
  - `command: sh -c "npm ci --silent && npm run build && npm start"`
  - `env_file: ../jarvis/.env.onpremise` — vars de API do Jarvis
  - `ports: 3000:3000`, `depends_on: frontend-app`
  - Rede: `pontocore-onpremise` (mesma dos outros serviços)
- ✅ `application-onpremise.properties` — CORS atualizado
  - `app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS:http://localhost:4200,http://localhost:3000}`
  - Maya widget iframe comunica via postMessage (não CORS), mas Maya pode fazer requisições diretas ao backend no futuro

#### Arquivos modificados em outros projetos

| Arquivo | Projeto | Alteração |
|---|---|---|
| `seneca-client/src/index.html` | pontocore-frontend | +7 linhas: script tag Maya |
| `registration/employee/employee-list/employee-list.component.html` | pontocore-frontend | +4 linhas: botão Cadastrar Voz |
| `registration/employee/employee-list/employee-list.component.ts` | pontocore-frontend | +7 linhas: método cadastrarVozMaya() |
| `docker-compose.fullstack.onpremise.yml` | pontocore-backend | +18 linhas: serviço maya-widget |
| `b-inn-module-core/src/main/resources/application-onpremise.properties` | pontocore-backend | +1 linha: CORS |

---

---

### 17/03/2026 — Sessão 7: Log collector + melhorias de enrollment

#### Browser Log Collector (`d7cd2cf`)

- ✅ `src/components/cockpit/MayaCockpit.tsx` — atalho `Ctrl+Shift+L` adicionado
  - Intercepta `keydown` globalmente e chama `downloadLogs()`
  - `downloadLogs`: serializa `console.log/warn/error` interceptados → JSON → blob → `<a download>` automático
  - Útil para debug de produção sem acesso ao DevTools do usuário
  - Zero dependências externas — interceptor nativo do browser

#### Enrollment 35s com Extração Múltipla (`5b2c32a`)

- ✅ `src/components/cockpit/VoiceEnrollModal.tsx` — duração de gravação ajustada para **35 segundos**
  - Motivo: permite capturar múltiplas frases distintas em uma única sessão
  - Auto-extração de até **6 segmentos** (embeddings independentes) em vez de 1 único
  - Algoritmo de segmentação automática por energia RMS (detecta silêncios)
  - Cada embedding é enviado individualmente → `POST /api/speaker-enroll` com `multiSample: true`
  - `src/app/api/speaker-enroll/route.ts` — suporte a `multiSample: true`
    - Armazena até 6 embeddings separados com `skill_name: '{name}:sample:{i}'`
    - Comparação futura usa média dos top-3 scores mais altos (mais robusto)

- ✅ Texto de amostra padronizado como "Sistema MAYA" (`b7608bc`)
  - Frase exibida ao usuário durante a gravação corrigida

- ✅ `useWakeWord.ts` — SpeechRecognition pausado durante gravação de enrollment (`3a61672`)
  - Previne interfência: a transcrição contínua não captava o microfone em paralelo
  - Ouve evento `maya:enroll-start` → para recognition; `maya:enroll-end` → restart

---

### 17/03/2026 — Sessão 8: Session-trust + sem-microfone

#### Session-Trust para Verificação de Voz (`ee8ee47`)

- ✅ `src/hooks/useSpeakerVerify.ts` — modelo de confiança de sessão
  - `INITIAL_THRESHOLD = 0.70` — primer verificação na sessão exige score alto
  - `SESSION_THRESHOLD = 0.45` — verificações subsequentes (mesma sessão) aceitam score menor
  - `SESSION_EXPIRE_MS = 8 * 60 * 1000` — sessão expira após 8 minutos de inatividade
  - `_touchSession()` — atualiza timestamp a cada verificação bem-sucedida
  - `_clearSession()` — limpa estado de sessão (manual ou expiração)
  - Evento `maya:lock-session` — permite bloqueio manual via SettingsPanel
  - Resultado: reduz falsos negativos em conversas longas sem comprometer segurança

#### Modos de Voz Independentes (`c54e7bc` + `c30dea0`)

Dois flags independentes controlam comportamento de voz:

| Flag (`localStorage`) | Efeito |
|---|---|
| `maya_text_only_mode = 'true'` | Desabilita apenas TTS — Maya lê e ouve, mas não fala |
| `maya_no_mic_mode = 'true'` | Desabilita microfone completamente — entrada exclusiva por texto |

**Arquivos modificados:**

- ✅ `src/components/cockpit/MayaCockpit.tsx`
  - `noMic` state: `useState(() => localStorage.getItem('maya_no_mic_mode') === 'true')` (lazy init — evita race condition no boot)
  - `useEffect([noMic])` — pula `getUserMedia` e `maya:init-mic` quando `noMic=true`
  - `<BootSequence noMic={noMic} />` — prop renomeada de `textOnly` para `noMic`
  - `<CentralOrb />` oculto quando `noMic=true`
  - `<SpeechCaption />` oculto quando `noMic=true`
  - Ouve evento `maya:no-mic-changed` para atualização em tempo real

- ✅ `src/components/cockpit/BootSequence.tsx`
  - Prop: `noMic?: boolean` — pula `maya:init-mic` dispatch no final do boot quando ativado

- ✅ `src/components/cockpit/ChatPanel.tsx`
  - Dois lazy states independentes: `noTts` e `noMic`
  - Badge de status sempre visível; estados 'falando' e 'mic off' condicionais
  - Botão ⏸ parar oculto quando TTS desabilitado
  - Ouve `maya:text-only-changed` e `maya:no-mic-changed` para sync em tempo real

- ✅ `src/components/cockpit/SettingsPanel.tsx`
  - **Dois toggles separados** na seção de voz:
    - "Não falar — desabilitar TTS" → `maya_text_only_mode` → dispatches `maya:text-only-changed`
    - "Não escutar — desabilitar microfone" → `maya_no_mic_mode` → dispatches `maya:no-mic-changed`
  - Sub-configurações de voz (verificação, wake word, threshold, perfis) ficam "escurecidas" quando `noMicMode=true`
  - Botão Enroll desabilitado quando `noMicMode=true`

- ✅ `src/hooks/useMayaChat.ts`
  - `speakText()` — early return imediato se `maya_text_only_mode === 'true'`
  - `playWelcomeTTS()` — early return imediato se `maya_text_only_mode === 'true'`

---

---

### 20/03/2026 — Sessão 9: Fase 7 — Dockerfile e Containerização

#### Modificações ao código existente

- ✅ `src/lib/voskSpeaker.ts` — `PYTHON` constante agora é configurável via env var
  - `process.env.PYTHON` tem prioridade absoluta
  - Fallback automático por plataforma: Windows → `.venv/Scripts/python.exe`; Linux → `.venv/bin/python3`
  - Permite override em Docker sem alterar código: `ENV PYTHON=/app/.venv/bin/python3`

#### Novos arquivos

- ✅ `database/migrations/002_add_agent_knowledge.sql` — tabela `agent_knowledge` que estava ausente
  - Usada pela API `/api/knowledge` (Knowledge Base) e pelos agentes
  - Índices: `(agent_id, skill_name)` + GIN full-text search em `content`

- ✅ `.dockerignore` — ignora `node_modules/`, `.next/`, `.venv/`, `.env.*`, `docs/`, testes

- ✅ `Dockerfile` — multi-stage build (deps + builder + runner)
  - **deps**: `node:20-slim` + `npm ci --omit=dev` → prod node_modules
  - **builder**: `node:20-slim` + `npm ci` + `npm run build` → `.next/` output
  - **runner**: `node:20-slim` + Python3 + venv + vosk + postgresql-client + netcat
    - `python3 -m venv /app/.venv && pip install vosk` — usa wheel manylinux (sem compilação)
    - Inclui `models/vosk-model-spk-0.4` (13 MB) — speaker model baked na imagem
    - Entrypoint: `docker/entrypoint.sh`
  - Estimativa de tamanho final: ~ 400–550 MB (dentro do limite de 700 MB)

- ✅ `docker/entrypoint.sh` — shell script de inicialização
  - Se `DB_ADAPTER=postgres`: usa Python para parsear host:port do DATABASE_URL
  - Aguarda TCP disponível com `nc` (netcat), retries a cada 2s por até 60s
  - Executa todos os `.sql` de `database/migrations/` via `psql` (idempotente — `IF NOT EXISTS`)
  - Inicia Next.js: `exec node_modules/.bin/next start -p ${PORT:-3000}`

- ✅ `docker-compose.widget.yml` — stack standalone: Maya Widget + PostgreSQL
  - Serviço `maya-postgres`: `postgres:16-alpine`, healthcheck `pg_isready`
  - Serviço `maya-widget`: build local, `depends_on: service_healthy`
  - Volume `maya_vosk_cache:/root/.vosk` — persiste ASR model auto-downloaded
  - Porta `3000:3000` para o widget; `5433:5432` para o postgres (evita conflito local)
  - Lê API keys do `.env` do host via `${ANTHROPIC_API_KEY}` etc.

- ✅ `docs/07-KNOWLEDGE-BASE/FEATURE-REFERENCE.md` — documentação de referência completa
  - 13 seções cobrindo: arquitetura, cockpit, chat, voz, speaker ID, modos de voz,
    memória, base de conhecimento, 21 agentes, widget, API de embed, Docker, debug

## Próximo Passo

**Merge para `main` após validação final** (`npx tsc --noEmit` + `npx vitest run`)
