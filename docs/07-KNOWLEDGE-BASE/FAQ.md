# ❓ FAQ — Perguntas Frequentes

> **Documento**: Respostas rápidas a dúvidas comuns  
> **Status**: ✅ Completo  
> **Público**: Todos  
> **Formato**: Pergunta × Resposta agrupado por tema

---

## 🚀 Começando

### "Por onde começo?"
1. Leia [`00-START/QUICK_START.md`](../00-START/QUICK_START.md) (5 min)
2. Siga [`03-DEVELOPMENT/SETUP.md`](../03-DEVELOPMENT/SETUP.md) (20 min)
3. Abra [`http://localhost:3000`](http://localhost:3000) no browser
4. Use senha padrão: `1234`

### "Quais são as chaves de API que preciso?"
1. **Anthropic** — [console.anthropic.com](https://console.anthropic.com) (Claude)
2. **OpenAI** — [platform.openai.com](https://platform.openai.com) (Voz Realtime)
3. **Supabase** — [supabase.com](https://supabase.com) (Banco de dados)

Todas gratuitas no início. Supabase oferece 500 GB/mês grátis; Claude e OpenAI usam modelo pay-as-you-go (~$0.003 por task).

### "Se estou desenvolvendo em local, o Supabase gratuito é suficiente?"
Sim, perfeitamente. 500 GB/mês é mais que suficiente para dados de desenvolvimento + testes.

Em produção com 1000+ usuários ativos/dia:
- Esperar ~50–100 GB/mês
- Custo: ~$25–50/mês no Supabase (plano pro)

---

## 💬 Chat & Voz

### "O chat não está respondendo. O que fazer?"
1. Verificar se `ANTHROPIC_API_KEY` está em `.env.local`
2. Verificar no console (F12 → Network) se `/api/jarvis-chat` está retornando erro
3. Se retorna 400: chave inválida; se 500: erro do servidor

### "A voz não funciona. Por quê?"
Web Speech API (wake word) **é Chrome-only**. Firefox e Edge não suportam.

Se usar Chrome e ainda não funcionar:
1. Verificar permissão de microfone (site pode estar bloqueado)
2. Flag experimetnal pode estar desativada → `chrome://flags` procure "speech" e habilite
3. Verificar `OPENAI_API_KEY` em `.env.local`

### "Como ativo a voz pela primeira vez?"
1. Após enter a senha, "MicPermissionOverlay" solicita permissão
2. Clique "permitir"
3. Espere boot sequence (~3s)
4. Diga "JARVIS, olá" para testar

### "Posso usar idiomas além de português?"
Claude e OpenAI suportam 90+ idiomas. Se quiser conversar em outro idioma:
1. Edite `src/lib/jarvisPrompt.ts` (language = "english")
2. Redeploy

Sistema JARVIS é multilíngue por design.

---

## 🤖 Agentes & Delegação

### "Como delego uma tarefa para um agente?"
Pode fazer 2 formas:

**Forma 1: Explícitamente (no chat)**
```
Jarvis, preciso que @writer crie copy para landing page

[Jarvis detecta implicitamente e delega para @writer]
```

**Forma 2: Bloco de delegação (para dev testing)**
```
[DELEGATE: {
  "agent": "@analyst",
  "task": "Analisar mercado de SaaS no Brasil",
  "priority": "high",
  "context": "Preciso disso para pitch dos investors"
}]
```

### "Quantos agentes podem rodar em paralelo?"
Todos os 21 simultaneamente via `Promise.all()`. Claude Node.js SDK suporta múltiplas requisições sem limites artificiais. Único limite: tokens/minuto (está documentado em `.github/instructions/`).

### "Posso criar um novo agente?"
Sim. Dois caminhos:

1. **Rápido** (sem deploy):
   - Instrua JARVIS verbalmente: "Crie para mim um agente @meu-analista especializado em..."
   - JARVIS salva no contexto via `remember_fact`
   - Próxima conversa, usa esse agente

2. **Permanente** (com código):
   - Edite [`src/lib/agentRouter.ts`](../../src/lib/agentRouter.ts)
   - Adicione novo agente ao dicionário
   - Documente em `domain-knowledge.instructions.md`
   - Commit + push (redeploy automático)

---

## 📁 Arquivos & Entrega

### "Como os arquivos aparecem em DOCS?"
JARVIS executa `write_file` ou `save_project` tool call → arquivo salvo em `jarvis_files` table → polling a cada 5s detecta novo arquivo → aparece em painel DOCS.

```sql
INSERT INTO jarvis_files (path, content, project_name)
VALUES ('README.md', '# Hello', 'meu-projeto');
-- Com project_name = agrupado em ProjectCard
-- Sem project_name = aparece como LooseFile
```

### "Como baixo os arquivos?"
Na aba DOCS:
- **ProjectCard** (com projeto): botão "ZIP" baixa todos os arquivos agrupados
- **LooseFile** (sem projeto): link direto de download

### "Os arquivos são salvos permanentemente?"
Sim, em `jarvis_files` table do Supabase. Permanecem até você deletar manualmente.

Para deletar:
```bash
# Via Supabase SQL Editor:
DELETE FROM jarvis_files WHERE id = '...'
```

---

## 🔐 Segurança & Privacidade

### "Os meus dados estão seguros?"
Supabase usa encriptação HTTPS + Row Level Security (RLS). Chave de acesso anônima tem limitações.

**Nível de segurança**: Adequado para dados pessoais não-sensíveis (preferências, tarefas). Para dados financeiros sensíveis, usar autenticação adicional (não implementada ainda).

### "Minhas conversas são privadas?"
Conversas são salvas em `jarvis_memory` table (Supabase). Qualquer pessoa com chave anônima pode ler todas as conversas (não há usuário loguado neste MVP).

**Para MVP**: Considere usar em desktop local apenas. 
**Para produção**: Implementar user authentication via Supabase Auth.

---

## 🚀 Deploy & Produção

### "Como faço deploy em produção?"
1. Criar conta Vercel, linkar repo GitHub
2. Vercel auto-detecta Next.js, configura
3. Cada `git push` redeploya automaticamente (~30s)
4. Custom domain: apontar DNS para Vercel

Arquivo `vercel.json` já configurado com:
- `maxDuration: 60` (funções podem rodar até 60s)
- Cron job para `/api/oraculo/cycle` a cada 6 horas

### "Quanto custa rodar Jarvis em produção?"
**Estimativa mensal** (1K usuários ativos/dia):

| Serviço | Custo |
|---|---|
| Claude API | $30–50 |
| OpenAI Realtime | $20–30 |
| Supabase (scale) | $25–50 |
| Vercel | Gratuito até limites generosos |
| **Total** | ~$75–130 |

**Preço sugerido ao cliente**: $29–99/mês → Margem bruta: 78–86%

---

## 🐛 Troubleshooting Técnico

### "Erro: CORS blocked"
Jarvis está em domain A, API em domain B. Verificar `CORS` headers em `/api/*/*.ts`:

```typescript
// Adicionar ao route handler:
res.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_FRONTEND_URL);
```

### "Worker deixou de rodar"
`jarvis-worker.js` para automaticamente se:
- `.env` falta `ANTHROPIC_API_KEY`
- Erro não-tratado ocorre

Verificar logs:
```bash
node jarvis-worker.js  # rode manual para ver logs
```

### "Database connection timeout"
Supabase pode estar lento se:
1. Query é muito pesada (muitas linhas)
2. RLS policy é custosa
3. Tabela não tem índice

Soluções:
1. Adicionar índice: `CREATE INDEX idx_session ON jarvis_memory(session_id)`
2. Usar `LIMIT` em queries
3. Aumentar pool de conexões em Supabase settings

### "Vercel deployment falha"
Logs em Vercel dashboard `Deployments` → click deployment → scroll para "build" error.

Causa comum: `.env.local` falta no Vercel. **Solução**:
1. Ir a Vercel project settings
2. → Environment Variables
3. Adicionar `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, chaves Supabase
4. Redeploy

---

## 🎯 Performance & Otimização

### "Chat está lento. Por quê?"
1. Claude peut levar 1–3s em primeira resposta (latência de rede)
2. Supabase query pode retardar `search_memory`
3. Browser pode estar sobrecarregado (muitas abas)

Debugging:
```javascript
// F12 → Console, rode:
performance.mark('chat-send');
// [escrever mensagem]
performance.mark('chat-receive');
console.table(performance.getEntriesByName('chat-send'));
```

### "Quantas requisições paralelas Jarvis suporta?"
Claude API: sem limite artificial, mas cuidado com token rates (limite por minuto). Supabase: até 100 conexões simultâneas no tier gratuito.

**Recomendação**: Menos de 50 usuários simultâneos antes de scale up.

---

## 📚 Dúvidas de Código

### "Como adicionar um novo endpoint REST?"
1. Criar `src/app/api/novo-endpoint/route.ts`
2. Implementar `POST` handler
3. Testar: `curl -X POST http://localhost:3000/api/novo-endpoint`

### "Como usar TypeScript strict?"
Jarvis usa `"strict": true` em `tsconfig.json`. Todas as variáveis **devem ter tipo explícito**:

```typescript
// ❌ Evitar
const data = fetch(...);

// ✅ Fazer
const data: Promise<Response> = fetch(...);
```

### "Reloadable é components hot? (HMR)"
Sim, Next.js dev server tem HMR ativado. Componentes React recarregam automaticamente ao salvar. Server-side code. changes requerem reload manual.

---

## 💡 Ideias & Roadmap

### "Posso adicionar integração com Slack?"
Já é roadmap. Passo a passo:
1. Criar `/api/slack/webhook` que recebe eventos
2. Parsear slack messages → passa para Jarvis
3. Jarvis responde → POST para Slack API

Estimado 2–3 dias de desenvolvimento.

### "E integrações com Zapier/Make?"
Usando Zapier's webhook system. Rota: Zapier trigger → HTTP POST a `/api/zapier` → Jarvis processa → salva resultado.

### "Posso treinar Jarvis em documentação específica?"
Sistema atual usa RAG básico via `search_memory`. Para retrieval melhorado:
1. Usar Supabase pgvector (embeddings)
2. Indexar docs do usuário
3. Claude consulta embeddings antes de responder

Roadmap Q3 2026.

---

## 🎤 Feedback & Contribuição

### "Encontrei um bug. Como reporto?"
1. **GitHub Issues**: [github.com/seu-usuario/meu-jarvis/issues](https://github.com)
2. **Email**: contato@jarvis.local
3. **Discord**: #bugs channel

Incluir: passos para reproduzir, OS, browser, logs completos.

### "Quero contribuir. Como?"
1. Fork repository
2. Criar branch `feature/minha-feature`
3. Fazer PR com descrição clara
4. Revisor aprova/pede mudanças
5. Merge

Siga convenções em `.github/instructions/`.

---

## ✅ Checklist de Validação

Quando algo não funciona, seguir esta checklist:

- [ ] Chaves de API estão em `.env.local`
- [ ] `.env.local` não está versionado (no `.gitignore`)
- [ ] `npm install` rodou com sucesso
- [ ] `npm run dev` está rodando
- [ ] Browser é Chrome (para voz)
- [ ] Console (F12) não mostra erro vermelho
- [ ] Vercel logs (se em produção) não mostram erro
- [ ] Supabase status: [status.supabase.io](https://status.supabase.io)
- [ ] OpenAI API status: [status.openai.com](https://status.openai.com)

**Tudo ✅?** Próximo passo: abra GitHub Issue com prints + logs.

---

**Última atualização**: 2026-03-10

**Perguntas não respondidas?** Abra uma [Discussion](https://github.com) ou perginte em nosso Discord.
