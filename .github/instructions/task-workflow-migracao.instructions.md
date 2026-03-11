# Instrução: Workflow de Gestão de Tasks — Jarvis AIOS

**Escopo:** Este instrucional define o padrão obrigatório para iniciar, documentar e finalizar qualquer task de desenvolvimento do projeto **Jarvis AIOS** — seja feature, bugfix, integração, agente ou melhoria.  
**Aplicar sempre que:** O usuário pedir para iniciar, trabalhar ou concluir uma task.

---

## Fluxo Obrigatório — Resumo Rápido

Todo trabalho em uma task **deve** seguir exatamente esta sequência:

```
1. INICIAR TASK
   └─ Criar branch: feature/jarvis-TASK-XXX

2. DOCUMENTAÇÃO INICIAL
   └─ Criar pasta: docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/
   └─ Criar ANDAMENTO.md
   └─ Criar ANALISE.md
   └─ Criar CRITERIOS_ACEITE.md

3. IMPLEMENTAÇÃO
   └─ Commits atômicos com "Refs: TASK-XXX"
   └─ npx tsc --noEmit (TypeScript sem erros)
   └─ npm run dev passando localmente

4. QUALIDADE (OBRIGATÓRIO)
   └─ TypeScript compilando sem erros
   └─ Funcionalidade testada manualmente no browser
   └─ Wake word e voz testados se afetados

5. FINALIZAÇÃO
   └─ Todos os critérios de aceitação marcados [x]
   └─ ANDAMENTO.md com status "CONCLUÍDO"
   └─ Push + merge para main
   └─ Vercel redeploya automaticamente (~30s)
```

> **⚠️ REGRA CRÍTICA:** Uma task NÃO está concluída se:
> - TypeScript retorna erros (`npx tsc --noEmit`)
> - Critérios de aceitação não estão 100% marcados
> - Branch não foi mergeada
> - Documentação está incompleta

---

## 1. Iniciar uma Task

### 1.1 Criar a Branch

**Convenção de nome:**
```
feature/jarvis-TASK-XXX      ← para novas funcionalidades
fix/jarvis-TASK-XXX          ← para bugfixes
refactor/jarvis-TASK-XXX     ← para refactoring
docs/jarvis-TASK-XXX         ← para documentação apenas
```

**Criar a branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/jarvis-TASK-XXX
```

### 1.2 Criar Pasta de Documentação da Task

Criar a estrutura `docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/` com os **três documentos obrigatórios**:

```
docs/03-DEVELOPMENT/tasks/
  jarvis-TASK-XXX/
    ANDAMENTO.md          ← rastreamento de progresso, checklist, log
    ANALISE.md            ← análise técnica detalhada, decisões de design, riscos
    CRITERIOS_ACEITE.md   ← consolidação dos critérios de aceitação e evidências
```

---

## 2. Templates de Documentação

### Template ANDAMENTO.md

```markdown
# TASK-XXX — [Título da Task]

**Sprint:** [Número do sprint]  
**Prioridade:** [🔴 P0 / 🟠 P1 / 🟡 P2 / 🟢 P3]  
**Estimativa:** [X horas / X Story Points]  
**Branch:** `feature/jarvis-TASK-XXX`  
**Status:** 🟡 In Progress  
**Início:** [YYYY-MM-DD]  
**Término Previsto:** [YYYY-MM-DD]  

---

## Objetivo
[Descrição clara do que deve ser entregue]

---

## Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Funcionalidade testada no browser (Chrome)

---

## Arquivos Afetados
| Arquivo | Ação |
|---|---|
| `src/components/cockpit/X.tsx` | Criar / Modificar |
| `src/hooks/useX.ts` | Criar / Modificar |
| `src/app/api/X/route.ts` | Criar / Modificar |

---

## Log de Andamento
| Data | Status | Descrição |
|---|---|---|
| [data] | 🟡 Iniciado | Task criada |

---

## Dependências
- Bloqueadores: [Tasks que devem ser concluídas antes]
- Desbloqueia: [Tasks que esta libera]

---

## Notas
[Decisões tomadas, riscos, observações relevantes]
```

### Template ANALISE.md

```markdown
# TASK-XXX — Análise Técnica: [Título]

**Revisão:** 1.0  
**Data:** [YYYY-MM-DD]  

---

## 1. Contexto e Motivação
[Por que esta task existe, que problema resolve]

## 2. Componentes Afetados no Jarvis AIOS

| Componente | Localização | Tipo de Mudança |
|---|---|---|
| [Componente] | `src/components/cockpit/X.tsx` | Criar / Modificar |
| [Hook] | `src/hooks/useX.ts` | Criar / Modificar |
| [API Route] | `src/app/api/X/route.ts` | Criar / Modificar |
| [Lib] | `src/lib/X.ts` | Criar / Modificar |

## 3. Fluxo Técnico
[Descrever o fluxo de dados: usuário → hook → API → Claude/Supabase → resposta]

## 4. Decisões de Design
| Decisão | Alternativas | Motivo |
|---|---|---|
| [Decisão] | [Alt 1, Alt 2] | [Justificativa] |

## 5. Riscos Identificados
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|

## 6. Testes Necessários
- [ ] Testar no Chrome (wake word usa Web Speech API — Chrome only)
- [ ] Verificar streaming SSE se afetado
- [ ] Verificar TypeScript: `npx tsc --noEmit`
- [ ] Testar com Supabase se houver persistência

## 7. Estimativa de Esforço
| Atividade | Tempo Estimado |
|---|---|
| Implementação | [Xh] |
| Testes manuais | [Xh] |
| Documentação | [Xh] |
```

### Template CRITERIOS_ACEITE.md

```markdown
# TASK-XXX — Critérios de Aceitação

> **Status Geral**: ⏳ Em Progresso (DD/MM/YYYY)

---

## 1. Implementação Core

### 1.1 [Funcionalidade principal]
- [ ] **Critério**: [Descrição específica]
- **Evidência**: Arquivo `src/...` — [o que foi implementado]

### 1.2 [TypeScript]
- [ ] **Critério**: `npx tsc --noEmit` retorna 0 erros
- **Evidência**: Output do comando no terminal

---

## 2. Integração com Claude / Supabase

### 2.1 [Se aplicável]
- [ ] **Critério**: [Describe]
- **Evidência**: [URL, log, screenshot]

---

## 3. Testes de Interface

### 3.1 Chat e Streaming
- [ ] **Critério**: Mensagens aparecem token a token no ChatPanel
- **Evidência**: Testado em localhost:3000 no Chrome

### 3.2 Wake Word (se afetado)
- [ ] **Critério**: "JARVIS" ativa a voz corretamente
- **Evidência**: Testado no Chrome com microfone ativo

---

## 4. Deploy

### 4.1 Build de produção
- [ ] **Critério**: `npm run build` (ou push para Vercel) sem erros
- **Evidência**: Log do Vercel ou output local

---

## Resumo Final
| Categoria | Total | Concluídos |
|---|---|---|
| Implementação Core | X | 0 |
| Integração | X | 0 |
| Testes de Interface | X | 0 |
| Deploy | X | 0 |
| **TOTAL** | **X** | **0** |
```

---

## 3. Durante a Implementação

### 3.1 Commits Atômicos

```bash
# Padrão de commit com referência à task
git add src/components/cockpit/NovoComponente.tsx
git commit -m "feat: implementa X na interface do cockpit

- Adiciona componente Y ao CentralOrb
- Integra com useJarvisChat para estado Z
Refs: TASK-XXX"

# Tipos de commit
feat:     → nova funcionalidade
fix:      → correção de bug
refactor: → refatoração sem mudança de comportamento
docs:     → documentação
style:    → formatação, espaçamento
test:     → testes
chore:    → tooling, configs, dependências
```

### 3.2 Comandos de Validação Contínua

```bash
# TypeScript check (DEVE passar antes do commit final)
npx tsc --noEmit

# Development server
npm run dev    # localhost:3000

# Worker autônomo (terminal separado)
node jarvis-worker.js
```

### 3.3 Atualizar ANDAMENTO.md

A cada sessão de trabalho:
1. Adicionar linha no Log de Andamento com data, status e resumo
2. Marcar critérios concluídos no checklist
3. Registrar decisões importantes nas Notas

---

## 4. Critérios de Qualidade — Jarvis AIOS

### 4.1 TypeScript Obrigatório
- Sem `any` implícito
- Todos os estados tipados: `'idle' | 'thinking' | 'streaming' | 'done' | 'error'`
- Retornos de API tipados com interfaces
- `AgentId`, `AgentState`, `DelegateCommand` de `types/agents.ts`

### 4.2 Padrões de Segredos e API Keys
- **NUNCA** expor `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` no frontend
- Variáveis `NEXT_PUBLIC_*` apenas para Supabase URL/key e configurações não-secretas
- `.env.local` sempre no `.gitignore`

### 4.3 SSE e Streaming
- Chat usa Server-Sent Events — nunca `await` a resposta completa
- `ReadableStream` com `data: TOKEN\n\n` no `route.ts`
- Estados no hook: `idle → thinking → streaming → done`

### 4.4 Wake Word (Chrome Only)
- Web Speech API só funciona no Google Chrome
- Sempre documentar no UI se a funcionalidade requer Chrome
- `create_response: false` no `session.update` do OpenAI Realtime — obrigatório

### 4.5 Supabase
- Todas as operações de leitura/escrita via `/api/jarvis-memory`
- Row Level Security habilitado com policy `allow_all`
- Sem queries diretas no lado do cliente para tabelas sensíveis

### 4.6 Worker (`jarvis-worker.js`)
- Node.js puro — sem imports de `next/*`
- Usa `@anthropic-ai/sdk` diretamente
- `project_name` em `jarvis_files` = agrupado em ProjectCard (com ZIP)
- Sem `project_name` = aparece como LooseFile

---

## 5. Concluir a Task

### 5.1 Checklist Final

```
[ ] npx tsc --noEmit → 0 erros
[ ] npm run dev → server starts sem erros
[ ] Funcionalidade testada manualmente no Chrome (localhost:3000)
[ ] Wake word testada SE a task afeta voz
[ ] Supabase verificado SE a task afeta memória/DOCS
[ ] Todos os critérios em CRITERIOS_ACEITE.md marcados [x]
[ ] ANDAMENTO.md atualizado com status "✅ CONCLUÍDO"
[ ] Commits com "Refs: TASK-XXX"
```

### 5.2 Merge e Deploy

```bash
# Push da branch
git push origin feature/jarvis-TASK-XXX

# Merge para main
git checkout main
git merge feature/jarvis-TASK-XXX
git push origin main

# Vercel redeploya automaticamente em ~30s
# Verificar em: https://[seu-projeto].vercel.app
```

### 5.3 Após o Deploy

1. Testar em produção (vercel.app) com Chrome
2. Verificar variáveis de ambiente na Vercel se necessário
3. Confirmar que wake word funciona em produção
4. Atualizar `ANDAMENTO.md` com data real de conclusão

---

## 6. Referência Rápida — Arquivos do Jarvis AIOS

| O que fazer | Arquivo a modificar |
|---|---|
| Mudar personalidade do JARVIS | `src/lib/jarvisPrompt.ts` |
| Adicionar/modificar agente | `src/app/api/agent-execute/route.ts` |
| Modificar painel de chat | `src/components/cockpit/ChatPanel.tsx` |
| Modificar painel de agentes | `src/components/cockpit/AgentSquadPanel.tsx` |
| Modificar aba DOCS | `src/components/cockpit/DeliveriesPanel.tsx` |
| Modificar orbe central | `src/components/cockpit/CentralOrb.tsx` |
| Modificar wake word | `src/hooks/useWakeWord.ts` |
| Modificar SSE do chat | `src/hooks/useJarvisChat.ts` |
| Modificar memória | `src/lib/jarvisMemory.ts` + `src/app/api/jarvis-memory/route.ts` |
| Modificar delegação de agentes | `src/lib/agentRouter.ts` |
| Modificar worker autônomo | `jarvis-worker.js` |
| Adicionar nova tabela Supabase | Supabase SQL Editor + `src/lib/supabase.ts` |

---

## 7. Apresentação de Opções — Convenção do Assistente

Sempre que houver múltiplas opções a serem apresentadas ao usuário, o assistente deverá:

- Apresentar as opções numeradas em lista simples (1, 2, 3, ...)
- Fornecer instrução curta pedindo ao usuário que responda com o número
- Incluir exemplo concreto e curto como referência

**Exemplo de apresentação:**
```
Opções (responda só o número):
1) Adicionar o agente ao agent-execute e atualizar jarvisPrompt.ts
2) Criar o agente como arquivo separado e importar
3) Usar o agente como sub-agente de @developer
```
