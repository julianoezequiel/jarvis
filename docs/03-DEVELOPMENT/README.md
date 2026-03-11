# 💻 DEVELOPMENT — Setup, Padrões, Workflows

> Documentação focada em **COMO FAZER**. Setup local, padrões de código, workflows de task, convenções, ferramentas de desenvolvimento.
>
> **Público**: Desenvolvedores, Tech Leads, Code Reviewers

---

## 📁 Conteúdo desta Pasta

```
03-DEVELOPMENT/
├── README.md                    ← Você está aqui
├── SETUP.md                     ← Setup local (install, env, dependencies)
├── QUICKSTART_DEV.md            ← Primeiros passos (dev server, primeiros commits)
├── WORKFLOW_TASKS.md            ← Workflow para tasks (branch, docs, testes)
├── CONVENTIONS.md               ← Padrões de código (TypeScript, naming, etc)
├── TESTING.md                   ← Testes unitários, integração, E2E
├── DEBUGGING.md                 ← Debugging local, logs, breakpoints
├── GIT_WORKFLOW.md              ← Branches, commits, PRs
├── templates/                   ← Templates para tasks
│   ├── ANDAMENTO.md             ← Template de progress
│   ├── ANALISE.md               ← Template de análise
│   └── CRITERIOS_ACEITE.md      ← Template de acceptance criteria
└── tools/                       ← Scripts úteis (setup, teste, etc)
    └── setup.sh                 ← Script de setup automático
```

---

## Que Informações Estão Aqui?

| Documento | Descrição | Tempo | Público |
|---|---|---|---|
| **SETUP.md** | Node, npm, env vars, dependências | 15–20 min | Novos devs |
| **IMPLEMENTACAO_PASSO_A_PASSO.md** | Trilha completa para implementar o Jarvis do zero | 25–40 min | Novos devs |
| **QUICKSTART_DEV.md** | Dev server, primeiros commits | 10–15 min | Novos devs |
| **WORKFLOW_TASKS.md** | Branch, documentação, testes, PR | 20–30 min | All devs |
| **CONVENTIONS.md** | TypeScript, naming, structure | 20–30 min | All devs |
| **TESTING.md** | Unit tests, integration, E2E | 30–45 min | QA, Devs |
| **DEBUGGING.md** | Logs, breakpoints, Chrome DevTools | 15–20 min | Devs |
| **GIT_WORKFLOW.md** | Branches, commits, PRs, merges | 10–15 min | All devs |

---

## 🎯 Guia de Navegação

### "Como instalo locally?"
→ Leia **SETUP.md** (20 min)

### "Nao conheco o projeto. Por onde implemento?"
→ Leia **IMPLEMENTACAO_PASSO_A_PASSO.md** (25–40 min)

### "Como faço rodar o dev server?"
→ Leia **QUICKSTART_DEV.md** (15 min)

### "Como faço uma task?"
→ Leia **WORKFLOW_TASKS.md** (30 min) + use templates

### "Qual é o padrão de código?"
→ Leia **CONVENTIONS.md** (30 min)

### "Como testo?"
→ Leia **TESTING.md** (45 min)

### "Como debugo?"
→ Leia **DEBUGGING.md** (20 min)

### "Como faço PR?"
→ Leia **GIT_WORKFLOW.md** (15 min)

---

## 🚀 Workflow Típico de Dev

```
1. $ npm install                    (SETUP.md)
2. $ npm run dev                    (QUICKSTART_DEV.md)
3. $ git checkout -b feature/...    (GIT_WORKFLOW.md)
4. Codar + testes                   (CONVENTIONS.md + TESTING.md)
5. $ npm run build                  (Validation)
6. $ git push + PR                  (GIT_WORKFLOW.md)
7. Code Review                      (CONVENTIONS.md)
8. Merge                            (GIT_WORKFLOW.md)
```

---

## 🔧 Ferramentas Essenciais

| Ferramenta | Versão | Uso |
|---|---|---|
| Node.js | v18+ | Runtime |
| npm | v9+ | Package manager |
| TypeScript | v5+ | Linguagem |
| Next.js | v15 | Framework |
| Tailwind CSS | v3+ | Styling |
| Supabase CLI | Latest | DB migrations |
| ESLint | Latest | Linting |
| Prettier | Latest | Formatting |

---

## 📝 Checklist para Novo Dev

- [ ] Node.js + npm instalados
- [ ] Repositório clonado
- [ ] `.env.local` configurado (4 chaves)
- [ ] `npm install` rodou sem erros
- [ ] `npm run dev` funcionando
- [ ] Página carrega em `localhost:3000`
- [ ] Primeira task criada (veja WORKFLOW_TASKS.md)
- [ ] Primeiro commit feito (veja GIT_WORKFLOW.md)

---

## 🔗 Links Relacionados

- **Architecture** → [`02-ARCHITECTURE/`](../02-ARCHITECTURE/)
- **APIs** → [`04-API-REFERENCE/`](../04-API-REFERENCE/)
- **Deployment** → [`05-DEPLOYMENT/`](../05-DEPLOYMENT/)
- **Exemplo de task** → [`tasks/jarvis-TASK-001/`](./tasks/jarvis-TASK-001/)
- **Guia de implementacao** → [`IMPLEMENTACAO_PASSO_A_PASSO.md`](./IMPLEMENTACAO_PASSO_A_PASSO.md)

---

## 💡 Dicas Rápidas

- **Dúvida sobre padrão?** → Veja [`CONVENTIONS.md`](./CONVENTIONS.md)
- **Como debug?** → Veja [`DEBUGGING.md`](./DEBUGGING.md)
- **Como testar?** → Veja [`TESTING.md`](./TESTING.md)
- **Erro no build?** → Veja `npm run build` output + [`06-OPERATIONS/TROUBLESHOOTING.md`](../06-OPERATIONS/TROUBLESHOOTING.md)

---

**Próximo**: Leia [`SETUP.md`](./SETUP.md) →

---

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: Engineering Team
