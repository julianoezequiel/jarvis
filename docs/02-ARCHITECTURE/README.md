# 🏗️ ARCHITECTURE — Design Técnico, Fluxos e Componentes

> Documentação focada no **COMO FUNCIONA**. Design técnico, arquitetura de sistema, fluxos de dados, componentes, decisões arquiteturais.
>
> **Público**: Engenheiros, Arquitetos, Tech Leads

---

## 📁 Conteúdo desta Pasta

```
02-ARCHITECTURE/
├── README.md                    ← Você está aqui
├── OVERVIEW.md                  ← Visão geral da arquitetura (diagrama + resumo)
├── ANALISE_DETALHADA.md         ← Análise completa (896 linhas)
├── DIAGRAMS.md                  ← Diagramas técnicos (ASCII, Mermaid)
├── DATABASE_SCHEMA.md           ← Schema Supabase (DDL, relações)
├── API_DESIGN.md                ← Design de APIs (REST, SSE, WebSocket)
├── DECISIONS.md                 ← Decisões arquiteturais (ADRs)
└── PATTERNS.md                  ← Padrões de design, SOLID, best practices
```

---

## Que Informações Estão Aqui?

| Documento | Descrição | Tempo | Público |
|---|---|---|---|
| **OVERVIEW.md** | Visão de 50 mil pés (diagrama, componentes) | 10–15 min | Todos |
| **ANALISE_DETALHADA.md** | **DEEP DIVE** — fluxos, camadas, patterns | 45–60 min | Engenheiros |
| **DIAGRAMS.md** | Diagramas técnicos (sistema, fluxos, DB) | 10–15 min | Visuals |
| **DATABASE_SCHEMA.md** | DDL SQL, relações, índices, RLS | 15–20 min | Backend devs |
| **API_DESIGN.md** | Design de REST, SSE, WebSocket, payloads | 20–30 min | Backend devs |
| **DECISIONS.md** | ADRs (Architecture Decision Records) | 15–20 min | Tech Leads |
| **PATTERNS.md** | TypeScript strict, SSE streaming, delegação | 20–30 min | Engenheiros |

---

## 🎯 Guia de Navegação

### "Como é que o sistema funciona?"
→ Leia **OVERVIEW.md** (15 min)

### "Qual é a arquitetura completa?"
→ Leia **ANALISE_DETALHADA.md** (60 min)

### "Quais são os fluxos de dados?"
→ Leia **DIAGRAMAS.md** (15 min)

### "Qual é o schema do banco?"
→ Leia **DATABASE_SCHEMA.md** (20 min)

### "Como são as APIs?"
→ Leia **API_DESIGN.md** (30 min)

### "Por que essa decisão foi tomada?"
→ Leia **DECISIONS.md** (20 min)

### "Quais são os padrões do projeto?"
→ Leia **PATTERNS.md** (30 min)

---

## 📊 Stack em Um Relance

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 15 + React + TypeScript + Tailwind CSS |
| **Backend** | Next.js Route Handlers (serverless) |
| **LLM** | Claude Sonnet 4.6 (Anthropic) |
| **Realtime** | OpenAI Realtime API (WebSocket, PCM16) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase RLS (Row Level Security) |
| **Deploy** | Vercel + GitHub |

---

## 🔗 Links Relacionados

- **Product Vision** → [`01-PRODUCT/VISION.md`](../01-PRODUCT/VISION.md)
- **Development** → [`03-DEVELOPMENT/`](../03-DEVELOPMENT/)
- **APIs** → [`04-API-REFERENCE/`](../04-API-REFERENCE/)

---

## 📝 Checklist para Arquiteto

- [ ] ANALISE_DETALHADA.md revisado
- [ ] Decisões arquiteturais documentadas (DECISIONS.md)
- [ ] Schema de banco revisado
- [ ] Padrões definidos e comunicados
- [ ] Diagramas atualizados

---

**Próximo**: Leia [`OVERVIEW.md`](./OVERVIEW.md) ou [`ANALISE_DETALHADA.md`](./ANALISE_DETALHADA.md) →

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: Engineering Team
