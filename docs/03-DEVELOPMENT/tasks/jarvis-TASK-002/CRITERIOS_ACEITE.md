# CRITERIOS_ACEITE.md — TASK-002: Maya Widget Embeddable

**Task:** JARVIS-TASK-002  
**Título:** Maya como Widget Embeddable  

---

## FASE 1 — Abstração de Banco de Dados

- [ ] `src/lib/db/index.ts` exporta interface `DbAdapter` com `select`, `insert`, `update`, `delete`
- [ ] `src/lib/db/adapters/supabase.ts` implementa `DbAdapter` mantendo comportamento atual
- [ ] `src/lib/db/adapters/postgres.ts` implementa `DbAdapter` usando `pg` (node-postgres)
- [ ] Variável `DB_ADAPTER=supabase|postgres` seleciona o adapter em runtime
- [ ] `DATABASE_URL` funciona quando `DB_ADAPTER=postgres`
- [ ] Todas as APIs existentes passam a usar `db/index.ts` (sem chamadas diretas ao supabase)
- [ ] `npx tsc --noEmit` sem erros após refatoração
- [ ] Script SQL de migration criado em `database/migrations/001_maya_tables.sql`
- [ ] Testado: `DB_ADAPTER=supabase` com credenciais atuais — comportamento idêntico ao atual

---

## FASE 2 — Widget Core (Orb + Sidebar + Maximizado)

### Estado: Minimizado
- [ ] Orb flutuante visível no canto inferior direito por padrão
- [ ] Posição configurável (direita/esquerda) via `localStorage.maya_widget_position`
- [ ] Orb reage ao volume do microfone (Web Audio API) quando ativo
- [ ] Tooltip "Maya" ao hover do orb
- [ ] Clique no orb expande para estado sidebar com animação `slide-in`
- [ ] Orb continua pulsando enquanto Maya está processando (mesmo em sidebar)

### Estado: Sidebar (380px)
- [ ] Sidebar ocupa largura fixa de 380px na lateral da página (posição configurável)
- [ ] Não empurra o conteúdo do host — overlay absoluto/fixed
- [ ] Orb visível na parte superior da sidebar
- [ ] ChatPanel completo: mensagens SSE com streaming, markdown renderizado, code highlight
- [ ] Input de texto com botão enviar e suporte a Enter
- [ ] Botão microfone 🎤 visível e funcional
- [ ] Botão ⚙ abre SettingsModal
- [ ] Botão ⊞ (maximizar) transita para estado maximizado
- [ ] Botão × (minimizar) retorna ao orb
- [ ] Responsivo em mobile: ocupa 100% da largura quando < 480px

### Estado: Maximizado (overlay)
- [ ] Overlay fullscreen (100vw × 100vh) com fundo semi-transparente
- [ ] 3 colunas: Agentes (240px) | Chat (flex) | Docs/Files (280px)
- [ ] Agentes: lista de 21 agentes com badge ativo/ocioso
- [ ] Chat: mesmo componente do sidebar, com mais espaço
- [ ] Docs: lista de arquivos entregues com download
- [ ] ESC ou clique fora retorna para sidebar
- [ ] Botão fechar (×) no canto superior direito

---

## FASE 3 — SettingsModal com 4 abas

### Aba: Geral
- [ ] Toggle posição: Esquerda / Direita — persiste em `localStorage.maya_widget_position`
- [ ] Seletor de voz TTS (vozes Edge disponíveis filtradas)
- [ ] Toggle "Manter áudio em background"
- [ ] Botão "Limpar memória" com confirmação

### Aba: Agentes
- [ ] Lista os 21 agentes com nome, especialidade e toggle ativo/inativo
- [ ] Estado persistido em `localStorage.maya_agents_config`
- [ ] Agentes desativados não aparecem no `AgentsPanel` e não recebem delegações

### Aba: Conhecimento
- [ ] Upload de arquivos: PDF, TXT, MD, DOCX (máx 10MB por arquivo)
- [ ] Lista de arquivos carregados com data e número de chunks
- [ ] Botão remover por arquivo
- [ ] Feedback de progresso durante processamento
- [ ] API `POST /api/knowledge` funcional

### Aba: Vozes
- [ ] Todos os itens do atual `SettingsPanel` seção "Identificação de Voz" migrados aqui
- [ ] Cadastro, listagem, regravar (↺) e remoção (✕) de perfis
- [ ] Toggle "Ativar verificação de voz"
- [ ] Slider de sensibilidade (0.60–0.95)

---

## FASE 4 — Enrollment Externo

- [ ] `MayaWidget.tsx` ouve `window.dispatchEvent(new CustomEvent('maya:enroll-voice', {detail: {name, userId}}))`
- [ ] Ao receber o evento: expande sidebar se minimizado + abre `VoiceEnrollModal` com `suggestedName`
- [ ] Ao concluir: dispara `maya:enroll-complete` com `{ name, userId, success }`
- [ ] Documentação do contrato de evento em `docs/04-API-REFERENCE/embed-events.md`
- [ ] Exemplo funcional em Angular (snippet TypeScript) documentado

---

## FASE 5 — Embed Script

- [ ] `embed/script.ts` — function que monta o widget via `document.createElement`
- [ ] Aceita atributos: `data-token`, `data-position`, `data-theme`
- [ ] Funciona sem React/Angular no host (bundle self-contained)
- [ ] Não polui `window.*` além de `window.__maya`
- [ ] `window.__maya.enrollVoice(name, userId)` disponível publicamente

---

## FASE 6 — Integração PontoCore

- [ ] `index.html` do PontoCore recebe a `<script>` tag da Maya
- [ ] Widget aparece sobre o layout Angular sem conflito de CSS
- [ ] `quick-chat` (`chatAcitve = false`) permanece desabilitado — sem conflito
- [ ] Botão "Cadastrar Voz" em tela de usuários do PontoCore dispara `maya:enroll-voice`
- [ ] Enrollment completa corretamente e retorna `maya:enroll-complete`
- [ ] Widget funciona nos layouts: classic, classy, compact, dense

---

## FASE 7 — Dockerfile e Containerização

- [ ] `Dockerfile` multi-stage (builder + runner com Alpine)
- [ ] Python 3 + vosk instalados na imagem final
- [ ] `PYTHON` env var aponta para `/venv/bin/python3`
- [ ] `docker build -t maya-widget .` completa sem erros
- [ ] `docker run -p 3000:3000 maya-widget` — app responde em `localhost:3000`
- [ ] `docker-compose.widget.yml` com integração ao PostgreSQL do cliente
- [ ] Script SQL de migration executado automaticamente no startup (via entrypoint)
- [ ] Imagem final < 700MB

---

## Critérios de Qualidade (todos os fases)

- [ ] `npx tsc --noEmit` sem erros ao final de cada fase
- [ ] Nenhum componente do Iron Man (`/cockpit`) alterado — apenas adições em `/widget`
- [ ] Todos os hooks existentes reutilizados sem modificação
- [ ] Zero chamadas diretas ao `supabase` fora de `src/lib/db/`
- [ ] Nenhuma credencial hardcoded — sempre via `process.env`
