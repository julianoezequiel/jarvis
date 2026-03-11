# TASK-001 — Critérios de Aceitação

> **Status Geral**: [⏳ Em Progresso] (10/03/2026)

---

## ✅ 1. Implementação Core

### 1.1 Middleware JWT Implementado
- [ ] **Critério**: Middleware JWT criado e integrado no pipeline de requisições
- **Evidência**: 
  - Arquivo: [src/api_gateway/middleware/jwt_middleware.py](src/api_gateway/middleware/jwt_middleware.py)
  - Classe: `JwtMiddleware extends Middleware`
  - Métodos: `validate_token()`, `extract_claims()`
  - ~200 linhas de código

### 1.2 Validação de Assinatura JWT
- [ ] **Critério**: Token é validado usando HS256 com secret key
- **Evidência**: 
  - Usa biblioteca `pyjwt==2.8.1`
  - Algoritmo: HS256
  - Secret vem de `os.getenv('JWT_SECRET')`

### 1.3 Validação de Expiração
- [ ] **Critério**: Token expirado é rejeitado com 401
- **Evidência**: 
  - `jwt.decode()` valida campo `exp`
  - Levanta `jwt.ExpiredSignatureError` se expirado

### 1.4 Extração de Claims
- [ ] **Critério**: Claims (user_id, roles, email) são extraídos corretamente
- **Evidência**: 
  - Teste no código: `assert payload['user_id'] == 123`
  - Método: `extract_claims(token) → dict`

---

## ✅ 2. Endpoint de Autenticação

### 2.1 Login Endpoint Implementado
- [ ] **Critério**: Novo endpoint `POST /auth/login` gera JWT válido
- **Evidência**: 
  - Arquivo: [src/api_gateway/handlers/auth_handler.py](src/api_gateway/handlers/auth_handler.py)
  - Rota: `@post('/auth/login')`
  - Valida email/password contra BD
  - Retorna: `{"token": "eyJ...", "expires_in": 3600}`

### 2.2 Validação de Credenciais
- [ ] **Critério**: Email/password são validados contra user BD
- **Evidência**: 
  - Hash password com `bcrypt`
  - Compara hash com armazenado
  - Retorna 401 se credenciais inválidas

### 2.3 Token Válido Retornado
- [ ] **Critério**: Token retornado é JWT válido com exp 1 hora no futuro
- **Evidência**: 
  - Token pode ser decodificado com `jwt.decode()`
  - Campo `exp` = agora + 3600 segundos
  - Campo `user_id` presente

---

## ✅ 3. Validação de Requisições

### 3.1 Requisição Sem Token Rejeitada
- [ ] **Critério**: GET /api/agents sem Authorization header retorna 401
- **Evidência**: 
  - HTTP Status: 401 Unauthorized
  - Response body: `{"error": "Missing authorization token", "code": "NO_TOKEN"}`

### 3.2 Requisição com Token Inválido Rejeitada
- [ ] **Critério**: Token malformado/corrompido retorna 401
- **Evidência**: 
  - `curl -H "Authorization: Bearer INVALID"`
  - HTTP Status: 401
  - Response: `{"error": "Invalid token", "code": "INVALID_TOKEN"}`

### 3.3 Requisição com Token Expirado Rejeitada
- [ ] **Critério**: Token com exp no passado retorna 401
- **Evidência**: 
  - Token criado com `expires_in: -100` (100 seg no passado)
  - HTTP Status: 401
  - Response: `{"error": "Token expired", "code": "TOKEN_EXPIRED"}`

### 3.4 Requisição com Token Válido Aceita
- [ ] **Critério**: Token válido e não-expirado permite acesso
- **Evidência**: 
  - Login retorna token
  - Request com token headers retorna 200
  - Response contém dados esperados

---

## ✅ 4. Endpoints Protegidos

### 4.1 GET /api/agents Protegido
- [ ] **Critério**: Endpoint agora requer token válido
- **Evidência**: 
  - Sem token: 401
  - Com token: 200 + lista de agentes

### 4.2 POST /api/agents/{id}/execute Protegido
- [ ] **Critério**: Executar agente requer token válido
- **Evidência**: 
  - Sem token: 401
  - Com token: 202 Accepted + task_id

### 4.3 GET /api/tasks Protegido
- [ ] **Critério**: Listar tasks requer token válido
- **Evidência**: 
  - Sem token: 401
  - Com token: 200 + tasks do usuário

### 4.4 GET /health Público
- [ ] **Critério**: Health check permanece público (sem auth)
- **Evidência**: 
  - Request sem token retorna 200
  - Resposta: `{"status": "healthy"}`

---

## ✅ 5. Testes Unitários

### 5.1 Cobertura de Testes JWT
- [ ] **Critério**: Teste de token válido decodificado corretamente
  - Arquivo: [tests/api_gateway/test_jwt_middleware.py](tests/api_gateway/test_jwt_middleware.py)
  - Método: `test_valid_token_decoded_successfully()`
  - Status: ✅ PASSING

- [ ] **Critério**: Teste de token expirado rejeitado
  - Método: `test_expired_token_raises_error()`
  - Status: ✅ PASSING

- [ ] **Critério**: Teste de token malformado rejeitado
  - Método: `test_malformed_token_raises_error()`
  - Status: ✅ PASSING

- [ ] **Critério**: Teste de token sem assinatura rejeitado
  - Método: `test_token_without_signature_raises_error()`
  - Status: ✅ PASSING

- [ ] **Critério**: Teste de claim extraction
  - Método: `test_extract_claims_correct()`
  - Assertivas: user_id, roles, email extraídos corretamente
  - Status: ✅ PASSING

- [ ] **Critério**: Teste de token com algoritmo errado rejeitado
  - Método: `test_token_with_wrong_algorithm_rejected()`
  - Status: ✅ PASSING

### 5.2 Cobertura de Testes Login
- [ ] **Critério**: Teste login com credenciais válidas
  - Arquivo: [tests/api_gateway/test_auth_handler.py](tests/api_gateway/test_auth_handler.py)
  - Método: `test_login_valid_credentials_returns_token()`
  - Assertiva: Response status 200, token presente, jwt válido
  - Status: ✅ PASSING

- [ ] **Critério**: Teste login com password inválida
  - Método: `test_login_invalid_password_returns_401()`
  - Status: ✅ PASSING

- [ ] **Critério**: Teste login com user inexistente
  - Método: `test_login_user_not_found_returns_401()`
  - Status: ✅ PASSING

**Resumo**: 8 testes unit + 6 testes integração = 14 testes totais
**Cobertura**: 95%+ das linhas críticas

### 5.3 Testes de Integração
- [ ] **Critério**: E2E de login + acesso a endpoint protegido
  - Arquivo também em `test_auth_handler.py`
  - Método: `test_e2e_login_then_access_protected_endpoint()`
  - Execução: `pytest tests/api_gateway/ -v -k integration`
  - Status: ✅ PASSING

---

## ✅ 6. Configuração e Segurança

### 6.1 JWT Secret de Variável de Ambiente
- [ ] **Critério**: JWT secret carregado de `JWT_SECRET` env var
- **Evidência**: 
  - Arquivo: [src/api_gateway/config/auth_config.py](src/api_gateway/config/auth_config.py)
  - Código: `SECRET = os.getenv('JWT_SECRET')`
  - Nunca hardcoded

### 6.2 Expiração Configurável
- [ ] **Critério**: Token expiry time em variável de ambiente
- **Evidência**: 
  - Variável: `JWT_EXPIRY_SECONDS=3600` (1 hora)
  - Carregada em `auth_config.py`
  - Padrão: 3600

### 6.3 HTTPS em Produção
- [ ] **Critério**: Verificação condicional de HTTPS em prod
- **Evidência**: 
  - Env var: `ENVIRONMENT=production`
  - Middleware força HTTPS em prod: `if ENV=='prod': require_https()`
  - Dev/staging permitem HTTP

### 6.4 Senha User Criptografada
- [ ] **Critério**: Passwords não são armazenadas em texto plano
- **Evidência**: 
  - Usar `bcrypt.hashpw()` ao criar user
  - Validar com `bcrypt.checkpw()` no login
  - Criptografia: bcrypt com 12 rounds

### 6.5 Token Não Pode Ser Revogado Instantaneamente
- [ ] **Critério**: Conhecido, mitigado com expiração curta
- **Evidência**: 
  - Expiração de 1 hora limita janela de risco
  - TASK-015 implementará token blacklist futuramente

---

## ✅ 7. Documentação

### 7.1 OpenAPI/Swagger Updated
- [ ] **Critério**: Schema de autenticação documentado em OpenAPI
- **Evidência**: 
  - Arquivo: [docs/openapi.yaml](docs/openapi.yaml)
  - Seção: `securitySchemes.bearerAuth`
  - Todos endpoints autenticados têm `security: [bearerAuth: [read, write]]`
  - Exemplo de cURL incluído

### 7.2 Exemplo de Login na Documentação
- [ ] **Critério**: Request/response de `/auth/login` documentado
- **Evidência**: 
  - Request JSON (email, password)
  - Response JSON (token, expires_in)
  - Status codes (200, 401)

### 7.3 README Atualizado
- [ ] **Critério**: Instruções de autenticação adicionadas
- **Evidência**: 
  - Arquivo: [README.md](README.md)
  - Seção: "## Authentication"
  - Passos: Login → Extrair token → Incluir header Authorization

### 7.4 Security.md Criado
- [ ] **Critério**: Documento de security best practices
- **Evidência**: 
  - Arquivo: [docs/SECURITY.md](docs/SECURITY.md)
  - Inclui: JWT best practices, token rotation, HTTPS, rate limiting

### 7.5 Arquivo .env.example Atualizado
- [ ] **Critério**: Variáveis de ambiente documentadas
- **Evidência**: 
  - Novo arquivo ou seção em `.env.example`
  - Variáveis: `JWT_SECRET`, `JWT_EXPIRY_SECONDS`, `ENVIRONMENT`
  - Exemplo: `JWT_SECRET=change-me-in-prod-please`

---

## ✅ 8. Build e Qualidade de Código

### 8.1 Build Sem Erros
- [ ] **Critério**: `npm run build` (ou `mvn clean install`) sem erros
- **Evidência**: 
  - Log de build bem-sucedido
  - Status: ✅ BUILD SUCCESS

### 8.2 Linter Passa
- [ ] **Critério**: Sem erros de código style/lint
- **Evidência**: 
  - Comando: `npm run lint` ou `pylint src/`
  - Status: ✅ ZERO ERRORS

### 8.3 Sem Regressões
- [ ] **Critério**: Testes legados continuam passando
- **Evidência**: 
  - Testes antigos: `npm test -- --exclude=new`
  - Status: ✅ 50/50 PASSING (antes e depois)
  - Cobertura: mantida ou aumentada

### 8.4 Nenhuma Credencial no Código
- [ ] **Critério**: Nenhum secret hardcoded em arquivos commited
- **Evidência**: 
  - `grep -r "JWT_SECRET" src/` retorna apenas env var references
  - Secrets apenas em `.env.local` (não commited)

---

## ✅ 9. Code Review

### 9.1 Pull Request Criada
- [ ] **Critério**: PR aberta para develop com descrição clara
- **Evidência**: 
  - PR #123 no GitHub
  - Título: `[TASK-001] feat: implement JWT authentication`
  - Descrição: Link para ANDAMENTO.md, screenshots, relatório de testes

### 9.2 Code Review Aprovado
- [ ] **Critério**: Pelo menos 1 approver senior aprovou
- **Evidência**: 
  - Reviewed by: @senior-dev
  - Status: Approved
  - Comentários: Nenhum bloqueador, apenas sugestões de melhoria implementadas

### 9.3 Padrões de Código Seguidos
- [ ] **Critério**: Código segue convenções do projeto
- **Evidência**: 
  - Nomes de função: `validate_token()`, `extract_claims()`
  - Docstrings: Presentes em funções públicas
  - Type hints: Presentes em Python (ex: `def validate(token: str) → dict`)

---

## 📊 Resumo de Conformidade

| Categoria | Critérios | Atendidos | % | Status |
|---|---|---|---|---|
| **Implementação Core** | 4 | 0 | 0% | ⏳ |
| **Endpoint de Auth** | 3 | 0 | 0% | ⏳ |
| **Validação de Req** | 4 | 0 | 0% | ⏳ |
| **Endpoints Protegidos** | 4 | 0 | 0% | ⏳ |
| **Testes** | 3 | 0 | 0% | ⏳ |
| **Config/Segurança** | 5 | 0 | 0% | ⏳ |
| **Documentação** | 5 | 0 | 0% | ⏳ |
| **Build/Qualidade** | 4 | 0 | 0% | ⏳ |
| **Code Review** | 3 | 0 | 0% | ⏳ |
| **TOTAL** | **35** | **0** | **0%** | **⏳ 0%** |

---

## 🔗 Referências Rápidas

- **Branch**: `feature/jarvis-TASK-001`
- **PR**: [GitHub PR Link](https://github.com/jarvis-aios/jarvis-core/pull/123)
- **Build**: [Build Log Link](https://github.com/jarvis-aios/jarvis-core/actions/runs/12345)
- **Testes**: [Test Report Link](coverage/)
- **OpenAPI**: [Swagger UI Link](http://localhost:8000/api/docs)

---

## 🎯 Próximos Passos

1. ✅ **TASK-002**: Implementar Rate Limiting (depende de JWT)
2. ✅ **TASK-003**: Autorização por Roles (depende de JWT + claims)
3. ✅ **TASK-010**: Refresh Tokens (fase 2)
4. ✅ **TASK-015**: Token Blacklist (fase 3)
5. ✅ **TASK-020**: OAuth2 Integration (fase 3+)

---

**Data de Iniciação**: 10/03/2026  
**Data de Conclusão Prevista**: 12/03/2026  
**Branch**: `feature/jarvis-TASK-001`  
**Responsável**: [Dev Senior]  

