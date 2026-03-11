# Workflow de Tasks

> Documento ativo para organizar tasks, evidências e andamento dentro da estrutura nova de documentação.
>
> Publico: desenvolvedores, tech leads, reviewers
>
> Tempo de leitura: 10 a 15 minutos

---

## Objetivo

Cada task deve deixar rastro claro de:
- contexto e escopo
- progresso de execução
- critérios de aceite e evidências
- decisões tomadas ao longo da implementação

A pasta padrão para isso agora é:

```text
docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/
```

Estrutura mínima:

```text
docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/
├── ANDAMENTO.md
├── ANALISE.md
└── CRITERIOS_ACEITE.md
```

---

## Fluxo Obrigatório

### 1. Iniciar

Criar a branch de trabalho:

```bash
git checkout main
git pull origin main
git checkout -b feature/jarvis-TASK-XXX
```

Criar a pasta documental da task:

```bash
mkdir -p docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX
```

Criar os três arquivos obrigatórios:

```bash
touch docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/ANDAMENTO.md
touch docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/ANALISE.md
touch docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/CRITERIOS_ACEITE.md
```

### 2. Executar

Durante a implementação:
- atualizar ANDAMENTO.md a cada avanço relevante
- registrar decisões técnicas em ANALISE.md
- manter CRITERIOS_ACEITE.md sincronizado com o que foi entregue
- fazer commits atômicos com referência da task

Exemplo de commit:

```bash
git commit -m "feat: adiciona painel de entregas Refs: TASK-001"
```

### 3. Validar

Antes de concluir:

```bash
npm run build
npx tsc --noEmit
```

Checklist mínimo:
- TypeScript sem erros
- fluxo alterado validado manualmente
- documentação da task atualizada
- critérios de aceite marcados

### 4. Concluir

Ao encerrar a task:
- ANDAMENTO.md deve refletir status final
- ANALISE.md deve registrar decisões e riscos remanescentes
- CRITERIOS_ACEITE.md deve estar 100% marcado ou justificar pendências
- branch pronta para PR e merge

---

## O Que Vai em Cada Arquivo

### ANDAMENTO.md

Use para:
- objetivo resumido
- checklist de execução
- log cronológico curto
- status atual

### ANALISE.md

Use para:
- entendimento do problema
- arquivos afetados
- abordagem escolhida
- riscos, trade-offs e dependências

### CRITERIOS_ACEITE.md

Use para:
- lista objetiva de critérios
- evidência de validação
- observações finais

---

## Exemplo Pronto

Existe um exemplo completo em:

```text
docs/03-DEVELOPMENT/tasks/jarvis-TASK-001/
```

Esse exemplo serve como referência de estrutura e nível de detalhe esperado.

---

## Relação com as Instruções Canônicas

As instruções em:
- `.github/copilot-instructions.md`
- `.github/instructions/task-workflow-migracao.instructions.md`

precisam permanecer alinhadas com este documento. Se o caminho ou o processo mudar, atualize os três pontos.

---

## Boas Práticas

- não abrir task sem pasta documental
- não deixar decisão técnica só em conversa de chat
- não fechar task com checklist implícito
- preferir histórico curto e objetivo, sem narrativa excessiva

---

## Links Relacionados

- `SETUP.md` para preparar ambiente local
- `../02-ARCHITECTURE/ANALISE_DETALHADA.md` para contexto técnico
- `../00-START/README.md` para navegação geral

---

## Resumo Rápido

```text
branch -> docs da task -> implementação -> validação -> PR -> merge
```

Se faltar documentação da task, a execução está incompleta.