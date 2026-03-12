# Feature: Speaker Identification com Vosk (Multi-Usuário)

## Objetivo

Implementar **identificação de voz multi-usuário** para o Maya AIOS usando **Vosk** (Node.js, offline e gratuito).

Múltiplas pessoas podem ser cadastradas (Juliano, Mayara, Elizabeth…). Quando alguém fala após a wake word, o sistema identifica **quem é** comparando com todos os perfis. Se reconhecido, prossegue e informa o nome à Maya. Se não reconhecido, bloqueia o comando.

O cadastro é feito **via chat** — o usuário digita "Cadastrar nova voz", Maya pergunta o nome, e depois o usuário grava uma amostra de 12 segundos.

---

## Fluxo resumido

```
"Cadastrar nova voz"  →  Maya: "Qual o nome?"  →  Usuário: "Juliano"
→  VoiceEnrollModal  →  [● GRAVAR 12s]  →  POST /api/speaker-enroll { name, audio }
→  Maya: "✅ Voz de Juliano cadastrada!"

Wake word "Maya"  →  verify(3s)  →  best match Supabase
→  Reconhecido: "Olá Juliano!"   ou   Não reconhecido: silêncio
```

---

## Status

| Fase | Descrição | Status |
|---|---|---|
| FASE 1 | Setup: instalar dependências + baixar modelos | ⏳ Pendente |
| FASE 2 | `voskSpeaker.ts` — lib backend | ⏳ Pendente |
| FASE 3 | `/api/speaker-enroll` — GET / POST / DELETE | ⏳ Pendente |
| FASE 4 | `/api/speaker-verify` — best match multi-perfil | ⏳ Pendente |
| FASE 5 | `useSpeakerVerify.ts` — hook frontend | ⏳ Pendente |
| FASE 6 | `VoiceEnrollModal.tsx` — UI de cadastro | ⏳ Pendente |
| FASE 7 | Intent detection no chat + fluxo conversacional | ⏳ Pendente |
| FASE 8 | Camada pré-transcrição no wake word | ⏳ Pendente |

---

## Arquivos a criar

```
src/
  app/api/
    speaker-enroll/route.ts    ← GET (listar) / POST (cadastrar) / DELETE (remover)
    speaker-verify/route.ts    ← POST: best match entre todos os perfis
  lib/
    voskSpeaker.ts             ← singleton modelo + extractEmbedding + cosineSimilarity
  hooks/
    useSpeakerVerify.ts        ← verify / enrollByName / listProfiles / deleteProfile
  components/cockpit/
    VoiceEnrollModal.tsx       ← modal de gravação com countdown

models/                        ← NÃO vai para o repositório (.gitignore)
  vosk-model-spk-0.4/         ← modelo speaker identification (~30 MB)
```

---

## Schema Supabase (sem nova tabela)

```sql
-- user_facts existente — uma linha por pessoa cadastrada
category = 'voice_profile'
fact     = '{"name":"Juliano","voiceprint":[0.12,-0.45,...]}'
```

---

## Dependências

```bash
npm install vosk              # v0.3.39 — binding Node.js para Vosk
npm install wavefile          # leitura/escrita de arquivos WAV
```

---

## Documentos desta pasta

## Objetivo

Implementar **verificação de identidade por voz** para o Maya AIOS usando a biblioteca open-source **Vosk** (cliente Node.js, totalmente offline e gratuita).

Quando o usuário fala, o sistema extrai um "voiceprint" (vetor de características da voz) e compara com o perfil cadastrado. Se não reconhecer a voz, Maya pode responder com aviso ou bloquear.

---

## Status

| Fase | Descrição | Status |
|---|---|---|
| FASE 1 | Setup: instalar dependências + baixar modelos | ⏳ Pendente |
| FASE 2 | Backend: rotas de enroll + verify | ⏳ Pendente |
| FASE 3 | Frontend: captura de áudio + integração | ⏳ Pendente |
| FASE 4 | Supabase: persistência do voiceprint | ⏳ Pendente |
| FASE 5 | Integração com wake word / chat | ⏳ Pendente |

---

## Arquivos a criar

```
src/
  app/api/
    speaker-enroll/route.ts    ← POST: cadastra voiceprint do usuário
    speaker-verify/route.ts    ← POST: verifica identidade por voz
  lib/
    voskSpeaker.ts             ← carrega modelo + compara embeddings (cosine similarity)
  hooks/
    useSpeakerVerify.ts        ← hook React: captura áudio + chama /api/speaker-verify

models/                        ← NÃO vai para o repositório (.gitignore)
  vosk-model-spk-0.4/         ← modelo de speaker identification (~30 MB)
```

---

## Dependências

```bash
npm install vosk              # v0.3.39 — binding Node.js para Vosk
npm install wavefile          # leitura/escrita de arquivos WAV (resample para 16kHz)
```

---

## Documentos desta pasta

| Arquivo | Conteúdo |
|---|---|
| [ARQUITETURA.md](./ARQUITETURA.md) | Diagrama de fluxo + decisões técnicas |
| [PASSO_A_PASSO.md](./PASSO_A_PASSO.md) | Guia de implementação step-by-step |
| [MODELO_DOWNLOAD.md](./MODELO_DOWNLOAD.md) | Como baixar e configurar os modelos Vosk |
| [CRITERIOS_ACEITE.md](./CRITERIOS_ACEITE.md) | Critérios de aceite da feature |
| [ANDAMENTO.md](./ANDAMENTO.md) | Log de progresso durante a implementação |

---

## Restrições importantes

- **Vosk roda localmente** — não funciona no Vercel (sem filesystem). Para produção, usar Docker ou VPS.
- **Durante desenvolvimento** (`npm run dev` local) funciona perfeitamente.
- Os modelos (~30 MB) ficam em `models/` e são ignorados pelo git (`.gitignore`).
- A implementação atual (Web Speech API + OpenAI Realtime) **não é alterada** — speaker ID é uma camada adicional opcional.
