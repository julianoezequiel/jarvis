# Feature: Speaker Identification com Vosk

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
