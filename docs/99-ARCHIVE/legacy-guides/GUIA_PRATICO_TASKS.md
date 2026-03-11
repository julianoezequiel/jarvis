# Guia Prático: Como Aplicar o Workflow de Tasks no Jarvis AIOS

> **PARA**: Todos os desenvolvedores e arquitetos do projeto Jarvis AIOS  
> **DATA**: 2026-03-10  
> **VERSÃO**: 1.0  
> **ESCOPO**: Instruções passo-a-passo para gerenciar tasks seguindo o padrão documentado

---

## 📚 Índice

1. [Visão Geral Rápida](#1-visão-geral-rápida)
2. [Passo-a-Passo: Iniciando Uma Task](#2-passo-a-passo-iniciando-uma-task)
3. [Passo-a-Passo: Durante a Implementação](#3-passo-a-passo-durante-a-implementação)
4. [Passo-a-Passo: Finalizando a Task](#4-passo-a-passo-finalizando-a-task)
5. [Exemplos de Workflows Reais](#5-exemplos-de-workflows-reais)
6. [Checklist de Qualidade](#6-checklist-de-qualidade)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Visão Geral Rápida

### O Fluxo em Números

```
📋 Task recebida
   ↓ (5 min)
📁 Criar estrutura de docs
   ↓ (1-2h)
🔧 Implementar código
   ↓ (2-4h)
✅ Testes escritos + passando
   ↓ (1h)
📝 Documentação finalizada
   ↓ (30 min)
🔍 Code review + ajustes
   ↓ (1h)
✨ Mergeada para develop
   ↓ (próximo passo: staging)
```

### Documentos Obrigatórios

```
docs/tasks/jarvis-TASK-XXX/
├── ANDAMENTO.md        ← Rastreamento de progresso (OBRIGATÓRIO)
├── ANALISE.md          ← Análise técnica detalhada (OBRIGATÓRIO)
├── CRITERIOS_ACEITE.md ← Consolidação de critérios (OBRIGATÓRIO)
└── scripts/            ← Scripts de teste, queries [OPCIONAL]
```

---

## 2. Passo-a-Passo: Iniciando Uma Task

### 2.1 Receber a Task do Board

**Onde**: Seu board de tarefas (Linear, Jira, GitHub Projects, etc)

**O que procurar**:
- ✅ Descrição clara do que precisa fazer
- ✅ Critérios de aceitação definidos
- ✅ Estimativa de Story Points
- ✅ Prioridade e labels

**Se falta algo**: 📞 Converse com o PM antes de começar.

### 2.2 Criar a Branch

**Opção 1: Se é uma feature ou fix (cria branch)**

```bash
# 1. Sempre começar de main/develop atualizado
git checkout develop
git pull origin develop

# 2. Criar branch com padrão
git checkout -b feature/jarvis-TASK-123
# ou
git checkout -b fix/jarvis-TASK-123

# 3. Fazer push inicial para "claim" a task
git push -u origin feature/jarvis-TASK-123
```

**Opção 2: Se é apenas documentação (sem branch)**

Pode fazer direto no develop se for P3 ou análise pura (≤ 0.5 SP).

### 2.3 Criar Pasta de Documentação

```bash
# Criar a pasta estrutura
mkdir -p docs/tasks/jarvis-TASK-XXX/scripts

# Entrar na pasta
cd docs/tasks/jarvis-TASK-XXX
```

### 2.4 Criar Três Documentos Obrigatórios

#### 2.4.1 Documento 1: ANDAMENTO.md

```bash
# Copiar template da section 2.1 em task-workflow-jarvis.md
cat > ANDAMENTO.md << 'EOF'
# TASK-XXX — [Título]

[Preencher com informações do Jira/Linear]

---
## 📝 Objetivo
[Descrição clara]

## ✅ Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2

## 📄 Arquivos Afetados
[Será atualizado durante execução]

## 📊 Log de Andamento
| Data | Status | Descrição |
|---|---|---|
| 2026-03-10 09:00 | 🟡 Iniciado | Task criada |

## 🔗 Dependências
[Listar tasks relacionadas]

## 📌 Notas
[Observações iniciais]
EOF
```

#### 2.4.2 Documento 2: ANALISE.md

```bash
cat > ANALISE.md << 'EOF'
# TASK-XXX — Análise Técnica

**Revisão**: 1.0  
**Data**: [hoje YYYY-MM-DD]  
**Autor**: [Seu name]  

---

## 1. Contexto e Motivação
[Por que essa task existe?]

## 2. Decisões de Design
[Trade-offs, alternativas]

## 3. Riscos Identificados
[Possíveis problemas e mitigação]

## 4. Sequência de Validação
[Passos para QA validar]

## 5. Impacto em Outros Módulos
[Quais módulos afeta?]

## 6. Estimativa de Esforço
[Breakdown de tempo]
EOF
```

#### 2.4.3 Documento 3: CRITERIOS_ACEITE.md

```bash
cat > CRITERIOS_ACEITE.md << 'EOF'
# TASK-XXX — Critérios de Aceitação

> **Status Geral**: [⏳ Em Progresso] (DD/MM/YYYY)

---

## ✅ 1. [Categoria 1 — ex: Feature Core]

### 1.1 Sub-critério
- [ ] **Critério**: [Descrição]
- **Evidência**: [Como será validado?]

## ✅ 2. [Categoria 2]
...

## 📊 Resumo de Conformidade
| Categoria | Total | Completos | % |
|---|---|---|---|
| **Categoria 1** | 2 | 0 | 0% |
| **TOTAL** | **2** | **0** | **0%** |
EOF
```

### 2.5 Fazer Commit Inicial

```bash
git add docs/tasks/jarvis-TASK-XXX/
git commit -m "[TASK-XXX] docs: initialize task documentation

- Create ANDAMENTO.md for progress tracking
- Create ANALISE.md for technical analysis
- Create CRITERIOS_ACEITE.md for acceptance criteria

Refs: TASK-XXX"

git push origin feature/jarvis-TASK-XXX
```

### 2.6 Mover para 'In Progress' no Board

**No seu board (Linear, Jira, GitHub Projects)**:
1. Abrir a task
2. Mudar status para **"In Progress"** ou **"Started"**
3. Opcional: Adicionar estimativa de tempo

---

## 3. Passo-a-Passo: Durante a Implementação

### 3.1 Completar a Análise Técnica

**Objetivo**: Ter clareza total antes de codificar

**Faça**:
1. Desenhe a solução (diagrama ASCII, whiteboard foto)
2. Liste os arquivos que será modificar (+previamente listados no ANDAMENTO.md)
3. Identifichar riscos e mitigações
4. Validar que design está OK com arquiteto/lead

**Exemplo - arquivo ANALISE.md preenchido**:

```markdown
## 2. Decisões de Design

| Decisão | Alternativas | Motivo |
|---|---|---|
| Usar classe JwtMiddleware | Função, decorator | Reutilização, testabilidade |
| HS256 em lugar de RS256 | RS256, API keys | Simplicidade para MVP |
| 1h de expiry | 24h, sem expiry | Segurança + UX |

## 3. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Token roubado | Média | HTTPS obrigatório, expiração curta |
| Secret exposto | Baixa | Env var, nunca hardcode |
```

### 3.2 Começar a Codificar

**Estrutura de código esperada** (exemplo Python):

```python
# src/api_gateway/middleware/jwt_middleware.py

import jwt
from datetime import datetime, timedelta

class JwtMiddleware:
    """Valida tokens JWT em requisições autenticadas."""
    
    def __init__(self, secret: str, algorithm: str = 'HS256'):
        self.secret = secret
        self.algorithm = algorithm
    
    def create_token(self, payload: dict, expires_in_seconds: int = 3600) -> str:
        """Cria um novo JWT token."""
        payload['exp'] = datetime.utcnow() + timedelta(seconds=expires_in_seconds)
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
    
    def validate_token(self, token: str) -> dict:
        """Valida token e retorna payload."""
        try:
            return jwt.decode(token, self.secret, algorithms=[self.algorithm])
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token has expired")
        except jwt.InvalidTokenError:
            raise InvalidTokenError("Invalid token")

# src/api_gateway/handlers/auth_handler.py

@app.post('/auth/login')
def login(email: str, password: str):
    """Autentica usuário e retorna JWT."""
    user = find_user(email)
    if not user or not validate_password(password, user.password_hash):
        return {"error": "Invalid credentials"}, 401
    
    token = jwt_middleware.create_token({"user_id": user.id})
    return {"token": token, "expires_in": 3600}, 200
```

### 3.3 Atualizar ANDAMENTO.md Regularmente

**Após cada sessão de trabalho**, adicione log:

```markdown
## 📊 Log de Andamento

| Data | Hora | Status | Descrição |
|---|---|---|---|
| 2026-03-10 | 09:00 | 🟡 Iniciado | Task criada, docs prontas |
| 2026-03-10 | 14:00 | 🟡 Análise | Design finalizado, riscos mapeados |
| 2026-03-11 | 09:00 | 🟡 Implementação | JwtMiddleware coded 80%, testes em progresso |
| 2026-03-11 | 16:00 | 🟡 Testes | 6/8 testes passando, 1 failure em jwt_expiry |
```

### 3.4 Escrever Testes Enquanto Codifica

**Obrigatório**: Um teste para cada cenário crítico

```python
# tests/api_gateway/test_jwt_middleware.py

import pytest
from src.api_gateway.middleware.jwt_middleware import JwtMiddleware

class TestJwtMiddleware:
    
    @pytest.fixture
    def middleware(self):
        return JwtMiddleware(secret="test-secret-123")
    
    def test_valid_token_decoded_successfully(self, middleware):
        """Teste: token válido é decodificado corretamente"""
        # Arrange
        payload = {"user_id": 123}
        token = middleware.create_token(payload, expires_in_seconds=3600)
        
        # Act
        decoded = middleware.validate_token(token)
        
        # Assert
        assert decoded["user_id"] == 123
        assert "exp" in decoded
    
    def test_expired_token_raises_error(self, middleware):
        """Teste: token expirado levanta erro"""
        token = middleware.create_token({"user_id": 123}, expires_in_seconds=-100)
        
        with pytest.raises(TokenExpiredError):
            middleware.validate_token(token)
    
    def test_invalid_token_raises_error(self, middleware):
        """Teste: token malformado levanta erro"""
        with pytest.raises(InvalidTokenError):
            middleware.validate_token("not.a.valid.jwt")
```

**Rodar testes localmente**:

```bash
cd [projeto]
pytest tests/api_gateway/test_jwt_middleware.py -v

# Output esperado:
# tests/api_gateway/test_jwt_middleware.py::TestJwtMiddleware::test_valid_token_decoded_successfully PASSED
# tests/api_gateway/test_jwt_middleware.py::TestJwtMiddleware::test_expired_token_raises_error PASSED
# tests/api_gateway/test_jwt_middleware.py::TestJwtMiddleware::test_invalid_token_raises_error PASSED
# ======================== 3 passed in 0.12s ========================
```

### 3.5 Fazer Commits Atômicos Regularmente

**Convenção de commit**:

```bash
git commit -m "[TASK-XXX] tipo: descrição curta

Descrição opcional mais detalhada com bullets:
- Detalhe 1
- Detalhe 2

Refs: TASK-XXX"
```

**Exemplos**:

```bash
# Commit 1: Core implementation
git commit -m "[TASK-001] feat: implement JWT middleware

- Add JwtMiddleware class with token validation
- Implement create_token and validate_token methods
- Handle ExpiredSignatureError and InvalidTokenError

Refs: TASK-001"

# Commit 2: Tests
git commit -m "[TASK-001] test: add unit tests for JWT middleware

- Test valid token decoding
- Test expired token rejection
- Test malformed token handling
- 100% coverage on jwt_middleware.py

Refs: TASK-001"

# Commit 3: Integration
git commit -m "[TASK-001] feat: add /auth/login endpoint

- Implement login handler with email/password validation
- Generate JWT token on successful auth
- Return 401 for invalid credentials

Refs: TASK-001"
```

### 3.6 Build Local Deve Passar

```bash
# Python example
pytest tests/api_gateway/ -v --cov=src

# Node/TypeScript example
npm run build && npm test

# Java/Maven example
mvn clean install

# Expected output: BUILD SUCCESS / ALL TESTS PASSING
```

---

## 4. Passo-a-Passo: Finalizando a Task

### 4.1 Checklist Final

Antes de fazer merge, verificar:

```bash
# ✅ Code
□ Código implementado
□ Build passa (mvn clean install / npm run build / pytest)
□ Lint passa (npm run lint / pylint)
□ Sem credenciais hardcoded

# ✅ Testes
□ Testes unitários criados
□ Testes passando (npm test / pytest)
□ Cobertura > 80% no code novo
□ Sem regressões em código legado

# ✅ Documentação
□ ANDAMENTO.md finalizado
□ ANALISE.md completo
□ CRITERIOS_ACEITE.md com todos[x] marcados
□ Código tem docstrings
□ API docs (Swagger/OpenAPI) atualizado

# ✅ Git
□ Branch atualizada com develop (git rebase develop)
□ Commits são atômicos e bem descritos
□ Sem merge commits (rebase)
```

### 4.2 Atualizar CRITERIOS_ACEITE.md Final

Marcar todos os checkboxes como completos:

```markdown
## ✅ 1. Implementação Core

### 1.1 Middleware JWT Implementado
- [x] **Critério**: Middleware JWT criado e integrado ✅ COMPLETO
- **Evidência**: 
  - Arquivo: src/api_gateway/middleware/jwt_middleware.py
  - Implementação: ~200 linhas, HS256, validação de exp
  - Status: ✅ WORKING

## 📊 Resumo de Conformidade

| Categoria | Total | Completos | % |
|---|---|---|---|
| **Implementação Core** | 4 | 4 | **100%** ✅ |
| **Endpoint Auth** | 3 | 3 | **100%** ✅ |
| **Testes** | 8 | 8 | **100%** ✅ |
| **Documentação** | 5 | 5 | **100%** ✅ |
| **TOTAL** | **20** | **20** | **100%** ✅ |
```

### 4.3 Abrir Pull Request

```bash
# 1. Preparar branch final
git checkout feature/jarvis-TASK-XXX
git rebase develop          # Rebase, não merge
git push -f origin feature/jarvis-TASK-XXX

# 2. Ir ao GitHub/GitLab e criar PR
```

**Template de PR**:

```markdown
# [TASK-XXX] Autenticação JWT no API Gateway

## 📋 Descrição

Implementar middleware JWT para validar tokens em requisições autenticadas.

## 🎯 Critérios de Aceitação

- [x] Middleware JWT implementado
- [x] Endpoint /auth/login criado
- [x] Tokens validados com HS256
- [x] Testes unitários (8 testes) ✅ PASSING
- [x] Documentação API atualizada
- [x] Build passa ✅ BUILD SUCCESS

## 📚 Referências

- Task: TASK-001
- Documentação: docs/tasks/jarvis-TASK-001/ANDAMENTO.md
- Build log: [GitHub Actions link]
- Test report: [Coverage link]

## Checklist antes de Merge

- [x] Build passou ✅
- [x] Testes passaram ✅
- [x] Code review aprovado ✅
- [x] Documentação completa ✅
- [x] Sem regressões ✅
```

### 4.4 Code Review + Ajustes

**O que esperar**:
- Feedback do reviewer
- Sugestões de melhoria
- Às vezes, ajustes necessários

**Se há ajustes necessários**:

```bash
# Fazer os ajustes no código
# Commitar: [TASK-XXX] refactor: address code review feedback
# Push novamente para a branch
git add .
git commit -m "[TASK-XXX] refactor: address code review feedback

- Rename variable 'tok' to 'token'
- Add docstring to validate_token
- Fix spacing in test file

Refs: TASK-XXX"

git push origin feature/jarvis-TASK-XXX
```

### 4.5 Merge para Develop

**Uma vez aprovado**:

```bash
# Opção 1: Merge via GitHub UI (recomendado)
# Botão "Merge Pull Request" no GitHub

# Opção 2: Merge via CLI (se necessário)
git checkout develop
git pull origin develop
git merge --ff-only feature/jarvis-TASK-XXX
git push origin develop
```

### 4.6 Cleanup

```bash
# Deletar branch local
git branch -d feature/jarvis-TASK-XXX

# Deletar branch remota
git push origin --delete feature/jarvis-TASK-XXX
```

### 4.7 Atualizar Status no Board

1. Mover task para **"Pronto para QA"** ou **"Staging"**
2. Ou marcar como **"Done"** se seu projeto não tem QA separado

---

## 5. Exemplos de Workflows Reais

### Exemplo 1: Feature Nova (3 Story Points)

```
Tempo total: 2-3 dias

[DIA 1]
09:00 - Receber task (TASK-042: Novo endpoint pagamento)
09:15 - Criar branch feature/jarvis-TASK-042
09:30 - Documentação inicial (ANDAMENTO, ANALISE, CRITERIOS_ACEITE)
10:30 - Design review com architect (1h)
11:30 - Começar implementação
13:00 - Lunch break
14:00 - Implementação continua (~4h)
18:00 - Primeira batch de testes escritos
18:30 - Build local ok, alguns testes falhando

[DIA 2]
09:00 - Fix falhas de testes (2h)
11:00 - Testes 100% passing
11:30 - Escrever testes de integração
13:00 - Lunch
14:00 - Code review com time
16:00 - Ajustes de feedback (1h)
17:00 - Atualizar documentação final
17:30 - CRITERIOS_ACEITE marcado [x]
18:00 - PR criada para review

[DIA 3]
10:00 - Reviewer aprovado
10:15 - Merge para develop
10:30 - Task movida para "Staging" no board
```

### Exemplo 2: Bugfix Crítico (1 Story Point)

```
Tempo total: 4-6 horas

[MESMO DIA]
14:00 - Receber bugfix (TASK-089: Auth timeout em prod)
14:15 - Criar branch fix/jarvis-TASK-089
14:30 - Análise rápida (30 min) — riscos ao fazer rebase timeout?
15:00 - Fix implementado (30 min) — aumentar timeout de 30s para 60s
15:30 - Testes de regressão executados (1h)
16:30 - PR criada com urgência flag
17:00 - Reviewer aprova código
17:15 - Merge imediato para develop
17:30 - Deploy para staging para validação
```

---

## 6. Checklist de Qualidade

### Antes de Submeter para Code Review

```bash
## 🔍 Código
- [ ] Implementação completa?
- [ ] Build sem erros: `npm run build` / `mvn clean install`
- [ ] Lint sem erros: `npm run lint` / `pylint src/`
- [ ] Sem credenciais hardcoded? `grep -r "password\|secret\|key" src/`
- [ ] Nomenclatura consistente com projeto?

## ✅ Testes
- [ ] Testes unitários escritos?
- [ ] Todos passando? `npm test` / `pytest tests/`
- [ ] Cobertura > 80%? `npm run coverage`
- [ ] Teste caminho feliz e casos de erro?
- [ ] Teste cases nulos/edge?

## 📚 Documentação
- [ ] Código tem docstrings?
- [ ] ANDAMENTO.md preenchido?
- [ ] ANALISE.md preenchido?
- [ ] CRITERIOS_ACEITE.md preenchido?
- [ ] API docs (Swagger) atualizado?

## 🔗 Git
- [ ] Branch atualizada? `git rebase develop`
- [ ] Commits são atômicos?
- [ ] Mensagens de commit descritivas?
- [ ] Sem senha em commits? `git log -p | grep -i password`

## 🚀 Pronto?
- [ ] ✅ SIM! Enviar PR
```

---

## 7. Troubleshooting

### Problema: Build falhando

```bash
# 1. Limpar cache
rm -rf node_modules package-lock.json  # npm
rm -rf .pytest_cache                    # python

npm install && npm run build
pytest -v

# Se ainda não funcionar:
# 2. Verificar logs
cat npm-debug.log
pytest -vv --tb=short

# 3. Perguntar no Slack #dev-help
```

### Problema: Teste falhando

```bash
# 1. Executar teste individual
pytest tests/api_gateway/test_jwt_middleware.py::TestJwtMiddleware::test_valid_token

# 2. Ver output detalhado
pytest -vv --tb=long tests/...

# 3. Debug localmente
python -m pdb tests/api_gateway/test_jwt_middleware.py

# Se estiver preso:
# 4. Pedir help do pair programmer
```

### Problema: Não conseguir fazer rebase

```bash
# 1. Ver conflitos
git status

# 2. Resolver manualmente em editor
# Procurar <<<<<<< >>>>>>
# Manter o código correto

# 3. Finalizar rebase
git add .
git rebase --continue

# Se der muito problema:
git rebase --abort  # cancela tudo
git merge develop   # volta a fazer merge (menos limpo)
```

### Problema: PR bloqueada em Code Review

```bash
# Não desista! Siga:

1. Ler feedback comentário por comentário
2. Cada comentário pode exigir mudança
3. Fazer as mudanças no código
4. Commitar: [TASK-XXX] comment: address review feedback
5. Push novamente
6. Responder ao comentário: "Done, please re-review"
7. Aguardar approval
```

---

## 📞 Suporte

**Dúvidas?**
- Pergunte no Slack `#dev-help`
- Ou abra issue no repo com prefix `[QUESTION]`

**Atualizações deste guia?**
- Edite `docs/TASK_WORKFLOW_JARVIS.md`
- Submeta um PR com melhorias

---

**Última atualização**: 2026-03-10  
**Mantido por**: Arquiteto Sênior  
**Próxima revisão**: 2026-04-10  

