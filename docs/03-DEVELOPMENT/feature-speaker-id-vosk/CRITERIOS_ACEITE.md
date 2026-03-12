# Critérios de Aceite — Speaker Identification com Vosk (Multi-Usuário)

## Funcionais

### FASE 1 — Setup
- [ ] `npm install vosk wavefile` executado sem erros
- [ ] Pasta `models/vosk-model-spk-0.4/` existe e contém `ivector_extractor.conf`
- [ ] `models/` está no `.gitignore`
- [ ] Script de teste `node teste-vosk.js` imprime "✅ Modelo carregado com sucesso"

### FASE 2 — Backend lib
- [ ] `src/lib/voskSpeaker.ts` criado
- [ ] `extractEmbedding(wavBuffer)` retorna array de 128 números para áudio válido
- [ ] `extractEmbedding(wavBuffer)` retorna `null` para áudio vazio/curto
- [ ] `cosineSimilarity(a, b)` retorna valor entre 0 e 1
- [ ] `cosineSimilarity(x, x)` retorna 1.0 (mesmo vetor)
- [ ] Modelo carregado como singleton (não recarrega a cada request)

### FASE 3 — Rota Enroll (multi-usuário)
- [ ] `POST /api/speaker-enroll` com `{ name, audio }` retorna `{ enrolled: true, name, dimensions: 128 }`
- [ ] Salva no Supabase `user_facts` com `category='voice_profile'` e `fact = JSON { name, voiceprint }`
- [ ] Segunda chamada com mesmo nome atualiza o perfil (não duplica)
- [ ] Perfis diferentes (nomes diferentes) coexistem em linhas separadas
- [ ] `GET /api/speaker-enroll` retorna lista `{ profiles: [{id, name, enrolledAt}] }`
- [ ] `DELETE /api/speaker-enroll` com `{ name }` remove o perfil correto
- [ ] Retorna erro 422 se o áudio for inválido ou muito curto

### FASE 4 — Rota Verify (best match entre todos os perfis)
- [ ] `POST /api/speaker-verify` compara com **todos** os perfis cadastrados
- [ ] Retorna `{ match: true, speaker: 'Juliano', confidence: 0.91, reason: 'compared' }` para voz reconhecida
- [ ] Retorna `{ match: false, speaker: null, confidence: 0.62 }` para voz não reconhecida
- [ ] Sem nenhum perfil cadastrado: retorna `{ match: true, speaker: null, reason: 'no_enrollment' }`
- [ ] `confidence` é um float com 4 casas decimais

### FASE 5 — Frontend hook
- [ ] `useSpeakerVerify().verify(3000)` grava 3s e retorna `{ match, speaker, confidence }`
- [ ] `useSpeakerVerify().enrollByName(name, 12000)` grava 12s e cadastra com o nome dado
- [ ] `useSpeakerVerify().listProfiles()` retorna array de perfis cadastrados
- [ ] `useSpeakerVerify().deleteProfile(name)` remove um perfil
- [ ] Stream do microfone é encerrado após uso (sem leak de recursos)

### FASE 6 — VoiceEnrollModal
- [ ] Modal aparece sobre o cockpit quando `enrollFlow.pendingName` está definido
- [ ] Exibe o nome da pessoa que será cadastrada
- [ ] Botão ⬤ GRAVAR inicia gravação de 12 segundos
- [ ] Durante gravação: countdown regressivo visível (12...11...10...)
- [ ] Após sucesso: exibe "✅ Voz de [Nome] cadastrada com sucesso!"
- [ ] Após erro: exibe mensagem de erro com instrução para tentar novamente
- [ ] Modal fecha automaticamente após conclusão (sucesso ou erro)

### FASE 7 — Cadastro via chat (intent detection)
- [ ] Usuário digita "Cadastrar nova voz" → Maya pergunta o nome
- [ ] Variações detectadas: "cadastrar voz", "nova voz", "adicionar voz", "registrar voz"
- [ ] Usuário informa o nome → `enrollFlow.pendingName` é definido → VoiceEnrollModal exibe
- [ ] Após gravação bem-sucedida: Maya confirma via chat com nome da pessoa
- [ ] Após erro: Maya orienta tentar novamente em ambiente silencioso
- [ ] Fluxo normal do chat não é interrompido para outras mensagens

### FASE 8 — Camada pré-transcrição (wake word)
- [ ] Após wake word detectado: captura 2-3s de áudio para verificação **antes** de processar
- [ ] Se `match=true` e `speaker='Juliano'`: prossegue; `speakerName='Juliano'` enviado ao chat
- [ ] Se `match=true` e `reason='no_enrollment'`: prossegue sem restrição (nenhum perfil cadastrado)
- [ ] Se `match=false` e `reason='compared'`: comando **não processado**, sem resposta da Maya
- [ ] Maya pode personalizar resposta pelo nome: "Olá Mayara!" quando reconhecida
- [ ] Comportamento atual preservado quando não há perfis cadastrados

---

## Não-funcionais

- [ ] Modelo Vosk carregado como singleton (não recarrega por request)
- [ ] Latência de verificação < 2.5 segundos (3s de gravação + processamento)
- [ ] Implementação atual (Web Speech API + useMayaChat) **não é alterada**
- [ ] Sem erros de TypeScript (`npx tsc --noEmit` passa)
- [ ] Sem warnings de segurança (sem chaves expostas no frontend)
- [ ] `models/` não commitado no git
- [ ] Múltiplos perfis de voz na mesma instância — sem degradação de performance

---

## Notas de Deploy

| Ambiente | Speaker ID funciona? | Motivo |
|---|---|---|
| `npm run dev` local | ✅ Sim | Filesystem disponível, vosk nativo |
| Docker local | ✅ Sim | Com volume montando `models/` |
| Vercel | ❌ Não | Sem filesystem persistente |
| VPS / servidor próprio | ✅ Sim | Com `models/` no servidor |


## Funcionais

### FASE 1 — Setup
- [ ] `npm install vosk wavefile` executado sem erros
- [ ] Pasta `models/vosk-model-spk-0.4/` existe e contém `ivector_extractor.conf`
- [ ] `models/` está no `.gitignore`
- [ ] Script de teste `node teste-vosk.js` imprime "✅ Modelo carregado com sucesso"

### FASE 2 — Backend lib
- [ ] `src/lib/voskSpeaker.ts` criado
- [ ] `extractEmbedding(wavBuffer)` retorna array de 128 números para áudio válido
- [ ] `extractEmbedding(wavBuffer)` retorna `null` para áudio vazio/curto
- [ ] `cosineSimilarity(a, b)` retorna valor entre 0 e 1
- [ ] `cosineSimilarity(x, x)` retorna 1.0 (mesmo vetor)
- [ ] Modelo carregado como singleton (não recarrega a cada request)

### FASE 3 — Rota Enroll
- [ ] `POST /api/speaker-enroll` com áudio base64 retorna `{ enrolled: true, dimensions: 128 }`
- [ ] Salva corretamente no Supabase `user_facts` com `category='voice_print'`
- [ ] Segunda chamada sobrescreve o voiceprint anterior (upsert)
- [ ] Retorna erro 422 se o áudio for inválido ou muito curto

### FASE 4 — Rota Verify
- [ ] `POST /api/speaker-verify` com áudio da mesma voz retorna `{ match: true, confidence >= 0.85 }`
- [ ] `POST /api/speaker-verify` com áudio de voz diferente retorna `{ match: false }`
- [ ] Sem enrollment no Supabase: retorna `{ match: true, reason: 'no_enrollment' }` (não bloqueia)
- [ ] `confidence` é um float com 4 casas decimais

### FASE 5 — Frontend hook
- [ ] `useSpeakerVerify().verify(3000)` grava 3s e chama `/api/speaker-verify`
- [ ] `useSpeakerVerify().enroll(15000)` grava 15s e chama `/api/speaker-enroll`
- [ ] Stream do microfone é fechado após uso (sem leak de recursos)

### FASE 6 — Settings UI
- [ ] Botão "Cadastrar minha voz" aparece no SettingsPanel
- [ ] Durante gravação: botão exibe "Gravando 15s... fale normalmente" e fica desabilitado
- [ ] Após sucesso: exibe "✅ Voz cadastrada com sucesso!"
- [ ] Após erro: exibe mensagem de erro

### FASE 7 — Integração com Wake Word
- [ ] Após wake word, sistema captura 3s de áudio para verificação
- [ ] Se `match=false` e `reason='compared'`: Maya não responde ao comando
- [ ] Se `match=true` ou `reason='no_enrollment'`: Maya responde normalmente
- [ ] Comportamento atual (sem speaker ID) preservado quando não há voiceprint cadastrado

---

## Não-funcionais

- [ ] Modelo Vosk carregado como singleton (não recarrega por request)
- [ ] Latência de verificação < 2 segundos (3s de gravação + processamento)
- [ ] Implementação atual (Web Speech API + useMayaChat) **não é alterada**
- [ ] Sem erros de TypeScript (`npx tsc --noEmit` passa)
- [ ] Sem warnings de segurança (sem chaves expostas no frontend)
- [ ] `models/` não commitado no git

---

## Notas de Deploy

| Ambiente | Speaker ID funciona? | Motivo |
|---|---|---|
| `npm run dev` local | ✅ Sim | Filesystem disponível, vosk nativo |
| Docker local | ✅ Sim | Com volume montando `models/` |
| Vercel | ❌ Não | Sem filesystem persistente |
| VPS / servidor próprio | ✅ Sim | Com `models/` no servidor |
