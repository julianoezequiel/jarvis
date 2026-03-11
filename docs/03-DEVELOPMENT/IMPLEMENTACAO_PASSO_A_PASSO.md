# Implementacao Passo a Passo

> Documento para implementar o Jarvis AIOS do zero ou reconstruir o projeto seguindo a documentacao consolidada.
>
> Publico: pessoas que nao conhecem o projeto, desenvolvedores iniciantes no repositorio, builders no-code com apoio de IA
>
> Tempo estimado: 1 a 3 dias para MVP funcional, 1 a 2 semanas para versao mais completa

---

## Objetivo

Sim, com a documentacao atual e com os materiais fonte em PDF e Markdown, e possivel implementar o Jarvis AIOS seguindo um passo a passo.

O ponto importante e este: a documentacao ja descreve bem a arquitetura, os componentes e o fluxo do produto, mas para uma pessoa nova faltava uma trilha de execucao linear. Este documento preenche essa lacuna.

Ao final deste guia, a pessoa deve conseguir chegar a um MVP com:
- interface cockpit em Next.js
- chat com streaming via Claude
- memoria persistente no Supabase
- estrutura de agentes
- base para voz com OpenAI Realtime
- deploy na Vercel

---

## Ordem de Leitura Recomendada

Antes de implementar, leia nesta ordem:

1. `docs/00-START/QUICK_START.md`
2. `docs/01-PRODUCT/VISION.md`
3. `docs/02-ARCHITECTURE/OVERVIEW.md`
4. `docs/02-ARCHITECTURE/ANALISE_DETALHADA.md`
5. `docs/03-DEVELOPMENT/SETUP.md`
6. Este documento

Materiais de apoio que originaram a consolidacao atual:
- `docs/99-ARCHIVE/source-materials/markdown/Guia instalação Jarvis Orquestrador e Claude 2.0.md`
- `docs/99-ARCHIVE/source-materials/markdown/Tutorial-Completo-Como-Usar-o-Claude-AI-e-Agentes-de-IA-para-Automacao.md`
- demais PDFs e MDs arquivados em `docs/99-ARCHIVE/source-materials/`

---

## O Que Voce Vai Construir

### Escopo minimo do MVP

O MVP recomendado para um iniciante e:
- tela inicial com cockpit
- senha e sequencia de boot
- painel de chat
- endpoint `/api/jarvis-chat`
- persistencia basica no Supabase
- painel de agentes com status visual

### Escopo da versao completa

Depois do MVP, voce adiciona:
- wake word com Web Speech API
- OpenAI Realtime para voz
- orquestracao de 21 agentes
- worker autonomo
- entregas em `jarvis_files`
- cron do ORACULO

---

## Fase 0: Preparacao

### 0.1 Ferramentas necessarias

Voce precisa ter:
- Node.js 18+
- npm 9+
- Git
- VS Code
- conta Anthropic
- conta OpenAI
- conta Supabase
- conta Vercel

### 0.2 Chaves necessarias

Separe com antecedencia:

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_WAKE_WORD=jarvis
NEXT_PUBLIC_JARVIS_VOICE=alloy
NEXT_PUBLIC_REALTIME_MODEL=gpt-4o-realtime-preview
```

### 0.3 Resultado esperado

Ao final desta fase, voce tem todas as contas criadas e consegue preencher um `.env.local` sem depender de pesquisa adicional.

---

## Fase 1: Subir a Base do Projeto

Esta fase vem diretamente dos guias originais em PDF e Markdown: primeiro voce cria o espaco do projeto, depois sobe a base tecnica.

### 1.1 Criar ou clonar o projeto

Se o repositorio ja existe:

```bash
git clone <repo>
cd jarvis
npm install
```

Se voce estiver recriando do zero:

```bash
npx create-next-app@latest meu-jarvis --typescript --tailwind --app
cd meu-jarvis
npm install
```

### 1.2 Estruturar as pastas principais

Use como referencia a arquitetura documentada:

```text
src/
  app/
  components/cockpit/
  hooks/
  lib/
  types/
jarvis-worker.js
docs/
```

### 1.3 Configurar `.env.local`

Crie o arquivo na raiz com as chaves da fase 0.

### 1.4 Validacao da fase

```bash
npm run dev
```

Voce deve conseguir abrir `http://localhost:3000` sem erro de build.

---

## Fase 2: Implementar a Interface Base do Cockpit

Nesta fase, a meta nao e integrar IA ainda. A meta e fazer a casca visual funcionar.

### 2.1 Criar o layout principal

Implemente a pagina principal com 3 colunas:
- esquerda: chat
- centro: orb e status central
- direita: agentes e docs

Arquivos esperados:
- `src/app/page.tsx`
- `src/components/cockpit/JarvisCockpit.tsx`
- `src/components/cockpit/StatusBar.tsx`
- `src/components/cockpit/ChatPanel.tsx`
- `src/components/cockpit/AgentSquadPanel.tsx`
- `src/components/cockpit/CentralOrb.tsx`
- `src/components/cockpit/HexGrid.tsx`

### 2.2 Implementar o fluxo visual inicial

Estados documentados:
- `locked`
- `mic-prompt`
- `booting`
- `ready`

Arquivos esperados:
- `src/components/cockpit/PasswordGate.tsx`
- `src/components/cockpit/MicPermissionOverlay.tsx`
- `src/components/cockpit/BootSequence.tsx`

### 2.3 Validacao da fase

O que precisa funcionar:
- pagina abre
- senha aparece
- boot sequence roda
- cockpit renderiza completo

Se isso nao estiver pronto, nao avance para IA ainda.

---

## Fase 3: Implementar o Chat com Claude

Agora a interface passa a conversar com o backend.

### 3.1 Criar o prompt central do Jarvis

Arquivo:
- `src/lib/jarvisPrompt.ts`

Ele deve definir:
- personalidade do Jarvis
- tom britanico
- funcao de orquestrador
- tools permitidas
- protocolo de delegacao

### 3.2 Criar a rota de chat

Arquivo:
- `src/app/api/jarvis-chat/route.ts`

Responsabilidades:
- receber a mensagem do usuario
- chamar Claude
- retornar resposta via SSE
- interpretar tool use quando aplicavel

### 3.3 Criar o hook do chat

Arquivo:
- `src/hooks/useJarvisChat.ts`

Responsabilidades:
- enviar mensagem
- ler SSE token a token
- controlar estados `idle`, `thinking`, `streaming`, `done`, `error`

### 3.4 Validacao da fase

Teste manual:
- enviar uma mensagem simples
- ver streaming no painel
- confirmar que o browser nao fica travado aguardando resposta completa

---

## Fase 4: Integrar Memoria Persistente

Aqui o Jarvis deixa de ser so um chat e passa a ter continuidade.

### 4.1 Criar as tabelas no Supabase

Minimo recomendado:

```sql
jarvis_memory
user_facts
agent_knowledge
jarvis_files
oraculo_knowledge
```

### 4.2 Criar o client do Supabase

Arquivo:
- `src/lib/supabase.ts`

### 4.3 Criar a camada de memoria

Arquivo:
- `src/lib/jarvisMemory.ts`

Funcoes minimas:
- `saveMessage()`
- `searchMemory()`
- `saveUserFact()`
- `getRecentContext()`

### 4.4 Criar a API de memoria

Arquivo:
- `src/app/api/jarvis-memory/route.ts`

Tools minimas:
- `remember_fact`
- `search_memory`
- `write_file`
- `save_project`

### 4.5 Validacao da fase

Teste simples:
- salvar uma memoria
- pesquisar a memoria depois
- verificar a linha no Supabase

---

## Fase 5: Implementar Delegacao e Agentes

Nesta fase voce cria a espinha dorsal multiagente.

### 5.1 Criar os tipos dos agentes

Arquivo:
- `src/types/agents.ts`

Defina:
- `AgentId`
- `AgentState`
- `DelegateCommand`

### 5.2 Criar o parser do protocolo

Arquivo:
- `src/lib/agentRouter.ts`

Funcoes esperadas:
- `parseDelegations()`
- `parseExecutions()`
- `stripProtocols()`

### 5.3 Criar a rota de execucao de agentes

Arquivo:
- `src/app/api/agent-execute/route.ts`

Responsabilidades:
- receber `{ agent, task, context, priority }`
- selecionar o prompt correto do agente
- executar o Claude para aquele papel
- devolver resultado estruturado

### 5.4 Criar o orchestrator no frontend

Arquivo:
- `src/hooks/useAgentOrchestrator.ts`

Responsabilidades:
- detectar blocos `[DELEGATE: {...}]`
- disparar execucao paralela
- atualizar status visual dos agentes

### 5.5 Validacao da fase

Teste com um agente apenas antes de usar os 21.

Exemplo:

```text
[DELEGATE: {"agent":"@analyst","task":"Analisar um nicho de SaaS","priority":"high","context":"Teste inicial"}]
```

Se 1 agente funciona, expanda gradualmente.

---

## Fase 6: Implementar Voz

So avance para esta fase quando chat, memoria e delegacao ja estiverem estaveis.

### 6.1 Captura e reproducao de audio

Arquivos:
- `src/hooks/useAudioCapture.ts`
- `src/hooks/useAudioPlayback.ts`

### 6.2 Wake word

Arquivo:
- `src/hooks/useWakeWord.ts`

Regras importantes:
- funciona no Chrome
- deve detectar `jarvis`
- deve abrir uma janela curta de conversa

### 6.3 Sessao Realtime

Arquivos:
- `src/hooks/useRealtimeSession.ts`
- `src/lib/realtimeClient.ts`
- `src/app/api/realtime-token/route.ts`

Regra critica:
- enviar `create_response: false` no `session.update`

### 6.4 Validacao da fase

Checklist:
- microfone autorizado
- wake word detectada
- audio enviado em chunks PCM16
- resposta de voz reproduzida
- usuario consegue interromper com barge-in

---

## Fase 7: Implementar Entregas e Worker

### 7.1 Entregas no painel DOCS

Arquivos:
- `src/hooks/useJarvisDeliveries.ts`
- `src/components/cockpit/DeliveriesPanel.tsx`

Objetivo:
- listar `jarvis_files`
- agrupar por `project_name`
- permitir download de arquivos ou ZIP

### 7.2 Worker autonomo

Arquivo:
- `jarvis-worker.js`

Responsabilidades:
- rodar em intervalo fixo
- chamar 6 agentes AIOS em paralelo
- gerar brief
- salvar no Supabase

### 7.3 Validacao da fase

Voce deve conseguir:
- rodar `node jarvis-worker.js`
- ver arquivos sendo persistidos
- ver os arquivos aparecendo no painel DOCS

---

## Fase 8: Deploy na Vercel

Esta fase tambem vem dos materiais originais: projeto no GitHub, importacao na Vercel, configuracao das variaveis e deploy.

### 8.1 Subir para o GitHub

```bash
git add .
git commit -m "feat: bootstrap jarvis aios"
git push
```

### 8.2 Criar projeto na Vercel

Fluxo:
- New Project
- Import GitHub Repo
- selecionar o repositorio
- preencher as variaveis de ambiente
- Deploy

### 8.3 Configuracoes obrigatorias

Garantir:
- variaveis de ambiente configuradas
- `vercel.json` com cron do ORACULO, se aplicavel
- funcoes com timeout adequado

### 8.4 Validacao da fase

Em producao, validar:
- pagina abre
- chat responde
- Supabase grava memoria
- APIs sobem sem erro

---

## Ordem Recomendada de Implementacao Tecnica

Se voce estiver perdido, siga exatamente esta ordem:

1. estrutura Next.js
2. cockpit visual
3. password + boot
4. chat SSE com Claude
5. Supabase + memoria
6. parser de delegacao
7. 1 agente funcional
8. painel de agentes
9. entregas em DOCS
10. voz
11. worker
12. deploy

Essa ordem reduz risco e evita tentar integrar tudo ao mesmo tempo.

---

## O Que Nao Fazer

- nao comece pela voz
- nao tente implementar 21 agentes antes de validar 1
- nao tente deploy antes de o chat funcionar localmente
- nao implemente worker antes de validar persistencia
- nao trate os PDFs como fonte ativa; use-os como apoio e siga os documentos consolidados em `docs/`

---

## Checklist Final do MVP

- [ ] projeto sobe com `npm run dev`
- [ ] cockpit renderiza
- [ ] senha e boot sequence funcionam
- [ ] chat responde por SSE
- [ ] Supabase salva e busca memoria
- [ ] 1 agente e executado com sucesso
- [ ] entregas aparecem no painel DOCS
- [ ] deploy na Vercel concluido

---

## Se a Pessoa Nao Conhece o Projeto

Para uma pessoa completamente nova, a recomendacao pratica e:

### Dia 1
- ler a visao do produto
- entender a arquitetura
- preparar contas e ambiente
- subir a interface base

### Dia 2
- integrar Claude no chat
- conectar Supabase
- validar memoria

### Dia 3
- implementar delegacao basica
- ativar 1 ou 2 agentes
- publicar em Vercel

Depois disso, a pessoa ja nao esta mais perdida. Ela passa a evoluir o sistema em camadas.

---

## Documento de Apoio Mais Importante

Se voce puder consultar so 3 documentos durante a execucao, use estes:

1. `docs/03-DEVELOPMENT/SETUP.md`
2. `docs/02-ARCHITECTURE/ANALISE_DETALHADA.md`
3. `docs/03-DEVELOPMENT/WORKFLOW_TASKS.md`

Este documento serve como trilha. Os outros servem como referencia detalhada.

---

## Conclusao

Com base na documentacao atual, sim, e totalmente viavel implementar o Jarvis AIOS passo a passo para quem ainda nao conhece o projeto.

O que tornou isso viavel foi a combinacao de:
- consolidacao dos PDFs em Markdown
- arquitetura ja descrita
- estrutura documental organizada
- definicao clara de fases de implementacao

O risco principal nao e falta de informacao. O risco principal e tentar construir tudo de uma vez. Siga as fases, valide cada etapa e avance so depois de fechar o bloco anterior.