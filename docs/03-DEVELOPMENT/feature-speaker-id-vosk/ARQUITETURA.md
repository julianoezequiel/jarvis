# Arquitetura — Speaker Identification com Vosk (Multi-Usuário)

## Visão Geral do Modelo Multi-Voz

```
Perfis cadastrados no Supabase:
┌─────────────────────────────────────────────────────┐
│  user_facts (category = 'voice_profile')            │
│                                                     │
│  { name: 'Juliano',   voiceprint: [...128d...] }   │
│  { name: 'Mayara',    voiceprint: [...128d...] }   │
│  { name: 'Elizabeth', voiceprint: [...128d...] }   │
└─────────────────────────────────────────────────────┘

Quando alguém fala:
  → compara com TODOS os perfis
  → retorna o de MAIOR similaridade
  → se similarity >= 0.85 → identifica quem é
  → Maya pode cumprimentar pelo nome: "Olá, Juliano!"
```

---

## Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                            │
│                                                                      │
│  Usuário fala                                                        │
│       │                                                              │
│       ▼                                                              │
│  MediaRecorder API                                                   │
│  (WAV, 16kHz mono, PCM16 — 3 a 5 segundos)                         │
│       │                                                              │
│       ▼                                                              │
│  useSpeakerVerify.ts ──────────────────────────────────────────────►│
│       │           POST /api/speaker-verify { audio: base64 }        │
└───────┼─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTE (Backend)                      │
│                                                                      │
│  /api/speaker-verify/route.ts                                        │
│       │                                                              │
│       ├── decodifica base64 → buffer PCM16 (16kHz, mono)            │
│       │                                                              │
│       ├── voskSpeaker.ts                                             │
│       │     ├── carrega SpkModel (vosk-model-spk-0.4)               │
│       │     ├── KaldiRecognizer.setSpkModel(spkModel)               │
│       │     ├── processa chunks de áudio                            │
│       │     └── extrai vetor spk[] (128 dimensões — x-vector)       │
│       │                                                              │
│       ├── busca voiceprint cadastrado no Supabase                   │
│       │     (user_facts WHERE category = 'voice_print')             │
│       │                                                              │
│       ├── cosine_similarity(novo_vetor, vetor_salvo)                │
│       │                                                              │
│       └── retorna { match: bool, confidence: float }                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                   │
│                                                                      │
│  user_facts                                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ id | fact (JSON: vetor 128d) | category='voice_print'         │ │
│  │    | importance=10           | source='vosk-enrollment'        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Rota de Enrollment (cadastro por nome via chat)

```
Usuário digita no chat: "Cadastrar nova voz"
        │
        ▼
Maya: "Qual é o nome da pessoa?"
        │
        ▼
Usuário: "Juliano"
        │
        ▼
Maya: "Pronto! Clique em Gravar e fale algumas frases (10s)"
   → UI exibe botão [● GRAVAR] flutuante
        │
        ▼
Usuário clica → MediaRecorder 10s → base64
        │
        ▼
POST /api/speaker-enroll { name: 'Juliano', audio: base64 }
   → extrai embedding 128d
   → salva Supabase: { name: 'Juliano', voiceprint: [...] }
        │
        ▼
Maya: "✅ Voz de Juliano cadastrada com sucesso!"
```

---

## Fluxo principal de verificação — ANTES da transcrição

```
Usuário fala wake word "Maya"
        │
        ▼
useWakeWord detecta
        │
        ▼
[CAMADA 1 — ANTES da transcrição]
useSpeakerVerify captura 2–3s de áudio
        │
        ▼
POST /api/speaker-verify { audio: base64 }
   → compara com TODOS os perfis cadastrados
   → retorna { match, speaker, confidence }
        │
   ┌────┴────────────────────┐
   ▼                         ▼
match=true               match=false
speaker='Juliano'            │
   │                         ▼
   ▼                    Sem perfis: permite (no_enrollment)
[CAMADA 2 — Transcrição]  │  Com perfis: rejeita
Web Speech API captura    ▼
frase completa        Maya: "Não reconheço
   │                  sua voz."
   ▼
POST /api/maya-chat
{ message, speakerName: 'Juliano' }
   │
   ▼
Maya pode personalizar:
"Olá Juliano! Como posso ajudar?"
```

---

## Conceito: x-vector (embedding de voz)

O Vosk SpkModel implementa **x-vectors**, uma técnica de deep learning para extrair uma "impressão digital" da voz:

- Cada falante tem características únicas (frequência fundamental, timbre, ritmo)
- O modelo comprime esses padrões em um vetor de **128 números** (float)
- Dois vetores da mesma pessoa têm **similaridade cosseno ≈ 0.90–0.99**
- Vetores de pessoas diferentes têm **similaridade < 0.85**

```
Voz do usuário[A] → [0.12, -0.45, 0.88, ...] (128d)
Voz salva[A]      → [0.13, -0.43, 0.86, ...] (128d)
cosine_similarity = 0.974  → ✅ match

Voz do usuário[B] → [0.55, 0.22, -0.31, ...] (128d)
Voz salva[A]      → [0.13, -0.43, 0.86, ...] (128d)
cosine_similarity = 0.412  → ❌ não match
```

### Threshold recomendado
- `>= 0.85` → match confiante
- `0.70 – 0.85` → match incerto (pedir para repetir)
- `< 0.70` → não reconhecido

---

## Schema Supabase — Multi-Voz

```sql
-- Reutiliza a tabela user_facts existente
-- Um registro por perfil de voz cadastrado

user_facts
  id          uuid  (PK, gerado automaticamente)
  fact        text  → JSON: { "name": "Juliano", "voiceprint": [0.12, -0.45, ...] }
  category    text  → 'voice_profile'  (fixo para todos os perfis de voz)
  importance  int   → 10
  source      text  → 'vosk-enrollment'
  created_at  timestamptz

-- Busca todos os perfis:
SELECT * FROM user_facts WHERE category = 'voice_profile'

-- Remoção de um perfil:
DELETE FROM user_facts WHERE category = 'voice_profile'
  AND fact::jsonb->>'name' = 'Juliano'
```

---

## Algoritmo de identificação (Best Match)

```typescript
// Dado novo embedding da voz detectada:
const profiles = await fetchAllProfiles()  // array de { name, voiceprint }

let bestMatch = { name: null, confidence: 0 }
for (const profile of profiles) {
  const sim = cosineSimilarity(newEmbedding, profile.voiceprint)
  if (sim > bestMatch.confidence) {
    bestMatch = { name: profile.name, confidence: sim }
  }
}

if (bestMatch.confidence >= THRESHOLD) {
  return { match: true, speaker: bestMatch.name, confidence: bestMatch.confidence }
} else {
  return { match: false, speaker: null, confidence: bestMatch.confidence }
}
```

---

## Fluxo de Cadastro via Chat (Intent Detection)

```
useMayaChat detecta intent 'enroll_voice' quando mensagem contém:
  → "cadastrar nova voz" / "cadastrar voz" / "nova voz" / "adicionar voz"
        │
        ▼
Maya pergunta pelo nome (fluxo conversacional):
  → "Qual é o nome da pessoa que deseja cadastrar?"
        │
        ▼
Estado: pendingEnrollName = true
Usuário responde com o nome → capturado e armazenado
        │
        ▼
Maya instrui:
  → "Ok! Quando estiver pronto, clique em [● GRAVAR] e diga algumas
     frases por cerca de 10 segundos."
        │
        ▼
UI exibe VoiceEnrollModal (botão flutuante no cockpit)
        │
        ▼
Usuário grava → POST /api/speaker-enroll { name, audio }
        │
        ▼
Maya confirma: "✅ Voz de [Nome] cadastrada!"
oou erro: "❌ Não consegui capturar a voz. Tente em ambiente mais silencioso."
```

---

## Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Pacote Node.js | `vosk@0.3.39` | Binding nativo, sem Python |
| Formato de áudio | WAV 16kHz mono PCM16 | Exigido pelo Vosk |
| Modelo | `vosk-model-spk-0.4` | Apenas speaker ID, ~30 MB |
| Persistência | Supabase `user_facts` | Já existe no projeto, sem nova tabela |
| Schema multi-voz | category='voice_profile', 1 row por pessoa | Simples, sem migração |
| Threshold | 0.85 | Equilibra segurança vs. usabilidade |
| Fallback | Skip verify se não há perfis cadastrados | Permite uso sem cadastro |
| Cadastro | Via chat (intent detection) | UX natural, sem navegar menus |
| Deploy | Local/Docker apenas | Vosk não funciona no Vercel |

---

## Compatibilidade com sistema atual

A verificação de voz é **100% opcional e aditiva**:

```
Sistema atual:   Web Speech API → wake word → chat (sem verificação)
Com speaker ID:  Web Speech API → wake word → verify → chat (se autorizado)

Flag de ativação: EXISTS(SELECT 1 FROM user_facts WHERE category='voice_profile')?
  → SIM: verifica antes de processar o áudio
  → NÃO: responde normalmente (comportamento atual preservado)

maya-chat recebe opcionalmente: { message, speakerName: 'Juliano' }
  → Maya pode personalizar a resposta pelo nome do falante
  → Se speakerName=null → Maya responde como sempre
```

---

## Componentes novos a criar

```
src/
  app/api/
    speaker-enroll/route.ts   ← POST { name, audio } → salva Supabase
    speaker-verify/route.ts   ← POST { audio } → { match, speaker, confidence }
  lib/
    voskSpeaker.ts            ← singleton SpkModel + extractEmbedding + cosineSimilarity
  hooks/
    useSpeakerVerify.ts       ← verify(ms) + enroll(name, ms)
  components/cockpit/
    VoiceEnrollModal.tsx      ← modal/overlay de cadastro com botão gravar
```
