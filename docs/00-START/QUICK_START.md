# ⚡ Quick Start — Jarvis AIOS em 5 Minutos

> Se você tem 5 minutos, leia isto. Se tem 30 minutos, explore as outras pastas.

---

## ❓ O Que é Jarvis AIOS?

Um **assistente pessoal com IA** que orquestra **21 agentes autônomos Claude** para pesquisa, escrita, desenvolvimento, análise — tudo via um único chat + voz.

**Interface**: Cockpit estilo Iron Man (Tony Stark) — visualmente futurista, funcional, poderoso.

---

## 🎯 En 30 Segundos

| O Quê | Resposta |
|---|---|
| **Stack** | Next.js 15 + TypeScript + Claude API + OpenAI Realtime + Supabase + Vercel |
| **LLM** | Claude Sonnet 4.6 (Anthropic) para tudo |
| **Voz** | OpenAI Realtime (detecta "jarvis", fala 30s) — Chrome only |
| **BD** | Supabase PostgreSQL (memória, arquivos, conhecimento) |
| **Deploy** | Vercel (auto-deploy via GitHub) |
| **Agentes** | 21: AIOS Core (6) + Fábrica Rentável (15) |
| **Custo/mês** | ~$8–18 (pessoal) ou ~$50–100 (intenso) |

---

## 🚀 Comece Agora (3 passos)

### 1️⃣ Clone + Setup (5 min)
```bash
git clone https://github.com/seu-user/meu-jarvis.git
cd meu-jarvis
npm install

# Configure .env.local (veja 03-DEVELOPMENT/SETUP.md)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local
echo "OPENAI_API_KEY=sk-proj-..." >> .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://..." >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..." >> .env.local
```

### 2️⃣ Dev Server (2 min)
```bash
npm run dev
# Acessa localhost:3000
# Senha padrão: 1234
```

### 3️⃣ Explore (3 min)
- Digite algo no chat
- Diga "JARVIS" para voz (Chrome only)
- Veja os 21 agentes no painel direito

---

## 📚 Guias Essenciais por Audiência

### 👨‍💼 Product Manager / Stakeholder
**Leia**: [`01-PRODUCT/VISION.md`](../01-PRODUCT/VISION.md) (10 min)  
**Depois**: [`01-PRODUCT/ROADMAP.md`](../01-PRODUCT/ROADMAP.md) (15 min)

### 👨‍💻 Desenvolvedor
**Leia**: [`03-DEVELOPMENT/SETUP.md`](../03-DEVELOPMENT/SETUP.md) (5 min)  
**Depois**: [`03-DEVELOPMENT/QUICKSTART_DEV.md`](../03-DEVELOPMENT/QUICKSTART_DEV.md) (15 min)  
**Depois**: [`02-ARCHITECTURE/ANALISE_DETALHADA.md`](../02-ARCHITECTURE/ANALISE_DETALHADA.md) (30 min)

### 🏗️ Arquiteto / Tech Lead
**Leia**: [`02-ARCHITECTURE/OVERVIEW.md`](../02-ARCHITECTURE/OVERVIEW.md) (10 min)  
**Depois**: [`02-ARCHITECTURE/ANALISE_DETALHADA.md`](../02-ARCHITECTURE/ANALISE_DETALHADA.md) (60 min)

### 🚀 DevOps / Ops
**Leia**: [`05-DEPLOYMENT/VERCEL.md`](../05-DEPLOYMENT/VERCEL.md) (10 min)  
**Depois**: [`06-OPERATIONS/MONITORING.md`](../06-OPERATIONS/MONITORING.md) (15 min)

### 🆘 Suporte
**Leia**: [`06-OPERATIONS/TROUBLESHOOTING.md`](../06-OPERATIONS/TROUBLESHOOTING.md) (20 min)  
**Depois**: [`07-KNOWLEDGE-BASE/FAQ.md`](../07-KNOWLEDGE-BASE/FAQ.md) (10 min)

---

## 🧭 Mapa Mental

```
Você
 ├─ Quer entender o produto?
 │   └→ 01-PRODUCT/ (PRD, estratégia, roadmap)
 │
 ├─ Quer arquitetura técnica?
 │   └→ 02-ARCHITECTURE/ (design, fluxos, componentes)
 │
 ├─ Quer desenvolver?
 │   ├→ 03-DEVELOPMENT/SETUP.md (install)
 │   ├→ 03-DEVELOPMENT/QUICKSTART_DEV.md (primeiros passos)
 │   └→ 03-DEVELOPMENT/WORKFLOW_TASKS.md (fazer task)
 │
 ├─ Quer APIs?
 │   └→ 04-API-REFERENCE/ (endpoints, schemas)
 │
 ├─ Quer fazer deploy?
 │   └→ 05-DEPLOYMENT/ (Vercel, GitHub, runbooks)
 │
 ├─ Quer troubleshooting?
 │   └→ 06-OPERATIONS/ (logs, debugging, monitoring)
 │
 └─ Quer uma dúvida rápida?
     └→ 07-KNOWLEDGE-BASE/ (FAQ, glossário)
```

---

## ⚙️ Arquitetura em Diagrama

```
┌─────────────────────────────────────┐
│     VOCÊ (Chat + Voz)               │
│  "Analise o mercado SaaS..."        │
│  "JARVIS, qual é minha agenda?"     │
└────────────┬────────────────────────┘
             │
             ├─→ [TEXTO] /api/jarvis-chat (SSE) ← Claude Sonnet
             │                                     (streaming tokens)
             │
             ├─→ [VOZ] OpenAI Realtime WebSocket ← gpt-4o-realtime
             │                                     (PCM16, 30s)
             │
             └─→ [DELEGAÇÃO] /api/agent-execute
                  Promise.all(21 agentes)
                    ├─ @analyst (análise)
                    ├─ @developer (código)
                    ├─ @writer (conteúdo)
                    ├─ ... +18 agentes
                    └─ Todos em paralelo

                    ↓

              Supabase (PostgreSQL)
              ├─ jarvis_memory (conversas)
              ├─ user_facts (conhecimento sobre você)
              ├─ jarvis_files (arquivos entregues)
              ├─ agent_knowledge (conhecimento dos agentes)
              └─ oraculo_knowledge (pesquisa autônoma)
```

---

## 💾 Variáveis de Ambiente Essenciais

```bash
# Obrigatórias
ANTHROPIC_API_KEY=sk-ant-...                      # Claude API
OPENAI_API_KEY=sk-proj-...                        # Realtime API
NEXT_PUBLIC_SUPABASE_URL=https://...              # Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...              # Supabase anon key

# Opcionais
NEXT_PUBLIC_WAKE_WORD=jarvis                      # Padrão
NEXT_PUBLIC_JARVIS_VOICE=alloy                    # Echo, fable, onyx, nova
```

---

## 📦 Estrutura de Pastas (Resumida)

```
docs/
├── 00-START/               ← Entrada (você está aqui)
├── 01-PRODUCT/             ← Visão de produto, estratégia
├── 02-ARCHITECTURE/        ← Design técnico, fluxos
├── 03-DEVELOPMENT/         ← Setup, padrões, workflows
├── 04-API-REFERENCE/       ← Endpoints, schemas
├── 05-DEPLOYMENT/          ← Vercel, GitHub, infraestrutura
├── 06-OPERATIONS/          ← Troubleshooting, monitoramento
├── 07-KNOWLEDGE-BASE/      ← FAQs, glossário
└── 99-ARCHIVE/             ← Templates, histórico
```

---

## ✅ Checklist: Você Está Pronto?

- [ ] Clonou o repositório
- [ ] Instalou dependências (`npm install`)
- [ ] Configurou `.env.local` (4 chaves obrigatórias)
- [ ] Rodou `npm run dev`
- [ ] Acessou `localhost:3000` (senha: 1234)
- [ ] Enviou uma mensagem no chat
- [ ] Explorou os padrões de desenvolvimento (deixa para depois 😄)

---

## 🔗 Próximo Passo

- **Developer** → [`03-DEVELOPMENT/QUICKSTART_DEV.md`](../03-DEVELOPMENT/QUICKSTART_DEV.md)
- **PM / Stakeholder** → [`01-PRODUCT/VISION.md`](../01-PRODUCT/VISION.md)
- **Arquiteto** → [`02-ARCHITECTURE/OVERVIEW.md`](../02-ARCHITECTURE/OVERVIEW.md)
- **Qualquer um** → [README.md](./README.md) (navegação completa)

---

**⏱️ Tempo até agora**: ~5 minutos  
**Próximo ciclo**: 15–30 minutos de documentação específica  
**Pronto para codar**: ✅ Sim!

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10
