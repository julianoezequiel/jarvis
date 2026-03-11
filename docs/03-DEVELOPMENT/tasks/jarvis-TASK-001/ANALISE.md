# TASK-001 — Análise Técnica: Autenticação JWT

**Revisão**: 1.0  
**Data**: 2026-03-10  
**Autor**: [Dev Senior]  

---

## 1. Contexto e Motivação

### Por que essa task existe?

O Jarvis AIOS necessita de um mecanismo robusto de autenticação para proteger seus endpoints. Atualmente, **qualquer cliente pode chamar a API** sem credenciais, criando um risco de segurança crítico.

### Que problema resolve?

- ❌ **Antes**: API aberta, sem validação de identidade
- ✅ **Depois**: API protegida, apenas users autenticados podem acessar

### Impacto esperado

- **Segurança**: Elimina acesso não autorizado
- **Conformidade**: Atende requisitos de GDPR, SOC2
- **User Experience**: Usuários podem ter sessões personalizadas
- **Analytics**: Podemos rastrear quem faz o quê

---

## 2. Decisões de Design

### 2.1 Escolha do Mecanismo: JWT vs Alternativas

| Mecanismo | Vantagens | Desvantagens | Decisão |
|---|---|---|---|
| **JWT** | Stateless, escalável, padrão REST | Sem revogação instantânea, overhead | ✅ **ESCOLHIDO** |
| **Session (BD)** | Fácil revogar | Requer estado no servidor, não escalável | ❌ |
| **OAuth2** | Padrão, suporta delegação | Complexo, mais componentes | ⏱️ Futuro |
| **API Keys** | Simples | Sem expressão, difícil rotação | ❌ |

**Justificativa**: JWT fornece melhor trade-off entre segurança, escalabilidade e simplicidade para um MVP.

### 2.2 Algoritmo: HS256 vs RS256

| Algoritmo | Pros | Cons | Decisão |
|---|---|---|---|
| **HS256** (HMAC) | Simples, rápido, sem infra | Uma secret shared para assinar + validar | ✅ **FASE 1** |
| **RS256** (RSA) | Apenas server assina, clients só validam | Requer certificados, mais complexo | ⏱️ **FASE 2** |

**Justificativa**: HS256 é suficiente para MVP. RS256 será considerado quando escalarmos para múltiplos domínios assinadores.

**Migração planejada**: RS256 adicionado sem quebrar clientes (suportar ambos).

### 2.3 Expiração do Token

| Duração | Vantagens | Desvantagens | Decisão |
|---|---|---|---|
| **1 hora** | Segurança balanceada | UX ruim (relogins frequentes) | ✅ **FASE 1** |
| **24 horas** | Melhor UX | Segurança comprometida | ❌ |
| **Sem expiração** | Melhor UX | Risco se roubado | ❌ |
| **Com refresh token** | Segurança + UX ótima | Implementação mais complexa | ⏱️ **TASK-010** |

**Justificativa**: 1 hora é prudente para fase inicial. Refresh tokens virão após MVP ser validado.

### 2.4 Armazenamento do Secret

| Opção | Segurança | Praticidade | Decisão |
|---|---|---|---|
| **Variável de ambiente** | ✅ Boa | ✅ Fácil | ✅ **FASE 1** |
| **arquivo .env** | ⚠️ Média (nunca commitar) | ✅ Fácil | ✅ **FASE 1** |
| **HashiCorp Vault** | ✅✅ Excelente | ❌ Complexo | ⏱️ **FASE 3** |
| **AWS Secrets Manager** | ✅✅ Excelente | ⚠️ Acoplamento AWS | ⏱️ **FASE 3** |

**Justificativa**: Env vars são suficientes para início. Vault será adicionado quando temos múltiplos ambientes.

---

## 3. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação | Contingência |
|---|---|---|---|---|
| Token roubado em trânsito | Baixa | 🔴 Crítico | HTTPS obrigatório em prod | Forced logout, token revocation list |
| Secret key exponha | Média | 🔴 Crítico | Não commitar na `env.example`, usar `env.local` secreto | Rotação frequente de secret |
| Incompatibilidade com auth legacy | Baixa | 🟡 Médio | Manter endpoint de auth antiga por 6 meses | Dupla autenticação durante transição |
| Performance validação JWT | Muição baixa | 🟢 Baixo | Cache de keys (opcional) | Cache com Redis |
| Client esquece de enviar token | Média | 🟡 Médio | Mensagem de erro clara, docs completas | Fallback para API key durante onboarding |

---

## 4. Sequência de Validação (QA)

O QA deve seguir exatamente esta sequência para validar a task:

### 4.1 Testes Sem Token
```bash
curl -X GET http://localhost:8000/api/agents
# ❌ Esperado: 401 Unauthorized
```

### 4.2 Testes Com Token Válido
```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -d '{"email":"user@example.com","password":"pass123"}' | jq '.token')

# 2. Usar token
curl -H "Authorization: Bearer $TOKEN" \
  -X GET http://localhost:8000/api/agents
# ✅ Esperado: 200 OK + lista de agentes
```

### 4.3 Testes Com Token Expirado
```bash
# Token manualmente expirado no BD ou simulado
curl -H "Authorization: Bearer eyJ...EXPIRED..." \
  -X GET http://localhost:8000/api/agents
# ❌ Esperado: 401 Unauthorized + "Token expired"
```

### 4.4 Testes Com Token Malformado
```bash
curl -H "Authorization: Bearer INVALID" \
  -X GET http://localhost:8000/api/agents
# ❌ Esperado: 401 Unauthorized + "Invalid token"
```

### 4.5 Testes de Carga
```bash
# 1000 requisições simultâneas com validação JWT
npm run load-test -- --requests 1000 --concurrency 50
# ✅ Esperado: < 10ms por validação, < 1% erro
```

### 4.6 Teste de Compatibilidade com Cliente Legado
```bash
# Alguns clientes enviam token como query param
curl 'http://localhost:8000/api/agents?token=eyJ...'
# ✅ Esperado: 200 OK (suporte para ambos)
```

---

## 5. Impacto em Outros Módulos

### Módulos Afetados

| Módulo | Tipo | Impacto | Ação Necessária |
|---|---|---|---|
| **API Gateway** | Modificação | Middleware adicionado | Testes de regressão |
| **Agentes** | Nenhum | Transparente | Nenhuma ação |
| **Persistência** | Nova tabela | Armazenar failed login attempts | Criar tabela `auth_logs` |
| **CLientes (web/mobile)** | **Quebra** | Precisam enviar Authorization header | Update em próxima versão |

### Plano de Rollout

```
Fase 1: Deploy em dev (7 dias)
├─ Testes completos
├─ Feedback do time

Fase 2: Soft-launch em staging (3 dias)
├─ Monitorar erros de autenticação
├─ Validar com clientes piloto

Fase 3: Prod com fallback (7 dias)
├─ Ambos auth antigo e JWT funcionam
├─ Gradualmente migrar clientes

Fase 4: Deprecation do auth antigo (30 dias)
├─ Remover suporte ao auth antigo
```

---

## 6. Estimativa de Esforço

| Atividade | Tempo Est. | Detalhes |
|---|---|---|
| **Design e análise** | 2h | Criar esse documento, discussões |
| **Implementação** | 4h | JwtMiddleware + handler login |
| **Testes unitários** | 3h | 8-10 testes cobrindo casos |
| **Testes de integração** | 1h | E2E flow com endpoints reais |
| **Documentação** | 1h | OpenAPI, README, env.example |
| **Code review e ajustes** | 2h | Feedback, refinements |
| **Deploy e validação** | 1h | Staging, health checks |
| **TOTAL** | **14h** | ≈ 2 dias de dev + 1 dia review |

---

## 7. Dependências Técnicas

### Bibliotecas Necessárias

```python
# Python example
pyjwt==2.8.1              # JWT encoding/decoding
cryptography==41.0.0      # Para RS256 futuramente
python-dotenv==1.0.0      # Variáveis de ambiente
passlib[bcrypt]==1.7.4    # Hash de password
```

### Endpoints Existentes que Precisam Proteção

```
GET  /api/agents              ← PROTEGER
POST /api/agents/{id}/execute ← PROTEGER
GET  /api/tasks               ← PROTEGER
POST /api/admin/...           ← PROTEGER

POST /auth/login              ← NOVO (público)
GET  /health                  ← MANTER público
```

---

## 8. Documentação de Referência

- [JWT.io - Visual JWT Debugger](https://jwt.io)
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## 9. Checklist Pré-Implementação

- [x] Decisões de design aprovadas pelo architect
- [x] Riscos identificados e mitigações definidas
- [x] Sequência de validação acordada com QA
- [x] Dependências técnicas disponíveis
- [x] Documentação de referência consultada
- [ ] Implementação começada (próximo passo)

---

**Análise finalizada em**: 2026-03-10 14:30  
**Próxima revisão**: Durante implementação
**Escalações necessárias**: Nenhuma no momento

