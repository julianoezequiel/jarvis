# TASK-001 — Implementar Autenticação JWT no API Gateway

**Board**: Linear  
**Sprint**: Sprint 1 — Foundation  
**Prioridade**: 🔴 **P0 — Crítica**  
**Estimativa**: 3 Story Points  
**Branch**: `feature/jarvis-TASK-001`  
**Status**: 🟡 **Em Progresso**  
**Início**: 2026-03-10  
**Término Previsto**: 2026-03-12  
**Responsável**: [Dev Senior]  

---

## 📝 Objetivo

Implementar um middleware JWT no API Gateway do Jarvis AIOS para validar tokens de autenticação em todas as requisições autenticadas. Isso garante que apenas clientes autorizados possam acessar os endpoints da API.

### Contexto

O API Gateway atualmente **não autentica requisições**, permitindo acesso não autorizado. Esta task implementa:
- Validação de JWT tokens
- Extração de claims (user_id, roles)
- Retejeição de requisições sem token válido
- Logging de eventos de autenticação

---

## ✅ Critérios de Aceitação

- [ ] Middleware JWT criado e integrado no API Gateway
- [ ] Tokens JWT podem ser gerados via endpoint `/auth/login`
- [ ] Tokens JWT são validados em endpoints autenticados
- [ ] Tokens expirados retornam 401 Unauthorized
- [ ] Tokens malformados/inválidos retornam 401
- [ ] Claims (user_id, roles, exp) são extraídos corretamente
- [ ] Testes unitários cobrindo todos os cenários (5+ testes)
- [ ] Testes de integração com endpoints autenticados
- [ ] API Documentation (Swagger) atualizada
- [ ] Nenhum regression em funcionalidades existentes

---

## 📄 Arquivos Afetados

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/api_gateway/middleware/jwt_middleware.py` | **Criar** | Middleware de validação JWT |
| `src/api_gateway/handlers/auth_handler.py` | **Modificar** | Adicionar endpoint `/auth/login` |
| `src/api_gateway/config/auth_config.py` | **Criar** | Configuração de JWT (secret, expiry) |
| `tests/api_gateway/test_jwt_middleware.py` | **Criar** | Testes do middleware (8+ cenários) |
| `tests/api_gateway/test_auth_handler.py` | **Criar** | Testes de login e geração de token |
| `docs/openapi.yaml` | **Modificar** | Adicionar schema de autenticação |
| `docs/security.md` | **Modificar** | Documentar estratégia de autenticação |
| `.env.example` | **Modificar** | Adicionar `JWT_SECRET`, `JWT_EXPIRY` |

---

## 📊 Log de Andamento

| Data | Hora | Status | Descrição |
|---|---|---|---|
| 2026-03-10 | 09:00 | 🟡 Iniciado | Task criada, documentação definida |
| 2026-03-10 | 10:30 | 🟡 Análise | Design aprovado, riscos identificados |
| 2026-03-10 | 14:00 | 🟡 Implementação | JwtMiddleware 50% pronta |
| 2026-03-11 | 09:00 | 🟡 Implementação | Middleware completa, testes iniciados |
| 2026-03-11 | 15:00 | 🟡 Testes | 6/8 testes passando |
| 2026-03-12 | 10:00 | 🟡 Code Review | PR enviada, review em progresso |
| 2026-03-12 | 14:00 | ✅ Concluído | Mergeada para develop |

---

## 🔗 Dependências

**Bloqueadores**: Nenhum (task inicial)

**Desbloqueia**:
- TASK-002: Implementar Rate Limiting (precisa de autenticação)
- TASK-003: Autorização por Roles (precisa de middleware JWT)
- TASK-004: Agentes (APIs protegidas)

---

## 📌 Notas

### Decisões de Design

1. **JWT em lugar de Session**: Stateless, escalável, ideal para APIs
2. **HS256 em lugar de RS256**: Mais simples no momento, sem certificados
3. **1 hora de expiração**: Balance entre segurança e UX

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Token roubado em trânsito | Baixa | Alto | HTTPS obrigatório, Header Authorization |
| Secret key exposta | Média | Crítica | Usar variável de ambiente, Rotate periodicamente |
| Clientes não suportam Authorization header | Baixa | Médio | Suportar token em query param como fallback |

### Próximas Ações

- [ ] Feedback do architect sobre HS256 vs RS256
- [ ] Setup de HTTPS em staging
- [ ] Treinar time sobre refresh tokens (TASK-010)

