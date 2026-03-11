# Runbook — Deploy On‑Premise (Docker Compose)

Este runbook guia a implantação do Jarvis em um servidor on‑premise usando Docker Compose. É pensado para ambientes pequenos/dev e não substitui práticas avançadas de produção (orquestração, segredos gerenciados, CI/CD).

## Pré-requisitos

- Docker Engine instalado
- Docker Compose (v2+) ou `docker compose` integrado
- Variáveis de ambiente preenchidas em `.env.onpremise` (ex.: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Estrutura sugerida de arquivos

- `docker-compose.onpremise.yml` — compose contendo serviços: `web` (Next.js), `supabase` (ou externo), `minio`, `redis`, `rabbitmq`.
- `.env.onpremise` — arquivo com variáveis de ambiente sensíveis (não commitar).
- `startup_onpremise_run.ps1` — script PowerShell para iniciar a stack e verificar healthchecks.

## Passo a passo

1) Criar/atualizar `.env.onpremise` com as variáveis necessárias. Exemplo mínimo (não commitar):

```text
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase.example
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_REALTIME_MODEL=gpt-4o-realtime-preview
```

2) Colocar `docker-compose.onpremise.yml` na raiz. Exemplo rápido (substitua imagens/versões conforme necessário):

```yaml
version: '3.8'
services:
  web:
    image: node:20
    working_dir: /app
    volumes:
      - ./:/app
    command: sh -c "npm ci && npm run build && npm start"
    ports:
      - "3000:3000"
    env_file: .env.onpremise
    depends_on:
      - redis
      - minio

  redis:
    image: redis:7
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  minio:
    image: minio/minio
    command: server /data
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    ports:
      - "9000:9000"

  # Opção: self-hosted Supabase (Postgres + API) ou usar hosted Supabase

```

3) Iniciar a stack:

```powershell
docker compose -f docker-compose.onpremise.yml up -d
```

4) Verificar logs e healthchecks:

```powershell
docker compose -f docker-compose.onpremise.yml ps
docker compose -f docker-compose.onpremise.yml logs -f web
```

5) Testar endpoints básicos (ex.: healthcheck Next.js /actuator ou rota custom):

```powershell
curl http://localhost:3000/api/health || curl http://localhost:3000/actuator/health
```

## Atualização e rollback

- Para atualizar a aplicação: pare o serviço `web`, puxe as mudanças do repositório e reinicie o serviço (ou redeploy via CI).

```powershell
git pull
docker compose -f docker-compose.onpremise.yml up -d --build web
```

- Para rollback: restaure a versão desejada do repositório (ex.: `git checkout <tag>`) e rode o rebuild.

## Observações e boas práticas

- Não deixar chaves sensíveis no repositório — use Vault ou secrets managers para produção.
- Configure rotinas de backups para `supabase`/Postgres e `minio`.
- Monitore uso de CPU/memória do `web` e do `redis`.

## Supabase local (opções)

Você pode escolher entre usar o Supabase hospedado (mais simples) ou rodar uma instância local para desenvolvimento.

- Opção A — Supabase hospedado: preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores do dashboard (mais simples para dev).

- Opção B — Supabase local via Supabase CLI (recomendado para desenvolvimento offline):
  1. Instale o CLI: `npm install -g supabase` ou consulte https://supabase.com/docs/guides/cli
  2. No diretório do projeto execute `supabase start` — o CLI levantará Postgres, API e Realtime em portas locais (por exemplo: Postgres 5432, API 54321).
  3. Atualize o arquivo `.env.onpremise` com:

```text
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-provided-by-supabase-cli-or-dashboard>
```

  4. O frontend acessará o Supabase via `http://localhost:54321` — não use `http://supabase:5432` porque esse host só é resolvível entre containers.

Observação: o Supabase local gerado pelo CLI fornece as chaves (anon + service_role) no terminal/arquivos gerados; copie a `anon` key para `.env.onpremise` para testes no navegador.

## Onde entra o serviço AIOS?

AIOS (os agentes especializados) podem ser executados de duas formas na arquitetura de container:

1. Servidor/Worker dedicado (recomendado): crie um container separado `aios` ou rode as responsabilidades dentro do `jarvis-worker`.
   - Vantagens: isolamento, escalabilidade independente, controle de recursos e reinício separado.
   - Exemplo de serviço (opcional) para `docker-compose.onpremise.yml`:

```yaml
  aios:
    image: node:20
    working_dir: /app
    volumes:
      - ./:/app:cached
    command: sh -c "npm ci --silent && node src/aios/index.js"
    env_file:
      - .env.onpremise
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
```

2. Integração no `web`/server (menos recomendado): executa agentes como parte do processo web (mais simples para prototipagem, porém compartilha recursos e faz o web depender de tarefas longas).

Recomendação: comece rodando os agentes no `jarvis-worker` ou em um container `aios` separado. Quando precisar de mais throughput, escale o serviço `aios` em múltiplas réplicas.


---
_Este runbook é um ponto de partida. Posso gerar `docker-compose.onpremise.yml` e `startup_onpremise_run.ps1` concretos se quiser._
