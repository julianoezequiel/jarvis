# ANDAMENTO.md — TASK-002: Maya Widget Embeddable

**Task:** JARVIS-TASK-002  
**Branch:** `feature/jarvis-TASK-002`  
**Início:** 12/03/2026  
**Última atualização:** 13/03/2026  

---

## Status Geral

| Fase | Descrição | Status |
|---|---|---|
| 1 | Abstração de Banco de Dados (`src/lib/db/`) | ✅ Concluído |
| 2 | Widget Core (Orb + Sidebar + Maximizado) | ⏳ Não iniciado |
| 3 | SettingsModal com 4 abas | ⏳ Não iniciado |
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

## Próximo Passo

**Fase 2 — Widget Core (Orb + Sidebar + Maximizado)**

Componentes a criar:
1. `src/components/widget/MayaWidget.tsx` — raiz do widget (overlay fixed)
2. `src/components/widget/MayaOrb.tsx` — orbe draggable com reação a áudio
3. `src/components/widget/MayaSidebar.tsx` — painel lateral 380px (chat + histórico)
4. `src/components/widget/MayaMaximized.tsx` — view expandida (cockpit simplificado)

Pontos de atenção: CSS isolation (Shadow DOM ou CSS modules), mobile-first, zero dependência do host.
