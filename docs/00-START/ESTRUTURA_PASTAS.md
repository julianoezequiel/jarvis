# 🗺️ ESTRUTURA_PASTAS — Mapa Completo da Documentação

> Guia de todas as 9 pastas de documentação do Jarvis AIOS, com descrição, conteúdo esperado, público-alvo.

---

## 📊 Resumo Visual

```
docs/
├── 00-START/                    ← ENTRADA (você começa aqui)
│   ├── README.md                ← Navegação principal
│   ├── QUICK_START.md           ← 5 minutos resumo
│   ├── INDEX.md                 ← Índice detalhado
│   └── ESTRUTURA_PASTAS.md      ← Você está aqui
│
├── 01-PRODUCT/                  ← O QUÊ e POR QUÊ
│   ├── README.md
│   ├── VISION.md                ← Visão de produto
│   ├── PRD.md                   ← Product Requirements
│   ├── ROADMAP.md               ← Plano de evolução
│   ├── USE_CASES.md             ← Personas, histórias
│   ├── MARKET_ANALYSIS.md       ← Análise de mercado
│   ├── MONETIZATION.md          ← Modelos de receita
│   └── COMPETITIVE_ANALYSIS.md  ← Competitive landscape
│
├── 02-ARCHITECTURE/             ← COMO FUNCIONA (Design técnico)
│   ├── README.md
│   ├── OVERVIEW.md              ← Visão 50k feet
│   ├── ANALISE_DETALHADA.md     ← DEEP DIVE (896 linhas)
│   ├── DIAGRAMS.md              ← Diagramas técnicos
│   ├── DATABASE_SCHEMA.md       ← DDL Supabase
│   ├── API_DESIGN.md            ← REST, SSE, WebSocket
│   ├── DECISIONS.md             ← ADRs (decisões)
│   └── PATTERNS.md              ← Padrões de design
│
├── 03-DEVELOPMENT/              ← COMO FAZER (Desenvolvimento)
│   ├── README.md
│   ├── SETUP.md                 ← Install local
│   ├── QUICKSTART_DEV.md        ← Primeiros passos
│   ├── WORKFLOW_TASKS.md        ← Workflow tasks
│   ├── CONVENTIONS.md           ← Padrões de código
│   ├── TESTING.md               ← Unit, integration, E2E
│   ├── DEBUGGING.md             ← Debug local
│   ├── GIT_WORKFLOW.md          ← Branches, PRs, commits
│   ├── templates/
│   │   ├── ANDAMENTO.md         ← Task progress template
│   │   ├── ANALISE.md           ← Task analysis template
│   │   └── CRITERIOS_ACEITE.md  ← Acceptance criteria template
│   └── tools/
│       └── setup.sh             ← Auto-setup script
│
├── 04-API-REFERENCE/            ← COMO USAR AS APIs
│   ├── README.md
│   ├── ENDPOINTS.md             ← Todos endpoints
│   ├── AUTHENTICATION.md        ← Auth, headers
│   ├── PAYLOADS.md              ← Request/response
│   ├── ERRORS.md                ← Status codes, errors
│   ├── EXAMPLES.md              ← cURL, fetch, Postman
│   ├── WEBSOCKET.md             ← Realtime WebSocket
│   ├── SSE.md                   ← Server-Sent Events
│   ├── RATE_LIMITING.md         ← Quotas, throttling
│   ├── schemas/                 ← JSON schemas
│   │   ├── ChatMessage.json
│   │   ├── DelegateCommand.json
│   │   └── ...
│   └── postman/
│       └── PontoCore_API.postman_collection.json
│
├── 05-DEPLOYMENT/               ← COMO FAZER DEPLOY
│   ├── README.md
│   ├── VERCEL.md                ← Vercel config
│   ├── GITHUB_INTEGRATION.md    ← GitHub Actions, webhooks
│   ├── ENV_VARS.md              ← Secrets por stage
│   ├── SCALING.md               ← Escalabilidade
│   ├── MONITORING.md            ← Logs, métricas, alertas
│   ├── RUNBOOKS.md              ← Deploy, rollback procedures
│   ├── DISASTER_RECOVERY.md     ← Backup, restore
│   ├── SECURITY.md              ← HTTPS, CORS, secrets
│   └── scripts/
│       ├── deploy.sh            ← Auto-deploy
│       ├── health-check.sh      ← Health check
│       └── rollback.sh          ← Auto-rollback
│
├── 06-OPERATIONS/               ← QUANDO DÁ ERRADO (Troubleshooting)
│   ├── README.md
│   ├── TROUBLESHOOTING.md       ← Problemas comuns
│   ├── MONITORING.md            ← Logs, alertas
│   ├── INCIDENT_RESPONSE.md     ← Como responder
│   ├── DEBUGGING.md             ← Debug produção
│   ├── PERFORMANCE.md           ← Profiling, otimização
│   ├── SCALING_OPS.md           ← Escalabilidade ops
│   ├── BACKUP_RESTORE.md        ← Backup/restore
│   ├── MAINTENANCE.md           ← Manutenção, upgrades
│   ├── RUNBOOKS.md              ← Procedimentos
│   └── dashboards/
│       └── GRAFANA.md           ← Grafana dashboards
│
├── 07-KNOWLEDGE-BASE/           ← RESPOSTAS RÁPIDAS
│   ├── README.md
│   ├── FAQ.md                   ← Perguntas frequentes
│   ├── GLOSSARIO.md             ← Glossário de termos
│   ├── LINKS.md                 ← Links úteis
│   ├── CHECKLISTS.md            ← Checklists rápidas
│   ├── TEMPLATES.md             ← Snippets, templates
│   ├── RESOURCES.md             ← Artigos, vídeos
│   ├── SHORTCUTS.md             ← CLI commands, scripts
│   └── community/
│       └── CONTRIBUTING.md      ← Como contribuir
│
└── 99-ARCHIVE/                  ← HISTÓRICO (Read-only)
    ├── README.md
    ├── HISTORIA_PROJETO.md      ← Timeline de mudanças
    ├── TEMPLATES_ANTIGOS/       ← Templates descontinuados
    ├── DEPRECATED_DOCS/         ← Docs legadas
    ├── RELEASES/                ← Release notes
    │   ├── v0.1-alpha.md
    │   ├── v0.5-beta.md
    │   └── v1.0-stable.md
    └── DECISIONS_REJECTED/      ← Decisões rejeitadas
```

---

## 📍 As 9 Pastas Explicadas

### 00-START — 🚪 Entrada

| Item | Descrição |
|---|---|
| **Descrição** | Ponto de entrada principal. Navegação, guias rápidos, índices. |
| **Público** | Todos |
| **Tempo** | 5–15 minutos |
| **Conteúdo** | README (navegação), QUICK_START (resumo 5min), INDEX (índice detalhado), ESTRUTURA_PASTAS (este arquivo) |
| **Quando usar** | Primeiro acesso ao projeto, procurando onde ir |

### 01-PRODUCT — 🎯 Visão de Produto

| Item | Descrição |
|---|---|
| **Descrição** | O QUÊ é Jarvis AIOS, por quê, para quem, estratégia, roadmap. |
| **Público** | PMs, Stakeholders, Executivos |
| **Tempo** | 15–60 minutos |
| **Conteúdo** | VISION, PRD, ROADMAP, USE_CASES, análises (market, monetization, competitive) |
| **Quando usar** | Entender visão, estratégia, plano de evolução |

### 02-ARCHITECTURE — 🏗️ Design Técnico

| Item | Descrição |
|---|---|
| **Descrição** | COMO FUNCIONA. Design de sistema, fluxos, componentes, padrões, decisões. |
| **Público** | Engenheiros, Arquitetos, Tech Leads |
| **Tempo** | 30–90 minutos |
| **Conteúdo** | OVERVIEW, ANALISE_DETALHADA (896 lin), DIAGRAMS, DATABASE_SCHEMA, API_DESIGN, DECISIONS, PATTERNS |
| **Quando usar** | Implementar features, refatorar, entender arquitetura, fazer decisões |

### 03-DEVELOPMENT — 💻 Desenvolvimento

| Item | Descrição |
|---|---|
| **Descrição** | COMO FAZER. Setup, padrões, workflows, testes, debugging. |
| **Público** | Desenvolvedores, Tech Leads |
| **Tempo** | 30–120 minutos |
| **Conteúdo** | SETUP, QUICKSTART_DEV, WORKFLOW_TASKS, CONVENTIONS, TESTING, DEBUGGING, GIT_WORKFLOW + templates |
| **Quando usar** | Setup local, fazer task, entender padrões, fazer PR |

### 04-API-REFERENCE — 🔌 APIs

| Item | Descrição |
|---|---|
| **Descrição** | COMO USAR AS APIs. Endpoints, schemas, payloads, exemplos. |
| **Público** | Desenvolvedores, Integradores, QA |
| **Tempo** | 15–45 minutos |
| **Conteúdo** | ENDPOINTS, AUTHENTICATION, PAYLOADS, ERRORS, EXAMPLES, WEBSOCKET, SSE + schemas + Postman |
| **Quando usar** | Chamar API, integrar, testar, documentar |

### 05-DEPLOYMENT — 🚀 Deploy

| Item | Descrição |
|---|---|
| **Descrição** | COMO FAZER DEPLOY. Vercel, GitHub, infraestrutura, scaling, security. |
| **Público** | DevOps, Tech Leads, Release Managers |
| **Tempo** | 30–120 minutos |
| **Conteúdo** | VERCEL, GITHUB_INTEGRATION, ENV_VARS, SCALING, MONITORING, RUNBOOKS, DISASTER_RECOVERY, SECURITY + scripts |
| **Quando usar** | Setup deploy, fazer release, scaling, hot-fix |

### 06-OPERATIONS — 🛠️ Operações

| Item | Descrição |
|---|---|
| **Descrição** | QUANDO DÁ ERRADO. Troubleshooting, monitoring, incident response, maintenance. |
| **Público** | Operations, SRE, Suporte, Tech Leads |
| **Tempo** | 20–90 minutos |
| **Conteúdo** | TROUBLESHOOTING, MONITORING, INCIDENT_RESPONSE, DEBUGGING, PERFORMANCE, SCALING_OPS, BACKUP_RESTORE, MAINTENANCE, RUNBOOKS |
| **Quando usar** | Problema em produção, monitoring, maintenance, incident |

### 07-KNOWLEDGE-BASE — 📚 Base de Conhecimento

| Item | Descrição |
|---|---|
| **Descrição** | RESPOSTAS RÁPIDAS. FAQs, glossário, links, checklists, templates. |
| **Público** | Todos |
| **Tempo** | 5–30 minutos |
| **Conteúdo** | FAQ, GLOSSARIO, LINKS, CHECKLISTS, TEMPLATES, RESOURCES, SHORTCUTS, CONTRIBUTING |
| **Quando usar** | Dúvida rápida, procura resposta, busca link, usa template |

### 99-ARCHIVE — 📦 Histórico

| Item | Descrição |
|---|---|
| **Descrição** | REFERÊNCIA. Templates antigos, docs legadas, release notes, decisões rejeitadas. |
| **Público** | Referência (não ativo) |
| **Tempo** | N/A (referência) |
| **Conteúdo** | HISTORIA_PROJETO, TEMPLATES_ANTIGOS, DEPRECATED_DOCS, RELEASES, DECISIONS_REJECTED |
| **Quando usar** | Entender evolução, aprender de decisões antigas |

---

## 🎯 Fluxos de Navegação Típicos

### Flow 1: Novo Developer
```
00-START/README.md
  ↓
00-START/QUICK_START.md
  ↓
03-DEVELOPMENT/SETUP.md
  ↓
03-DEVELOPMENT/QUICKSTART_DEV.md
  ↓
03-DEVELOPMENT/WORKFLOW_TASKS.md (quando fizer primeira task)
  ↓
02-ARCHITECTURE/ANALISE_DETALHADA.md (quando tiver tempo)
```

### Flow 2: PM / Stakeholder
```
00-START/QUICK_START.md
  ↓
01-PRODUCT/VISION.md
  ↓
01-PRODUCT/ROADMAP.md (para timeline)
  ↓
01-PRODUCT/USE_CASES.md (para personas)
  ↓
05-DEPLOYMENT/VERCEL.md (quando fizer release)
```

### Flow 3: Arquiteto / Tech Lead
```
00-START/QUICK_START.md
  ↓
02-ARCHITECTURE/OVERVIEW.md
  ↓
02-ARCHITECTURE/ANALISE_DETALHADA.md (deep dive)
  ↓
02-ARCHITECTURE/DECISIONS.md (decisões)
  ↓
03-DEVELOPMENT/CONVENTIONS.md (for code quality)
```

### Flow 4: Problema em Produção
```
06-OPERATIONS/TROUBLESHOOTING.md
  ↓
06-OPERATIONS/DEBUGGING.md (se não encontrar)
  ↓
06-OPERATIONS/MONITORING.md (para verificar métricas)
  ↓
06-OPERATIONS/INCIDENT_RESPONSE.md (se crítico)
```

---

## 📊 Matriz: Quem Lê O Quê?

| Pasta | Dev | PM | Arch | Ops | QA | Suporte |
|---|---|---|---|---|---|---|
| **00-START** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **01-PRODUCT** | ◐ | ✅ | ◐ | ◐ | ◐ | ◐ |
| **02-ARCHITECTURE** | ✅ | ◐ | ✅ | ◐ | ◐ | ◐ |
| **03-DEVELOPMENT** | ✅ | ◐ | ✅ | ◐ | ✅ | ◐ |
| **04-API-REFERENCE** | ✅ | ◐ | ◐ | ✅ | ✅ | ◐ |
| **05-DEPLOYMENT** | ◐ | ◐ | ✅ | ✅ | ◐ | ◐ |
| **06-OPERATIONS** | ◐ | ◐ | ◐ | ✅ | ✅ | ✅ |
| **07-KNOWLEDGE-BASE** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **99-ARCHIVE** | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |

**Legenda**: ✅ Leitura essencial, ◐ Leitura opcional

---

## 🔗 Hierarquia de Docs Canonical

Arquivos que são **source of truth** (sincronizados automaticamente):

```
.github/
├── copilot-instructions.md                   ← GitHub config
└── instructions/
    ├── domain-knowledge.instructions.md      ← Carregado em todos contextos
    ├── task-workflow-migracao.instructions.md ← Workflow obrigatório
    └── domain-knowledge.jarvis.md            ← Quick ref (mirror)

docs/
├── 02-ARCHITECTURE/ANALISE_DETALHADA.md     ← Master de arquitetura
├── 03-DEVELOPMENT/WORKFLOW_TASKS.md         ← Workflow tasks (mirror)
└── ...
```

**Regra**: Se mudar algo crítico, atualiza `.github/instructions/` primeiro, depois `docs/`.

---

## ✅ Checklist: Estrutura Completa?

- [x] 00-START.README criado (navegação principal)
- [x] 01-PRODUCT.README criado (visão de produto)
- [x] 02-ARCHITECTURE.README criado (design técnico)
- [x] 03-DEVELOPMENT.README criado (desenvolvimento)
- [x] 04-API-REFERENCE.README criado (APIs)
- [x] 05-DEPLOYMENT.README criado (deploy)
- [x] 06-OPERATIONS.README criado (troubleshooting)
- [x] 07-KNOWLEDGE-BASE.README criado (FAQs, etc)
- [x] 99-ARCHIVE.README criado (histórico, read-only)
- [x] Este arquivo (ESTRUTURA_PASTAS.md) criado

**Status**: ✅ COMPLETO — 9 pastas prontas, 9 READMEs criados, estrutura profissional PO-style!

---

## 🚀 Próximo Passo

Você está pronto! Comece por:
1. **Novo developer?** → [`00-START/QUICK_START.md`](./QUICK_START.md)
2. **Rápido overview?** → [`00-START/README.md`](./README.md) (navegação)
3. **PM/Stakeholder?** → [`01-PRODUCT/VISION.md`](../01-PRODUCT/VISION.md)
4. **Arquiteto?** → [`02-ARCHITECTURE/ANALISE_DETALHADA.md`](../02-ARCHITECTURE/ANALISE_DETALHADA.md)

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Mantido por**: Documentation Team
