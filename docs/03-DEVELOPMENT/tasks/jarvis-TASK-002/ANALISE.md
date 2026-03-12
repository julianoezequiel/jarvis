# ANALISE.md — TASK-002: Maya Widget Embeddable

**Task:** JARVIS-TASK-002  
**Título:** Maya como Widget Embeddable (Sidebar + Orb + Maximizado)  
**Data de abertura:** 12/03/2026  
**Status:** Em análise  

---

## 1. Contexto e Motivação

O layout `/cockpit` (Iron Man) foi a **versão fundacional** do produto — utilizada para validar e consolidar todas as funcionalidades core (chat SSE, agentes, speaker ID, memória, TTS). Esta é agora a **fase de produto oficial**, onde a arquitetura evoluirá para um widget embeddável de nível produção. O objetivo é transformar a Maya em um **widget embeddável**, que possa:

- Funcionar como camada flutuante sobre **qualquer sistema web** (PontoCore, sistemas de terceiros)
- Ser integrado no PontoCore Frontend (Angular 14 / Fuse) substituindo o `quick-chat` existente
- Ter seu próprio ciclo de vida (minimizado → sidebar → maximizado) independente da página host
- Rodar em container Docker junto ao stack do cliente

---

## 2. Análise do Sistema Atual (Jarvis)

### 2.1 Componentes existentes em `/cockpit`

| Componente | Responsabilidade | Mantém no widget? |
|---|---|---|
| `MayaCockpit.tsx` | Orquestrador principal — estados auth/boot/ready | Refatorado como `MayaWidget.tsx` |
| `CentralOrb.tsx` | Orbe visual reativo ao áudio (Web Audio API) | ✅ Reutiliza — identidade visual da Maya |
| `ChatPanel.tsx` | Chat com streaming SSE | ✅ Adapt. para sidebar |
| `AgentSquadPanel.tsx` | Grid 21 agentes com status | Move para overlay maximizado |
| `DeliveriesPanel.tsx` | Aba DOCS (arquivos entregues) | Move para overlay maximizado |
| `StatusBar.tsx` | Barra top 40px com relógio | ❌ Remove do widget (irrelevante em sidebar) |
| `HexGrid.tsx` | Fundo SVG hexágonos | ❌ Remove (só Iron Man layout) |
| `BootSequence.tsx` | Animação de boot ~3s | ❌ Remove (impacta UX em embed) |
| `PasswordGate.tsx` | Tela de senha | ❌ Remove (autenticação é do sistema host) |
| `SettingsPanel.tsx` | Modal de configurações | Refatorado em `SettingsModal.tsx` com 4 abas |
| `VoiceEnrollModal.tsx` | Modal de cadastro de voz | ✅ Mantém igual |
| `MicPermissionOverlay.tsx` | Buffer PCM16 + init microfone | ✅ Mantém lógica, remove overlay visual |

### 2.2 Hooks existentes (todos reutilizáveis sem mudança)

| Hook | Status |
|---|---|
| `useMayaChat.ts` | ✅ Reutiliza integralmente |
| `useAgentOrchestrator.ts` | ✅ Reutiliza integralmente |
| `useWakeWord.ts` | ✅ Reutiliza integralmente |
| `useSpeakerVerify.ts` | ✅ Reutiliza integralmente |
| `useMayaDeliveries.ts` | ✅ Reutiliza integralmente |

### 2.3 APIs existentes (nenhuma mudança necessária)

Todas as rotas em `/api/` continuam inalteradas — o widget apenas as consome.

---

## 3. Análise do PontoCore Frontend

### 3.1 Stack

- Angular 14 + Fuse UI Framework
- Tailwind CSS
- Layouts disponíveis: classic, classy, compact, dense, futuristic, thin + horizontais

### 3.2 Ponto de integração identificado

O `classic.component.html` já possui:
```html
<!-- Quick chat (chatAcitve = false por padrão — já desabilitado) -->
<quick-chat *ngIf="chatAcitve" #quickChat="quickChat"></quick-chat>
```

O `chatAcitve` está `false` hardcoded em `ClassicLayoutComponent` — o slot está disponível e livre.

A mesma estrutura se repete nos layouts: `classy`, `compact`, `dense`, `futuristic`, `thin`, `modern`, `enterprise`, `material`, `centered`.

### 3.3 Estratégia de integração no PontoCore

Inserir uma `<script>` tag no `index.html` do PontoCore:
```html
<!-- index.html do PontoCore — antes do </body> -->
<script src="https://[HOST_MAYA]/embed.js"
        data-token="[API_TOKEN]"
        data-position="right"
        data-theme="dark">
</script>
```

O script monta o widget via DOM puro (`document.createElement('div')`) **fora do Angular** — sem dependência de módulos, sem conflito com Tailwind/Material.

Para enrollment externo (botão "Cadastrar Voz" nas telas de usuário):
```typescript
// Qualquer componente Angular
window.dispatchEvent(new CustomEvent('maya:enroll-voice', {
  detail: { name: 'João Silva', userId: '123' }
}))
```

---

## 4. Arquitetura do Widget

### 4.1 Três estados de exibição

```
MINIMIZADO                      SIDEBAR (direita, padrão)          MAXIMIZADO
──────────────────────────────  ────────────────────────────────   ──────────────────────────────────
                                                 ┌─ 380px ──────┐  ┌──────────────┬───────┬─────────┐
                                                 │ ● Orb + nome │  │     Chat     │Agentes│  Docs   │
┌──────────────────────────┐                    │ ───────────── │  │    (SSE)     │       │ Files   │
│                          │                    │ Mensagens SSE │  │              │       │         │
│   Sistema do cliente     │                    │               │  │  [input] ▶   │       │         │
│                          │                    │  [input] ▶ ⊞  │  │  🎤  ⚙  ×   │       │         │
│                       ● ←┘ ← canto inf dir    │  🎤  ⚙  ×    │  └──────────────┴───────┴─────────┘
└──────────────────────────┘                    └──────────────┘
         (padrão: bottom-right)                  (expansão lateral direita)
```

### 4.2 Estados e transições

```
minimized ──(clique no orb)──→ sidebar
sidebar   ──(clique ⊞)───────→ maximized
sidebar   ──(clique ×)───────→ minimized
maximized ──(clique ×)───────→ sidebar
maximized ──(ESC)────────────→ sidebar
```

### 4.3 Nova estrutura de arquivos

```
src/
  components/
    widget/                          ← NOVO — substitui /cockpit como produto
      MayaWidget.tsx                 ← raiz; gerencia estado: minimized|sidebar|maximized
      OrbButton.tsx                  ← orb flutuante (estado minimized)
      Sidebar.tsx                    ← estado sidebar (380px)
      MaximizedOverlay.tsx           ← estado maximizado (3 colunas, overlay)
      panels/
        ChatPanel.tsx                ← chat elaborado (markdown, code highlight, upload)
        AgentsPanel.tsx              ← lista de agentes com toggle ativo/inativo
        DocsPanel.tsx                ← arquivos entregues (reusa DeliveriesPanel)
      settings/
        SettingsModal.tsx            ← modal fullscreen com 4 abas
        tabs/
          GeneralTab.tsx             ← TTS, idioma, posição (esq/dir), tema
          AgentsTab.tsx              ← ativar/desativar agentes individualmente
          KnowledgeTab.tsx           ← upload PDF/TXT/MD → base de conhecimento
          VoicesTab.tsx              ← perfis de voz (move de SettingsPanel atual)
    cockpit/                         ← layout Iron Man (versão anterior — legado; sem novas features)
      [... sem alterações ...]

  lib/
    db/                              ← NOVO — abstração de banco
      index.ts                       ← exporta { dbQuery, dbInsert, dbUpdate, dbDelete, dbSelect }
      adapters/
        supabase.ts                  ← adapter atual (usa @supabase/supabase-js)
        postgres.ts                  ← adapter direto (usa 'pg' node-postgres)

  app/
    api/
      knowledge/                     ← NOVO — upload e consulta de base de conhecimento
        route.ts                     ← POST (upload) / GET (listar) / DELETE

embed/                               ← NOVO — bundles para embed externo
  script.ts                          ← script tag (monta widget no host via DOM)
  iframe-entry.tsx                   ← entry point modo iframe

Dockerfile                           ← NOVO
docker-compose.widget.yml            ← NOVO (integração com stack do cliente)
```

---

## 5. Abstração de Banco de Dados

### 5.1 Problema atual

Toda a camada de dados usa `supabase` diretamente (`src/lib/supabase.ts`). Para rodar no PontoCore (PostgreSQL direto, Docker) é necessário um adapter intercambiável.

### 5.2 Interface comum

```typescript
// src/lib/db/index.ts
export interface DbAdapter {
  select(table: string, filters?: Record<string, unknown>): Promise<unknown[]>
  insert(table: string, data: Record<string, unknown>): Promise<void>
  update(table: string, data: Record<string, unknown>, filters: Record<string, unknown>): Promise<void>
  delete(table: string, filters: Record<string, unknown>): Promise<void>
}
```

### 5.3 Seleção via variável de ambiente

```env
# Supabase (padrão atual)
DB_ADAPTER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# PostgreSQL direto (PontoCore, Docker)
DB_ADAPTER=postgres
DATABASE_URL=postgresql://user:pass@postgres:5432/pontocore
```

### 5.4 Tabelas necessárias (mesmas do Supabase, migração SQL)

```sql
-- Para rodar com PostgreSQL direto (criadas via migration)
CREATE TABLE IF NOT EXISTS jarvis_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  session_id TEXT,
  importance INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact TEXT NOT NULL,
  category TEXT,
  importance INT DEFAULT 1,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jarvis_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  content TEXT,
  project_name TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  skill_name TEXT,
  content TEXT,
  quality INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oraculo_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT,
  content TEXT,
  source TEXT,
  quality INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Base de Conhecimento (Knowledge Upload)

### 6.1 Funcionalidade

Upload de arquivos (PDF, TXT, MD, DOCX) → processados → salvos como chunks em `agent_knowledge`:
- `agent_id = 'knowledge-base'`
- `skill_name = nome_do_arquivo`
- `content = chunk de texto`

### 6.2 API

```
POST /api/knowledge
  body: FormData { file: File, filename: string }
  → extrai texto → divide em chunks de 2000 chars → salva no banco
  → retorna { ok: true, chunks: number }

GET /api/knowledge
  → lista arquivos carregados ({ filename, chunks, uploadedAt })

DELETE /api/knowledge
  body: { filename: string }
  → remove todos os chunks desse arquivo
```

### 6.3 Integração com o LLM

No system prompt, antes de enviar para o Claude:
```
[BASE DE CONHECIMENTO]
{chunks relevantes recuperados via busca semântica ou keyword match}
```

---

## 7. Enrollment Externo (PontoCore → Maya)

### 7.1 Contrato de evento

```typescript
// Disparado pelo sistema host (PontoCore Angular)
window.dispatchEvent(new CustomEvent('maya:enroll-voice', {
  detail: {
    name: string,      // nome do usuário
    userId?: string,   // ID no sistema host (opcional, para associação futura)
  }
}))
```

### 7.2 Maya responde

1. Ouve o evento em `MayaWidget.tsx` (useEffect global)
2. Expande automaticamente para estado `sidebar` se estiver minimizada
3. Abre `VoiceEnrollModal` com `suggestedName` pronto
4. Ao concluir, dispara de volta (opcional):
```typescript
window.dispatchEvent(new CustomEvent('maya:enroll-complete', {
  detail: { name: string, userId: string, success: boolean }
}))
```

---

## 8. Containerização

### 8.1 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models
COPY --from=builder /app/src/scripts ./src/scripts
# Python runtime para vosk speaker ID
RUN apk add --no-cache python3 py3-pip
RUN python3 -m venv /venv && /venv/bin/pip install vosk
ENV PYTHON=/venv/bin/python3
EXPOSE 3000
CMD ["node", "server.js"]
```

### 8.2 Integração com docker-compose do PontoCore

```yaml
# Adicionado ao docker-compose do PontoCore
maya:
  build:
    context: ../jarvis
    dockerfile: Dockerfile
  ports:
    - "3001:3000"
  environment:
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    - DB_ADAPTER=postgres
    - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/pontocore
  depends_on:
    - postgres
  restart: unless-stopped
```

---

## 9. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Método de embed | Script tag (host próprio) + iframe (terceiros) | Script tag = mais controle; iframe = isolamento total |
| Posição padrão | Direita (`bottom-right`) | Padrão de mercado (Intercom, Zendesk) |
| Largura sidebar | 380px | Cabe em 1024px sem cobrir conteúdo; padrão Intercom |
| Banco em container | PostgreSQL direto via `pg` | Supabase é SaaS; em Docker o cliente tem o próprio PG |
| Python no container | Alpine + venv | Menor imagem; vosk funciona em Alpine |
| Boot sequence | Removida do widget | Impacta UX em embed; widget deve aparecer instantaneamente |
| Autenticação do widget | Delegada ao host | Widget não tem senha própria; confia no sistema host |
| Layout Iron Man | Preservado em `/cockpit` | Versão anterior do produto — mantida como legado sem novas features |

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| CSS do host conflita com widget | Médio | Usar CSS-in-JS (inline styles) ou Shadow DOM |
| `window.__mayaGetLastAudioB64` colide com host | Baixo | Prefixar com `__maya_` e versão |
| Vosk Python em Alpine ARM (Mac M1/servidor ARM) | Alto | Testar build multi-arch; fallback sem speaker ID |
| PontoCore Angular não aceita script externo via CSP | Médio | Configurar `Content-Security-Policy` no host |
| Tamanho da imagem Docker (vosk ~200MB) | Médio | Build multi-stage; separar imagem com/sem vosk |

---

## 11. Referências

- Código atual: `src/components/cockpit/` (layout Iron Man — versão anterior do produto)
- PontoCore layout: `seneca-client/src/app/layout/layouts/vertical/classic/`
- quick-chat existente (desabilitado): `seneca-client/src/app/layout/common/quick-chat/`
- Speaker ID: `src/scripts/vosk_speaker.py`, `src/lib/voskSpeaker.ts`
- Banco atual: `src/lib/supabase.ts`
