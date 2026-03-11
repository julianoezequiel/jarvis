# Operações — Jarvis AIOS

Resumo de como operar o projeto localmente e passos importantes para desenvolvedores.

1) Verificações locais (TypeScript + lint)

  - Rodar verificação de tipos:

  ```powershell
  npm ci
  npm run typecheck
  ```

  - Lint (pode falhar dependendo das dependências instaladas):

  ```powershell
  npm run lint
  ```

2) Iniciar Next.js em modo dev

  ```powershell
  npm run dev
  # abre http://localhost:3000
  ```

3) Supabase local (opcional)

  - Recomendado usar a CLI do Supabase. Se você tiver a CLI instalada:

  ```powershell
  supabase start
  # quando terminar de trabalhar
  supabase stop
  ```

  - Se preferir, rode uma instância do Supabase via docker-compose (configurar compose separado).

4) Aplicar migrações (remoto ou local)

  - Migrar localmente (com supabase CLI linkada):

  ```powershell
  supabase db push
  ```

  - Para empurrar para o projeto remoto, exporte `SUPABASE_ACCESS_TOKEN` antes de usar `supabase`.

5) Worker e AIOS (simulação local)

  - O `jarvis-worker.js` e o serviço `aios` são scripts Node que POSTam para `/api/agent-execute`.
  - Em desenvolvimento apenas execute:

  ```powershell
  node jarvis-worker.js
  node src/aios/index.js
  ```

6) CI

  - A pipeline GitHub Actions roda `npm ci` + `npm run typecheck`.

7) Rotina de commits / branches

  - Trabalhe em branches `feature/*` e envie PR para `main`.

8) Contatos / chaves

  - Nunca comite `.env.local`.
  - Variáveis principais: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
