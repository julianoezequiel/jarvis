# 📚 Glossário — Jarvis AIOS

> **Documento**: Definições rápidas de termos e conceitos  
> **Status**: ✅ Completo  
> **Público**: Todos  
> **Formato**: Aphabético, com links

---

## A

### Agente / Agent
Programa autônomo especializado em 1 competência (ex: @analyst, @writer). Jarvis possui 21 agentes que executam em paralelo via `[DELEGATE: {...}]`. Ver [Os 21 Agentes](../02-ARCHITECTURE/OVERVIEW.md#-os-21-agentes).

### AIOS Core
Os 6 agentes de intelecto geral: @analyst, @developer, @researcher, @writer, @ux-design-expert, @manager. Ver [Fábrica Rentável][], abaixo.

### API Route (Next.js)
Arquivo em `src/app/api/*/route.ts` que implementa endpoint REST. Ex: `/api/jarvis-chat`, `/api/agent-execute`.

---

## B

### Barge-in
Capacidade de interromper a resposta de voz quando usuário começa a falar. Implementado em `useAudioPlayback.ts` via Web Audio API.

### Boot Sequence / Sequência de Boot
Estados iniciais que o cockpit passa ao abrir: `locked` → `mic-prompt` → `booting` → `ready`. Animação estilo Iron Man com typewriter (~3s).

---

## C

### Cesspool / Pools de Agentes
Divisão dos 21 agentes em 2 grupos: **AIOS Core** (6) e **Fábrica Rentável** (15).

### ChatPanel
Componente React (`src/components/cockpit/ChatPanel.tsx`) que exibe mensagens em tempo real com SSE streaming.

### Cockpit
Interface visual principal estilo Iron Man. 3 colunas: ChatPanel (esq) | CentralOrb (centro) | AgentSquadPanel (dir).

### Contexto / Context (LLM)
Informação prévia que passa para Claude via `systemPrompt`. In-context learning sem fine-tuning.

---

## D

### Delegate / Delegação
Padrão de orquestração: JARVIS detecta `[DELEGATE: {agent, task, priority, context}]` no texto e executa agente via `/api/agent-execute`.

### Delivery / Entrega
Arquivo criado por JARVIS que aparece na aba DOCS. Armazenado em `jarvis_files` table do Supabase.

---

## E

### Environment Variable / Variável de Ambiente
Chave configurável em `.env.local`: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, etc.

### Execute / Execução
Segundo tipo de comando: `[EXECUTE: {"command": "npm run build"}]`. Ainda não implementado; para uso futuro.

---

## F

### Fábrica Rentável
Os 15 agentes especializados em negócios: @ideias-nichos, @criador-conteudo, @produtor-cursos, @designer, @empacotador, @cortes-virais, @gestor-contas, @trafego-organico, @vendas, @relacionamento, @auditor, @analista-metricas, @automacao-tecnica, @financeiro-pix, @melhoria-continua.

### Flyway
Schema migration tool. Jarvis usa migrations em `/database/migrations/` para versionamento de banco de dados.

---

## G

### GitHub Copilot Integration
Jarvis funciona melhor com GitHub Copilot ativado em VS Code. Arquivos em `.github/instructions/` são carregados automaticamente.

---

## H

### HexGrid
Componente background SVG (`src/components/cockpit/HexGrid.tsx`) com hexágonos animados sutilmente para aesthetic cockpit.

---

## I

### Iron Man Theme / Tema Iron Man
Design visual inspirado em Tony Stark: cyan brilhante, preto, scan lines, vignette, HUD corners, Orbitron font.

---

## J

### JARVIS / Jarvis AIOS
Nome do assistente pessoal. Acrônimo: **J**ust **A**nother **R**easonably **V**ibrant **I**ntelligent **S**ystem. Chama usuário de "Sir/Ma'am" em tom britânico.

---

## L

### LLM / Large Language Model
Modelo de IA textual. Jarvis usa Claude Sonnet 4.6 (Anthropic) como LLM principal.

---

## M

### Memory / Memória
Contexto persistente do usuário. 4 tipos: `jarvis_memory` (chat history), `user_facts` (preferências), `agent_knowledge` (skills), `oraculo_knowledge` (pesquisa).

### MRR / Monthly Recurring Revenue
Receita mensal recorrente. Métrica de saúde para SaaS (ex: 2K usuários Pro @ $29 = $58K MRR).

---

## N

### NPS / Net Promoter Score
Métrica de satisfação: "Quanto você recomendaria Jarvis a amigos?" (0–10). Score > 50 = saudável.

---

## O

### ORÁCULO / Oraculo Cycle
Worker autônomo que executa a cada 6 horas (cron via `vercel.json`). Executa 6 agentes em paralelo para pesquisa contínua. Salva results em `oraculo_knowledge` table.

### Orbitron Font
Fonte futurística sans-serif usada para display (headings) no cockpit. Vem de Google Fonts.

---

## P

### PCM16 / Pulse Code Modulation
Formato de áudio raw (16-bit, mono, 24kHz). Usado em OpenAI Realtime API. Capturado via Web Audio API em chunks de 100ms.

### Priority / Prioridade
Campo em `[DELEGATE: {...}]` que define urgência: "high", "normal", "low". Afeta ordem de execução em Promise.all.

### Promise.all()
JavaScript function que executa múltiplas Promises em paralelo, aguardando todas. Jarvis usa para executar 21 agentes simultaneamente.

---

## Q

### Quickstart
Guia de 5 minutos para novos usuários. Arquivo: [`00-START/QUICK_START.md`](../00-START/QUICK_START.md).

---

## R

### Realtime / WebSocket Realtime
Conexão persistente bidirecional para voz. OpenAI Realtime API via `wss://api.openai.com/v1/realtime`.

### RLS / Row Level Security
Política de segurança do Supabase que restringe acesso por linha. Jarvis usa `allow_all` (acesso público via chave anônima).

---

## S

### SSE / Server-Sent Events
Protocolo para streaming unidirecional (servidor → cliente). Jarvis usa SSE para chat (tokens chegam 1 por 1).

### System Prompt / Prompt do Sistema
Instrução base que define personalidade e comportamento do Claude. Arquivo: `src/lib/jarvisPrompt.ts` (britânico, especialista em 21 domínios).

### Stream / Streaming
Envio de dados em pedaços para viver feedback ao usuário (ex: tokens chegam progressivamente, não de uma vez).

---

## T

### Task / Tarefa
Unidade de trabalho. Fluxo: criar branch → documentar em `docs/03-DEVELOPMENT/tasks/` → implementar → validar → merge.

### Tier / Nível
Plano de preços: Free (até 5 tarefas/dia), Pro ($29/mês unlimited), Team/Enterprise.

### Tool / Ferramenta (Claude)
Função que Claude pode chamar via tool_use. Jarvis expõe 4: `remember_fact`, `search_memory`, `write_file`, `save_project`.

---

## U

### User Fact / Fato do Usuário
Informação pessoal salva via `remember_fact` tool (ex: "Usuário é criador TikTok", "Precisa de copy em tom descontraído").

---

## V

### Vercel
Plataforma de deploy para Next.js. Auto-redeploya em cada `git push`. Gratuito até limites generosos.

### Voz / Voice
Interface de input/output via OpenAI Realtime API. Wake word: "JARVIS". Resposta de 30s de conversa contínua.

---

## W

### Wake Word / Palavra-Chave
Trigger para voz. Padrão: "JARVIS". Detectado via Web Speech API (Chrome only).

### Web Audio API
API do browser para captura de áudio. Jarvis usa para: getUserMedia → ScriptProcessor → PCM16 base64.

---

## Z

### Zip / Compressão
Projeto com múltiplos arquivos é baixado como `.zip`. Implementado com `jszip` library. Um arquivo solto = "LooseFile".

---

## 🎯 Índice por Tópico

### Componentes UI
- [Cockpit](#c) | [ChatPanel](#c) | [HexGrid](#h) | [CentralOrb](#não documentado, veja OVERVIEW)

### APIs & Integração
- [API Route](#a) | [SSE](#s) | [Realtime](#r) | [Tool](#t)

### Agentes & Orquestração
- [Agente](#a) | [Delegate](#d) | [Fábrica Rentável](#f) | [AIOS Core](#a)

### Banco de Dados
- [Memory](#m) | [RLS](#r) | [Flyway](#f)

### Deployment & DevOps
- [Vercel](#v) | [ORÁCULO](#o) | [Environment Variable](#e)

### Segurança & Qualidade
- [Sistema Prompt](#s) | [GitHub Copilot Integration](#g)

### Métricas & Negócio
- [MRR](#m) | [NPS](#n) | [Tier](#t)

---

## ❓ Termos Faltando?

Não achou? Abra uma issue em GitHub ou pergunte no Discord. Este glossário é vivo.

**Última atualização**: 2026-03-10
