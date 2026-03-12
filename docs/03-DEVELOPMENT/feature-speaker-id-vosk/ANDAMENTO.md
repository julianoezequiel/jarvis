# Andamento — Speaker Identification com Vosk

## Status Geral: ⏳ Documentação criada — Aguardando implementação

---

## Log

### 2026-03-12
- ✅ Documentação inicial criada:
  - `README.md` — visão geral
  - `ARQUITETURA.md` — diagramas e decisões técnicas
  - `MODELO_DOWNLOAD.md` — como baixar o modelo Vosk SpkModel
  - `PASSO_A_PASSO.md` — código completo de todas as fases
  - `CRITERIOS_ACEITE.md` — checklist funcional e não-funcional
  - `ANDAMENTO.md` — este arquivo

---

## Próximos Passos

1. **Baixar o modelo** (ver [MODELO_DOWNLOAD.md](./MODELO_DOWNLOAD.md))
   ```powershell
   New-Item -ItemType Directory -Force -Path models
   Invoke-WebRequest -Uri "https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip" -OutFile "models\vosk-model-spk-0.4.zip"
   Expand-Archive -Path "models\vosk-model-spk-0.4.zip" -DestinationPath "models\" -Force
   Remove-Item "models\vosk-model-spk-0.4.zip"
   ```

2. **Instalar dependências**
   ```bash
   npm install vosk wavefile
   ```

3. **Criar os arquivos de código** conforme [PASSO_A_PASSO.md](./PASSO_A_PASSO.md)

4. **Testar enrollment + verify** com um script simples antes de integrar ao frontend

---

## Fases

| Fase | Descrição | Status |
|---|---|---|
| FASE 1 | Setup: instalar deps + baixar modelo | ⏳ Pendente |
| FASE 2 | `src/lib/voskSpeaker.ts` | ⏳ Pendente |
| FASE 3 | `src/app/api/speaker-enroll/route.ts` | ⏳ Pendente |
| FASE 4 | `src/app/api/speaker-verify/route.ts` | ⏳ Pendente |
| FASE 5 | `src/hooks/useSpeakerVerify.ts` | ⏳ Pendente |
| FASE 6 | Botão enrollment no SettingsPanel | ⏳ Pendente |
| FASE 7 | Integração com wake word | ⏳ Pendente |
