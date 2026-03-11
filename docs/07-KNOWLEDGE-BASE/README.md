# 📚 KNOWLEDGE-BASE — FAQs, Glossário, Links Úteis

> Documentação focada em **RESPOSTAS RÁPIDAS**. FAQs, glossário de termos, links úteis, recursos externos, guias de referência.
>
> **Público**: Todos

---

## 📁 Conteúdo desta Pasta

```
07-KNOWLEDGE-BASE/
├── README.md                    ← Você está aqui
├── FAQ.md                       ← Perguntas frequentes e respostas
├── GLOSSARIO.md                 ← Glossário de termos Jarvis AIOS
├── LINKS.md                     ← Links úteis (docs, APIs, ferramentas)
├── CHECKLISTS.md                ← Checklists rápidas (setup, deploy, etc)
├── TEMPLATES.md                 ← Templates de código, messages, PRs
├── RESOURCES.md                 ← Recursos externos (artigos, vídeos)
├── SHORTCUTS.md                 ← Atalhos CLI, scripts, comandos úteis
└── community/
    └── CONTRIBUTING.md          ← Como contribuir para os docs
```

---

## Que Informações Estão Aqui?

| Documento | Descrição | Tempo | Público |
|---|---|---|---|
| **FAQ.md** | Perguntas frequentes + respostas | 10–15 min | Todos |
| **GLOSSARIO.md** | Termos técnicos explicados | 10–15 min | Todos |
| **LINKS.md** | Links para docs, APIs, ferramentas | 5–10 min | Todos |
| **CHECKLISTS.md** | Checklists (setup, deploy, PR, task) | 5–10 min | Todos |
| **TEMPLATES.md** | Snippets de código, PRs, issues | 10–15 min | Devs |
| **RESOURCES.md** | Artigos, vídeos, tutoriais | 15–30 min | Todos |
| **SHORTCUTS.md** | Comandos CLI, scripts úteis | 10–15 min | Devs |
| **CONTRIBUTING.md** | Como contribuir para docs | 10–15 min | Devs |

---

## 🎯 Guia de Navegação

### "Tenho uma dúvida rápida..."
→ Leia **FAQ.md** (15 min)

### "O que é 'X' neste projeto?"
→ Leia **GLOSSARIO.md** (15 min)

### "Como faço Y?"
→ Leia **CHECKLISTS.md** (10 min) ou **SHORTCUTS.md** (15 min)

### "Tem um template de código?"
→ Leia **TEMPLATES.md** (15 min)

### "Onde está a doc de X?"
→ Leia **LINKS.md** (10 min)

### "Como contribuo para docs?"
→ Leia **CONTRIBUTING.md** (15 min)

---

## ❓ FAQ Rápido (Top 5)

### 1. "O Jarvis AIOS é open source?"
**Resposta**: Não. É propriedade privada. Não faça fork público.

### 2. "Posso usar X LLM instead de Claude?"
**Resposta**: Sistema é feito para Claude Sonnet 4.6. Outras LLMs não testadas.

### 3. "Qual é a senha do cockpit?"
**Resposta**: "1234" (padrão, configurável via env var).

### 4. "Se der erro, para quem seguro?"
**Resposta**: Leia [`06-OPERATIONS/TROUBLESHOOTING.md`](../06-OPERATIONS/TROUBLESHOOTING.md) primeiro. Depois contate um tech lead.

### 5. "Como contribuo com código?"
**Resposta**: Siga fluxo em [`03-DEVELOPMENT/WORKFLOW_TASKS.md`](../03-DEVELOPMENT/WORKFLOW_TASKS.md). Depois leia [`CONTRIBUTING.md`](./CONTRIBUTING.md).

→ Veja **FAQ.md** para mais...

---

## 📖 Glossário (Top 10 Termos)

| Termo | Definição |
|---|---|
| **JARVIS** | Jarvis AI Operating System — o projeto |
| **Cockpit** | A UI principal (estilo Iron Man) |
| **Agente** | Um Claude especializado em um domínio (@analyst, @developer, etc) |
| **Delegação** | Passar uma task de um agente para outro (`[DELEGATE: {...}]`) |
| **SSE** | Server-Sent Events — streaming de tokens via HTTP |
| **Wake Word** | "JARVIS" — palavra que ativa a voz |
| **Realtime** | OpenAI Realtime API — para fala/voz em tempo real |
| **ORÁCULO** | Worker autônomo que roda a cada 3 minutos |
| **Brief** | Resumo gerado pelo worker (project_name: "💡 BRIEF-Autônomo") |
| **RLS** | Row Level Security — isolamento de dados no Supabase |

→ Veja **GLOSSARIO.md** para mais...

---

## 🔗 Links Essenciais

### Documentação Interna
- **Visão de Produto** → [`01-PRODUCT/VISION.md`](../01-PRODUCT/VISION.md)
- **Arquitetura** → [`02-ARCHITECTURE/ANALISE_DETALHADA.md`](../02-ARCHITECTURE/ANALISE_DETALHADA.md)
- **Setup de Dev** → [`03-DEVELOPMENT/SETUP.md`](../03-DEVELOPMENT/SETUP.md)
- **APIs** → [`04-API-REFERENCE/ENDPOINTS.md`](../04-API-REFERENCE/ENDPOINTS.md)
- **Deploy** → [`05-DEPLOYMENT/VERCEL.md`](../05-DEPLOYMENT/VERCEL.md)
- **Troubleshooting** → [`06-OPERATIONS/TROUBLESHOOTING.md`](../06-OPERATIONS/TROUBLESHOOTING.md)

### APIs Externas
- **Claude API** → https://api.anthropic.com/docs
- **OpenAI Realtime** → https://platform.openai.com/docs/guides/realtime
- **Supabase** → https://supabase.com/docs

### Ferramentas
- **Vercel** → https://vercel.com/docs
- **Next.js** → https://nextjs.org/docs
- **TypeScript** → https://www.typescriptlang.org/docs

→ Veja **LINKS.md** para lista completa...

---

## ✅ Checklists Rápidas

### Setup Local
- [ ] Node.js v18+ instalado
- [ ] npm v9+ instalado
- [ ] Repo clonado
- [ ] `.env.local` com 4 chaves
- [ ] `npm install` OK
- [ ] `npm run dev` rodando
- [ ] Página carrega em localhost

### Antes de Fazer PR
- [ ] Código segue CONVENTIONS.md
- [ ] Tests passam (`npm test`)
- [ ] Build OK (`npm run build`)
- [ ] Não há `console.log` ou debug code
- [ ] Comentários em português ou inglês (consistente)
- [ ] Commit message segue padrão

### Antes de Deploy
- [ ] PR reviewado e aprovado
- [ ] Merge para `main`
- [ ] Vercel auto-build completou
- [ ] Health checks passaram
- [ ] Monitoramento verificado

→ Veja **CHECKLISTS.md** para mais...

---

## 🔗 Links Relacionados

- **Estrutura de Pastas** → [00-START/ESTRUTURA_PASTAS.md](../00-START/ESTRUTURA_PASTAS.md)
- **Quick Start** → [00-START/QUICK_START.md](../00-START/QUICK_START.md)
- **Contribution** → [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## 📝 Checklist para Knowledge-Base

- [ ] FAQ.md atualizado
- [ ] GLOSSARIO.md tem todos termos críticos
- [ ] LINKS.md lista todas as docs internas
- [ ] CHECKLISTS.md cobre fluxos comuns
- [ ] TEMPLATES.md tem exemplos úteis
- [ ] SHORTCUTS.md tem comandos frequentes
- [ ] CONTRIBUTING.md claro

---

## 💡 Dica: Busque Aqui Primeiro!

Antes de fazer uma dúvida:
1. Procure em **FAQ.md**
2. Procure em **GLOSSARIO.md**
3. Procure em **SHORTCUTS.md**
4. Procure em [00-START/README.md](../00-START/README.md) (navegação)

Provavelmente encontra a resposta! 😄

---

**Próximo**: Leia [`FAQ.md`](./FAQ.md) →

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: Community
