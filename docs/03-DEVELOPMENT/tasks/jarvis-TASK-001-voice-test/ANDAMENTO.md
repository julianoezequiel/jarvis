# ANDAMENTO.md — TASK-001-voice-test: Testes do Speaker ID (Reconhecimento de Voz)

**Branch:** `feature/jarvis-TASK-001-voice-test`  
**Criada em:** 12/03/2026  
**Base:** `feature/jarvis-setup` (commit `78a7ed0`)  

---

## Contexto

A implementação do sistema de identificação de voz (vosk speaker ID) foi concluída e commitada, mas **nenhum teste real com microfone e voz humana foi realizado**. Esta branch existe para:

1. Testar o pipeline completo ponta a ponta
2. Registrar bugs encontrados e corrigi-los
3. Ajustar o threshold se necessário
4. Validar os critérios antes de mergear para `main`

---

## O que foi implementado (não testado)

| Componente | Arquivo | Situação |
|---|---|---|
| Extração de embedding (Python) | `src/scripts/vosk_speaker.py` | ✅ Implementado — teste sintético OK (tom puro → `no_voice_detected` correto) |
| Bridge Node→Python | `src/lib/voskSpeaker.ts` | ✅ Implementado — não testado com voz real |
| API cadastro de voz | `src/app/api/speaker-enroll/route.ts` | ✅ Implementado — GET retorna `{"profiles":[]}` ✅ |
| API verificação | `src/app/api/speaker-verify/route.ts` | ✅ Implementado — não testado |
| Hook React | `src/hooks/useSpeakerVerify.ts` | ✅ Implementado — não testado |
| Modal de cadastro (UI) | `src/components/cockpit/VoiceEnrollModal.tsx` | ✅ Implementado — não testado visualmente |
| Buffer PCM16 rolling | `MicPermissionOverlay.tsx` | ✅ Implementado — não validado com áudio real |
| Detecção de intenção | `useMayaChat.ts` | ✅ Implementado — não testado |
| Settings: perfis + threshold | `SettingsPanel.tsx` | ✅ Implementado — não testado visualmente |

---

## Plano de Testes

### Teste 1 — Cadastro via chat de texto
- [ ] Digitar "cadastrar nova voz para Juliano" no chat
- [ ] Verificar se modal `VoiceEnrollModal` abre com nome "Juliano" pré-preenchido
- [ ] Aguardar countdown 5s, falar claramente
- [ ] Verificar resposta da API: `{ ok: true, name: "Juliano" }`
- [ ] Verificar se perfil aparece em `GET /api/speaker-enroll`
- [ ] Verificar se perfil aparece na aba Configurações → Identificação de Voz

### Teste 2 — Cadastro via voz (wake word)
- [ ] Dizer "Maya, cadastrar nova voz para Mayara"
- [ ] Verificar se modal abre com "Mayara" sugerido
- [ ] Completar cadastro
- [ ] Verificar no Supabase: `user_facts` com `category='voice_profile'`

### Teste 3 — Verificação de falante
- [ ] Com 1+ perfil cadastrado, ativar toggle "Verificação de voz" em Configurações
- [ ] Enviar mensagem por voz
- [ ] Verificar log no console: `verification: match=true, speaker=Juliano, conf=0.XX`
- [ ] Verificar se prefixo `[Falante: Juliano]` chega ao LLM

### Teste 4 — Falante não reconhecido
- [ ] Com perfil de Juliano cadastrado, pedir a outra pessoa falar
- [ ] Verificar: `match=false`, prefixo `[Falante não reconhecido]`

### Teste 5 — Atualização de voz (regravar)
- [ ] Em Configurações, clicar ↺ no perfil existente
- [ ] Verificar se modal abre com nome pré-preenchido
- [ ] Regravar e confirmar que perfil foi sobrescrito (mesmo ID ou novo com mesmo nome)

### Teste 6 — Remoção de voz
- [ ] Clicar ✕ no perfil
- [ ] Confirmar dialog de confirmação
- [ ] Verificar que desaparece da lista e do Supabase

### Teste 7 — Threshold (sensibilidade)
- [ ] Com verificação ativada e perfil cadastrado, ajustar slider para 0.60 (baixo)
- [ ] Verificar se reconhece com mais facilidade
- [ ] Ajustar para 0.95 (alto)
- [ ] Verificar se fica mais restrito (possível `no_match` até para o próprio usuário)

---

## Bugs Encontrados

_(preencher durante os testes)_

| # | Descrição | Arquivo | Status |
|---|---|---|---|
| — | — | — | — |

---

## Ajustes Necessários

_(preencher durante os testes)_

---

## Resultado Final

- [ ] Todos os 7 testes passaram
- [ ] Threshold padrão validado (0.85 ou ajustado)
- [ ] Zero erros TypeScript
- [ ] Pronto para merge em `main`
