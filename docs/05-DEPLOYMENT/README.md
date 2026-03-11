# Deployment — Overview

Este documento descreve como implantar o Jarvis localmente (desenvolvimento) e on‑premise (produção leve) usando Docker Compose. Contém links para runbooks e arquivos de exemplo.

## Conteúdo

- `runbooks/DEPLOY_ON_PREMISE.md` — passo a passo on‑premise (Docker Compose, envs, healthchecks).
- `.env.example` — variáveis de ambiente (na raiz do repositório).

## Requisitos básicos

- Docker & Docker Compose
- Node.js (para rodar localmente sem container)
- chaves de API (Anthropic, OpenAI) — veja `.env.example`

Nota: Este projeto requer Node.js >= 18.18.0 para executar o frontend Next.js (Next v15). Use `nvm`/`nvm-windows` para gerenciar versões locais. Um arquivo `.nvmrc` com `18.18.0` foi adicionado ao repositório.

## Como instalar Node.js (Windows - nvm-windows)

Recomendamos usar `nvm-windows` para gerenciar versões do Node em Windows.

1. Baixe o instalador do nvm-windows: https://github.com/coreybutler/nvm-windows/releases
2. Execute o instalador (MSI) e siga as instruções.
3. Abra um novo PowerShell e instale a versão recomendada:

```powershell
nvm install 18.18.0
nvm use 18.18.0
node -v
```

4. Se preferir, instale Node diretamente do site oficial: https://nodejs.org/en/download/ (recomenda-se LTS/18.x ou 20.x).

Observação: após trocar a versão do Node, rode `npm ci` (ou `npm install`) na raiz do projeto para instalar dependências compatíveis.


## Desenvolvimento local (rápido)

1. Copie o exemplo de env:

```powershell
copy .env.example .env.local
```

2. Preencha as chaves em `.env.local`.

3. Instale dependências e rode em modo dev:

```bash
npm install
npm run dev
```

4. Abra `http://localhost:3000`.

## Produção on‑premise (resumido)

Use o runbook detalhado em `runbooks/DEPLOY_ON_PREMISE.md` para os comandos completos e verificação de healthchecks.

---
Se quiser, eu posso gerar um `docker-compose.onpremise.yml` exemplo e um script PowerShell `startup_onpremise_run.ps1` compatível com o runbook. Deseja que eu gere estes também?
# 🚀 DEPLOYMENT — Vercel, GitHub, Infraestrutura

> Documentação focada em **COMO FAZER DEPLOY**. Configuração Vercel, GitHub integration, CI/CD, ambiente de produção, runbooks.
>
> **Público**: DevOps, Tech Leads, Release Managers

---

## 📁 Conteúdo desta Pasta

```
05-DEPLOYMENT/
├── README.md                    ← Você está aqui
├── VERCEL.md                    ← Deploy em Vercel (configuração, troubleshooting)
├── GITHUB_INTEGRATION.md        ← GitHub Actions, webhooks, auto-deploy
├── ENV_VARS.md                  ← Variáveis de ambiente por stage
├── SCALING.md                   ← Escalabilidade, caching, optimization
├── MONITORING.md                ← Logs, métricas, alertas
├── RUNBOOKS.md                  ← Procedimentos (hot-fix, rollback, etc)
├── DISASTER_RECOVERY.md         ← Backup, restore, continuidade
├── SECURITY.md                  ← HTTPS, CORS, secrets management
└── scripts/
    ├── deploy.sh                ← Script deploy automático
    ├── health-check.sh          ← Health check pós-deploy
    └── rollback.sh              ← Rollback automático
```

---

## Que Informações Estão Aqui?

| Documento | Descrição | Tempo | Público |
|---|---|---|---|
| **VERCEL.md** | Configuração Vercel, funções, serverless | 20–30 min | DevOps |
| **GITHUB_INTEGRATION.md** | GitHub Actions, webhooks, auto-deploy | 20–30 min | DevOps |
| **ENV_VARS.md** | Secrets, vars por stage (dev/staging/prod) | 15–20 min | DevOps |
| **SCALING.md** | Escalabilidade, caching, CDN, rate limits | 30–45 min | Arch, DevOps |
| **MONITORING.md** | Logs (Vercel), métricas (Datadog), alertas | 20–30 min | Ops |
| **RUNBOOKS.md** | Procedimentos (deploy, rollback, incident) | 20–30 min | Ops |
| **DISASTER_RECOVERY.md** | Backups, restore, RTO/RPO | 20–30 min | DevOps |
| **SECURITY.md** | HTTPS, CORS, secrets, compliance | 20–30 min | Security, DevOps |

---

## 🎯 Guia de Navegação

### "Como deploy em Vercel?"
→ Leia **VERCEL.md** (30 min)

### "Como GitHub auto-deploya?"
→ Leia **GITHUB_INTEGRATION.md** (30 min)

### "Qual é o env var para X?"
→ Leia **ENV_VARS.md** (20 min)

### "Como escalo o sistema?"
→ Leia **SCALING.md** (45 min)

### "Como monitoro produção?"
→ Leia **MONITORING.md** (30 min)

### "Como rollback?"
→ Leia **RUNBOOKS.md** (30 min)

### "Como faço restore de dados?"
→ Leia **DISASTER_RECOVERY.md** (30 min)

---

## 🚀 Deploy em 3 Passos

### 1️⃣ Configure Vercel
```bash
npm install -g vercel
vercel link              # Conecta ao projeto
vercel env pull          # Puxa env vars
```

### 2️⃣ Adicione Secrets (Vercel Dashboard)
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3️⃣ Push para Main
```bash
git push origin main    # Vercel auto-deploya em ~30s
```

---

## 📊 Deploy Pipeline

```
git push main
  ↓
GitHub webhook
  ↓
Vercel auto-build
  ├─ npm install
  ├─ npm run build
  └─ Static + API routes
  ↓
Deploy to CDN + Serverless
  ├─ Vercel Edge Network
  ├─ 100+ datacenters globais
  └─ Auto-scaling, auto-SSL
  ↓
Health check
  ├─ GET /api/health
  ├─ Test critical endpoints
  └─ Alertas se falhar
  ↓
Production live ✅
```

---

## 📈 Monitoramento Post-Deploy

| Métrica | Normal | Warning | Critical |
|---|---|---|---|
| **Response Time** | <200ms | 200–500ms | >500ms |
| **Error Rate** | <0.1% | 0.1–1% | >1% |
| **CPU** | <50% | 50–80% | >80% |
| **Memory** | <60% | 60–85% | >85% |

---

## 🔗 Links Relacionados

- **Development** → [`03-DEVELOPMENT/`](../03-DEVELOPMENT/)
- **Operations** → [`06-OPERATIONS/`](../06-OPERATIONS/)
- **Architecture** → [`02-ARCHITECTURE/`](../02-ARCHITECTURE/)

---

## 📝 Checklist para Deploy

- [ ] Todas as features em `main` branch
- [ ] Tests passando (`npm test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Env vars configurados em Vercel
- [ ] GitHub auto-deploy ativo
- [ ] Health check respondendo
- [ ] Monitoring alerts configurados
- [ ] Rollback plan documentado

---

## 🚨 Emergency Deploy

```bash
# Hot-fix em produção
git checkout main
git pull origin main
git checkout -b hotfix/ISSUE-NAME

# Faz fix
git commit -m "fix: description"
git push origin hotfix/ISSUE-NAME

# PR + merge fast
# Vercel redeploya em ~30s

# Se tudo quebrar → rollback
vercel rollback
```

---

**Próximo**: Leia [`VERCEL.md`](./VERCEL.md) →

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: DevOps Team
