# 🛠️ Setup — Como Começar a Desenvolver

> **Documento**: Instruções de instalação e configuração do ambiente  
> **Status**: ✅ Completo  
> **Público**: Desenvolvedores, Tech Leads  
> **Tempo**: 20-30 minutos (primeira vez)

---

## 📋 Pré-Requisitos

### Hardware
- **CPU**: Qualquer máquina moderna (não há limites)
- **RAM**: 8GB mínimo (16GB recomendado)
- **Disk**: 5GB livres (node_modules + builds)

### Software
- **Node.js**: v18+ (LTS recomendado)
  ```bash
  node --version  # deve ser v18 ou superior
  ```
- **npm**: v9+ (vem com Node.js)
- **Git**: v2.30+
- **VS Code**: recomendado (com Copilot Extension)

### Conta & Chaves
Você precisará de:
1. **Anthropic API Key** (Claude) — [https://console.anthropic.com](https://console.anthropic.com)
2. **OpenAI API Key** (Voz Realtime) — [https://platform.openai.com](https://platform.openai.com)
3. **Supabase Project** (DB) — [https://supabase.com](https://supabase.com)

**Custo estimado**:
- Claude API: ~$5–10 USD/mês (com uso pessoal)
- OpenAI Realtime: ~$3–5 USD/mês
- Supabase: Gratuito (tier gratuito)
- Vercel: Gratuito (tier gratuito)

---

## 🚀 Setup Passo a Passo

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/meu-jarvis.git
cd meu-jarvis
```

### Passo 2: Instalar Dependências

```bash
npm install
```

**Tempo esperado**: 3–5 minutos na primeira vez.

Verifique se ficou tudo bem:
```bash
npm run build  # (sem erros = OK)
```

### Passo 3: Configurar Variáveis de Ambiente

Crie arquivo `.env.local` **na raiz do projeto**:

```bash
# Copiar do template (se existir)
cp .env.example .env.local

# OU criar manualmente
touch .env.local
```

Preench as variáveis:

```env
# 🔑 OBRIGATÓRIAS

# Claude API (Anthropic)
ANTHROPIC_API_KEY=sk-ant-v0-xxxxx...

# OpenAI (Voz Realtime)
OPENAI_API_KEY=sk-proj-xxxxx...

# Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# ⚙️ OPCIONAIS (com valores padrão)

NEXT_PUBLIC_WAKE_WORD=jarvis
NEXT_PUBLIC_JARVIS_VOICE=alloy
NEXT_PUBLIC_REALTIME_MODEL=gpt-4o-realtime-preview

# APIs alternativas (opcional)
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

**⚠️ IMPORTANTE**: `.env.local` está no `.gitignore` — **nunca commitar!**

### Passo 4: Criar Supabase Database

1. **Ir para** [https://supabase.com](https://supabase.com)
2. **Criar novo project** (gratuito)
3. **Notar**: 
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Executar migrations** (SQL scripts):
   - Copiar `/database/migrations/*.sql`
   - Paste em Supabase SQL Editor
   - Execute cada um em ordem

**Schema criado automaticamente com 5 tabelas**:
- `jarvis_memory` — Histórico de conversas
- `user_facts` — Dados sobre usuário
- `agent_knowledge` — Conhecimento por agente
- `jarvis_files` — Arquivos entregues
- `oraculo_knowledge` — Pesquisa autônoma

### Passo 5: Testando Setup Local

```bash
# Terminal 1: Next.js dev server
npm run dev

# Veja a saída:
# > local:   http://localhost:3000/

# Abra no browser: http://localhost:3000
```

**Esperado**:
- [ ] Página carrega (padrão Iron Man cockpit)
- [ ] PasswordGate aparece ("1234" = senha padrão)
- [ ] Após senha: Boot sequence iniciado
- [ ] Chat + Agentes visíveis

### Passo 6: Testar Worker Autônomo (Opcional)

```bash
# Terminal 2 (em novo terminal, mesma pasta)
node jarvis-worker.js

# Veja logs:
# ✅ [jarvis-worker] Inicializando...
# ✅ [jarvis-worker] Ciclo 1/6 — @analyst
# ...
```

**Nota**: Worker desabilita sozinho se chaves de API faltarem.

---

## 📁 Estrutura do Projeto

```
meu-jarvis/
├── src/
│   ├── app/
│   │   ├── api/                      ← API Routes (Next.js)
│   │   │   ├── jarvis-chat/
│   │   │   ├── jarvis-memory/
│   │   │   ├── agent-execute/
│   │   │   ├── realtime-token/
│   │   │   └── oraculo/cycle/
│   │   ├── page.tsx                  ← Homepage
│   │   ├── layout.tsx                ← Layout base
│   │   └── globals.css               ← Estilos globais
│   ├── components/cockpit/           ← Componentes React
│   │   ├── JarvisCockpit.tsx          ← Raiz
│   │   ├── ChatPanel.tsx
│   │   ├── AgentSquadPanel.tsx
│   │   ├── StatusBar.tsx
│   │   ├── BootSequence.tsx
│   │   └── ...
│   ├── hooks/                        ← React Hooks
│   │   ├── useJarvisChat.ts
│   │   ├── useWakeWord.ts
│   │   ├── useRealtimeSession.ts
│   │   └── ...
│   ├── lib/                          ← Utilitários
│   │   ├── jarvisPrompt.ts
│   │   ├── supabase.ts
│   │   ├── realtimeClient.ts
│   │   └── agentRouter.ts
│   └── types/                        ← TypeScript types
│       └── agents.ts
├── jarvis-worker.js                  ← Worker autônomo (Node.js)
├── .env.local                        ← Chaves de API (não commitar)
├── .github/instructions/             ← Instruções Copilot (canonical)
├── docs/                             ← Documentação
│   ├── 00-START/
│   ├── 01-PRODUCT/
│   ├── 02-ARCHITECTURE/
│   └── ...
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## 🔄 Fluxo de Desenvolvimento Típico

### Task 1: Implementar novo endpoint

1. **Criar arquivo**: `src/app/api/meu-endpoint/route.ts`
2. **Implementar** com TypeScript strict
3. **Testar localmente**: `curl http://localhost:3000/api/meu-endpoint`
4. **Commit**: `git add . && git commit -m "feat: novo endpoint"`
5. **Push**: `git push` (Vercel redeploya automaticamente em ~30s)

### Task 2: Adicionar novo agente

1. **Editar**: `src/lib/agentRouter.ts` (adicionar ao dicionário de agentes)
2. **Criar prompt**: `@novo_agente` com instruções específicas
3. **Editar**: `.github/instructions/domain-knowledge.instructions.md` (documentar)
4. **Testar**: Delegar `[DELEGATE: {"agent":"@novo_agente", "task":"..."}]` no chat
5. **Commit + Push**

### Task 3: Modificar UI

1. **Editar**: Componente Next.js em `src/components/`
2. **Dev server recarrega automático** (HMR)
3. **Testar** no browser
4. **Commit + Push**

---

## 🔍 Troubleshooting Setup

### Erro: "Cannot find module 'next'"
```bash
# Solução: limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: "ANTHROPIC_API_KEY is not set"
```bash
# Verificar se .env.local existe
ls -la .env.local

# Se não existe: criar e preencher
touch .env.local
# (editar com chaves de API)
```

### Erro: "Supabase connection failed"
```bash
# 1. Verificar URL e chave em .env.local
grep SUPABASE .env.local

# 2. Testar conexão
curl https://xxx.supabase.co/rest/v1/jarvis_memory?limit=1 \
  -H "Authorization: Bearer CHAVE_ANON"
```

### Voz não funciona no Firefox
```
esperado: Web Speech API é Chrome-only
solução: use Chrome, Edge ou Chromium-based
```

### Node warning: "ExperimentalWarning: vm.SourceTextModule is experimental"
```
normal em Node 18: aviso apenas, não é erro
ignorar
```

---

## 📚 Próximos Passos Após Setup

Depois que tudo estiver rodando:

1. **Explorar código-fonte**:
   - Ler [`03-DEVELOPMENT/CONVENTIONS.md`](./CONVENTIONS.md) (padrões)
   - Estudar [`02-ARCHITECTURE/ANALISE_DETALHADA.md`](../02-ARCHITECTURE/ANALISE_DETALHADA.md) (fluxos)

2. **Fazer primeira task**:
   - Seguir [`03-DEVELOPMENT/WORKFLOW_TASKS.md`](./WORKFLOW_TASKS.md)
   - Criar branch, docs, documentar changes

3. **Deploy em Vercel**:
   - Linkar repo GitHub a Vercel
   - Auto-deploy em cada push
   - Monitorar logs via Vercel dashboard

4. **Adicionar à memória**:
   - Usar `[remember_fact: ...]` para salvar configurações pessoais

---

## ✅ Checklist de Setup

- [ ] Node.js v18+ instalado
- [ ] Repositório clonado
- [ ] `npm install` executado com sucesso
- [ ] `.env.local` criado com 3 chaves obrigatórias
- [ ] Supabase project criado e migrations executadas
- [ ] `npm run dev` rodando em localhost:3000
- [ ] Password gate ("1234") acessível
- [ ] Cockpit boot sequence visual
- [ ] Chat funcionando (pelo menos 1 mensagem)
- [ ] Worker rodando sem erros (opcional)

**Quando tudo estiver ✅**: Você está pronto para desenvolver!

---

## 📞 Help & Support

- **Dúvida técnica?** → [`07-KNOWLEDGE-BASE/FAQ.md`](../07-KNOWLEDGE-BASE/FAQ.md)
- **Erro específico?** → [`06-OPERATIONS/TROUBLESHOOTING.md`](../06-OPERATIONS/TROUBLESHOOTING.md)
- **Precisa de referência rápida?** → [`00-START/QUICK_START.md`](../00-START/QUICK_START.md)
- **Arquitetura profunda?** → [`02-ARCHITECTURE/ANALISE_DETALHADA.md`](../02-ARCHITECTURE/ANALISE_DETALHADA.md)
