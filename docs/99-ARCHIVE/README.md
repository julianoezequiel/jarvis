# 📦 ARCHIVE — Templates Antigos, Histórico, Referência

> Pasta para **arquivos antigos**, **templates descontinuados**, **documentação legada**, **histórico do projeto**.
>
> **Público**: Referência, não para uso ativo

---

## 📁 Conteúdo desta Pasta

```
99-ARCHIVE/
├── README.md                    ← Você está aqui
├── HISTORIA_PROJETO.md          ← Histórico de mudanças, versões
├── TEMPLATES_ANTIGOS/           ← Templates descontinuados
│   ├── TASK_TEMPLATE_V0.md
│   ├── API_SPEC_V1.md
│   └── ...
├── DEPRECATED_DOCS/             ← Documentação legada (manter para referência)
│   ├── SETUP_OLD_WORKFLOW.md
│   ├── DEPLOYMENT_AZURE.md      ← Old deployment (usávamos Azure)
│   └── ...
├── RELEASES/                    ← Release notes e changelogs
│   ├── v0.1-alpha.md
│   ├── v0.5-beta.md
│   └── v1.0-stable.md
└── DECISIONS_REJECTED/          ← Decisões de arquitetura rejeitadas
    ├── WHY_NOT_LANGCHAIN.md
    ├── WHY_NOT_SERVERLESS.md
    └── ...
```

---

## ⚠️ Aviso Importante

**Estes arquivos são LEGADOS.** Não use como base para novo trabalho.

Se precisar de:
- **Templates atuais** → Vá para [`03-DEVELOPMENT/templates/`](../03-DEVELOPMENT/templates/)
- **Docs atuais** → Vá para [`00-START/`](../00-START/)
- **API spec** → Vá para [`04-API-REFERENCE/`](../04-API-REFERENCE/)

---

## 🎯 Por Que Esta Pasta Existe?

1. **Histórico** — Entender como o projeto evoluiu
2. **Referência** — Ver decisões antigas e por que foram rejeitadas
3. **Learning** — Não repetir os mesmos erros
4. **Compliance** — Alguns processos legais podem exigir histórico

---

## 📚 O Que Está Aqui?

### HISTORIA_PROJETO.md
Timeline de mudanças:
- v0.1 (Prototipo inicial com Azure)
- v0.5 (Beta, ainda com PontoCore docs)
- v1.0 (Production, stack atual)

### TEMPLATES_ANTIGOS/
Templates que NÃO usamos mais:
- Task template v0 (formato Jira)
- API spec v1 (antes de OpenAI Realtime)
- Deploy checklist (Azure era)

### DEPRECATED_DOCS/
Documentação desatualizada mantida por referência:
- **DEPLOYMENT_AZURE.md** → Usávamos Azure. Agora é Vercel. Mantenha para referência histórica.
- **SETUP_OLD_WORKFLOW.md** → Workflow Jira antigo. Agora é custom task workflow.

### RELEASES/
Release notes de cada versão:
- **v0.1-alpha.md** → Prototipo inicial
- **v1.0-stable.md** → Versão atual

### DECISIONS_REJECTED/
Por que achamos que as decisões abaixo eram ruins:
- **WHY_NOT_LANGCHAIN.md** → Consideramos LangChain, mas Claude Tools + custom router era mais simples
- **WHY_NOT_SERVERLESS.md** → Serverless puro teria complexo para realtime. Vercel serverless é o sweet spot.

---

## 🚫 O Que NÃO Fazer

- ❌ **NÃO copie templates antigos** — Use versões atuais em `03-DEVELOPMENT/`
- ❌ **NÃO siga deployment Azure** — Use Vercel (veja `05-DEPLOYMENT/`)
- ❌ **NÃO use docs legadas** — Use versão atual em `02-ARCHITECTURE/`
- ❌ **NÃO crie novos arquivos aqui** — Use outras pastas (00–07)

---

## ✅ O Que Você PODE Fazer

- ✅ **Ler histórico** para entender evolução
- ✅ **Ler decisões rejeitadas** para não repetir
- ✅ **Referenciar release notes** para entender mudanças
- ✅ **Comparar com old templates** para fins de aprendizagem

---

## 🔗 Links Relacionados

- **Docs Atuais** → [`00-START/README.md`](../00-START/README.md)
- **Desenvolvimento** → [`03-DEVELOPMENT/`](../03-DEVELOPMENT/)
- **Deployment** → [`05-DEPLOYMENT/`](../05-DEPLOYMENT/)

---

## 📝 Checklist

- [x] Pasta `99-ARCHIVE/` serve apenas como REFERÊNCIA
- [x] Não há docs legadas que ainda sejam usadas (migramos tudo)
- [x] Release notes preservadas para histórico
- [x] Decisões rejeitadas documentadas

---

## 🗑️ Limpeza Periódica

A cada 6 meses, revise:
- [ ] Há arquivos que podem ser deletados?
- [ ] Há novos arquivos que deveriam ir para ARCHIVE?
- [ ] Release notes estão atualizadas?

---

**Status**: 🔒 READ-ONLY (não adicionar novos arquivos aqui)

**Versão**: 1.0  
**Última atualização**: 2026-03-10  
**Proprietário**: Documentation Team
