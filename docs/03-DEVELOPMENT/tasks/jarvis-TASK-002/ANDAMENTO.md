# ANDAMENTO.md — TASK-002: Maya Widget Embeddable

**Task:** JARVIS-TASK-002  
**Branch:** `feature/jarvis-TASK-002`  
**Início:** 12/03/2026  
**Última atualização:** 12/03/2026 (sessão 3)  

---

## Status Geral

| Fase | Descrição | Status |
|---|---|---|
| 1 | Abstração de Banco de Dados (`src/lib/db/`) | ✅ Concluído |
| 2 | Widget Core (Orb + Sidebar + Maximizado) | ✅ Concluído |
| 3 | SettingsModal com 4 abas | ✅ Concluído |
| 4 | Enrollment Externo via evento | ⏳ Não iniciado |
| 5 | Embed Script (script tag + iframe) | ⏳ Não iniciado |
| 6 | Integração PontoCore Frontend | ⏳ Não iniciado |
| 7 | Dockerfile e Containerização | ⏳ Não iniciado |

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

## Próximo Passo

**Fase 4 — Enrollment Externo via evento**

- Expor API de enrollment para sistemas host via `postMessage` / custom event
- Permitir que o PontoCore dispare o flow de cadastro de voz sem abrir o widget
- Contrato: `window.dispatchEvent(new CustomEvent('maya:enroll-intent', { detail: { suggestedName } }))`
- Revisar `VoiceEnrollModal` para usar dentro do widget (sem depender do cockpit)
