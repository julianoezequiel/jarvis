# Arquitetura — Speaker Identification com Vosk

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

## Rota de Enrollment (cadastro único)

```
┌──────────────┐     WAV 10–20s     ┌───────────────────────┐
│   Frontend   │ ─────────────────► │ /api/speaker-enroll   │
│ (botão na    │                    │                        │
│  Settings)   │ ◄───────────────── │ → extrai vetor médio   │
│              │  { enrolled: true } │ → salva Supabase       │
└──────────────┘                    └───────────────────────┘
```

---

## Fluxo principal de verificação (após enrollment)

```
Usuário fala wake word "Maya"
        │
        ▼
useWakeWord detecta → dispara maya:status (listening)
        │
        ▼
useSpeakerVerify captura 3s de áudio
        │
        ▼
POST /api/speaker-verify
        │
   ┌────┴────┐
   ▼         ▼
match=true  match=false
   │         │
   ▼         ▼
Maya       Maya responde:
responde   "Não reconheço sua
normalmente voz, acesso negado."
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

## Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Pacote Node.js | `vosk@0.3.39` | Binding nativo, sem Python |
| Formato de áudio | WAV 16kHz mono PCM16 | Exigido pelo Vosk |
| Modelo | `vosk-model-spk-0.4` | Apenas speaker ID, ~30 MB |
| Persistência | Supabase `user_facts` | Já existe no projeto |
| Threshold | 0.85 | Equilibra segurança vs. usabilidade |
| Fallback | Skip verify se não há voiceprint | Permite uso sem cadastro |
| Deploy | Local/Docker apenas | Vosk não funciona no Vercel |

---

## Compatibilidade com sistema atual

A verificação de voz é **100% opcional e aditiva**:

```
Sistema atual:   Web Speech API → wake word → chat (sem verificação)
Com speaker ID:  Web Speech API → wake word → verify → chat (se autorizado)

Flag de ativação: user_facts onde category='voice_print' existe?
  → SIM: verifica antes de responder
  → NÃO: responde normalmente (comportamento atual preservado)
```
