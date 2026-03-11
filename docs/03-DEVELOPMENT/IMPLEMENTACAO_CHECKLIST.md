# Implementação operacional — Checklist por arquivo

Este documento converte o guia passo-a-passo em um plano operacional com checklist por arquivo a ser criado no projeto. Para cada item abaixo, crie o arquivo mencionado, preencha o esqueleto inicial e marque a caixa quando concluído.

## Estrutura geral

- [ ] `docs/03-DEVELOPMENT/IMPLEMENTACAO_CHECKLIST.md` — este checklist (criado).
- [ ] `docs/04-API-REFERENCE/ENDPOINTS.md` — especificação de endpoints (métodos, rotas, autenticação).
- [ ] `docs/04-API-REFERENCE/PAYLOADS.md` — contratos de request/response e exemplos JSON.
- [ ] `docs/05-DEPLOYMENT/README.md` — visão geral do deploy, padrões e requisitos.
- [ ] `docs/05-DEPLOYMENT/runbooks/DEPLOY_ON_PREMISE.md` — passo-a-passo para on-premise (Docker Compose, envs).
- [ ] `docs/06-OPERATIONS/README.md` — runbooks de operações, healthchecks, logs e rollbacks.
- [ ] `.env.example` — variáveis de ambiente essenciais (ex.: ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE keys).

## Frontend (Next.js)

- [ ] `package.json` — dependências e scripts básicos (`dev`, `build`, `start`, `lint`).
- [ ] `src/app/layout.tsx` — layout global com fontes e providers.
- [ ] `src/app/page.tsx` — página inicial (cockpit placeholder).
- [ ] `src/components/cockpit/JarvisCockpit.tsx` — componente raiz do cockpit (skeleton).
- [ ] `src/components/cockpit/ChatPanel.tsx` — painel de chat (placeholder SSE UI).

## API Routes (Next.js app router)

- [ ] `src/app/api/jarvis-chat/route.ts` — POST SSE → interface com Claude (skeleton handler).
- [ ] `src/app/api/jarvis-memory/route.ts` — routes para `remember_fact`, `search_memory`, `write_file`, `save_project`.
- [ ] `src/app/api/agent-execute/route.ts` — executor de agentes (recebe delegate commands).
- [ ] `src/app/api/realtime-token/route.ts` — gera token efêmero para OpenAI Realtime.

## Libraries / Integrations

- [ ] `src/lib/supabase.ts` — cliente Supabase e helpers (createClient export).
- [ ] `src/lib/realtimeClient.ts` — cliente WebSocket para OpenAI Realtime (skeleton).
- [ ] `src/lib/jarvisPrompt.ts` — system prompt e registro de tools (prompt constants).

## Hooks e lógica do cliente

- [ ] `src/hooks/useJarvisChat.ts` — SSE client hook (sendMessage, messages[], status).
- [ ] `src/hooks/useWakeWord.ts` — integração Web Speech API para detectar wake word.
- [ ] `src/hooks/useAudioCapture.ts` — captura mic e converte para PCM16 chunks.
- [ ] `src/hooks/useRealtimeSession.ts` — orquestra sessão Realtime (open/close, events).

## Worker e tarefas agendadas

- [ ] `jarvis-worker.js` — worker Node.js autônomo (setInterval 3min, 6 agentes em Promise.all).

## CI / Dev tooling

- [ ] `.github/workflows/ci.yml` — CI: lint, typecheck (`npx tsc --noEmit`) e build.
- [ ] `README.md` — resumo do projeto e passos rápidos para começar.

## Como usar este checklist

1. Para cada item: crie o arquivo indicado com um esqueleto mínimo (comentários, TODOs e exportações vazias).
2. Abra um PR pequeno por grupo (Docs / Frontend / API / Worker) e marque os itens correspondentes à medida que avançar.
3. Substitua os placeholders por implementações incrementais; mantenha commits atômicos com referências `Refs: TASK-XXX`.

---
_Se quiser, eu posso gerar automaticamente os esqueletos para cada arquivo listado (TSX/TS/MD), e depois rodar uma verificação de TypeScript. Deseja que eu gere os arquivos iniciais agora?_ 
