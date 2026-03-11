# Instrução: Workflow de Gestão de Tasks — Jarvis AIOS

**Escopo:** Este instrucional define o padrão obrigatório para iniciar, documentar e finalizar qualquer task de desenvolvimento do projeto **Jarvis AIOS**.

**Aplicar sempre que:** O usuário pedir para iniciar, trabalhar ou concluir uma task do Sprint, um bugfix, feature ou refatoração.

---

## Fluxo Obrigatório — Resumo Rápido

Todo trabalho em uma task **deve** seguir exatamente esta sequência:

```
1. INICIAR TASK
   └─ Mover para "In Progress" no Jira/Linear/etc
   └─ Criar branch: feature/jarvis-TASK-XXX ou fix/jarvis-TASK-XXX

2. DOCUMENTAÇÃO INICIAL
  └─ Criar pasta: docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/
   └─ Criar ANDAMENTO.md
   └─ Criar ANALISE.md
   └─ Criar CRITERIOS_ACEITE.md

3. IMPLEMENTAÇÃO
   └─ Submeter código
   └─ Fazer commits atômicos com refs à task
   └─ Build/tests locais passando
   └─ Atualizar documentação conforme avança

4. QUALIDADE (OBRIGATÓRIO)
   └─ Testes unitários criados/atualizados
   └─ Testes executados localmente (100% passing)
   └─ Atualizar Postman/OpenAPI se houver endpoints novos
   └─ Code review esperado

5. FINALIZAÇÃO
   └─ Todos os critérios de aceitação marcados [x]
   └─ ANDAMENTO.md com status "CONCLUÍDO"
   └─ Push e merge para branch principal (main/develop)
   └─ Atualizar status no Jira para "Pronto para QA" ou "Done"
```

> **⚠️ REGRA CRÍTICA:** Uma task NÃO está concluída se:
> - Testes unitários não existem ou estão falhando
> - Critérios de aceitação não estão 100% marcados
> - Branch não foi mergeada
> - Documentação está incompleta

---

## 1. Iniciar uma Task

### 1.1 Verificar o Backlog

Antes de iniciar, você deve ter a task no seu board com:
- ✅ Título e descrição clara
- ✅ Critérios de aceitação definidos
- ✅ Estimativa de esforço (Story Points)
- ✅ Prioridade e labels

Se algo falta, **converse com o PM antes de começar**.

### 1.2 Criar a Branch

**Convenção de nome:**
```
feature/jarvis-TASK-XXX      ← para novas funcionalidades
fix/jarvis-TASK-XXX          ← para bugfixes
refactor/jarvis-TASK-XXX     ← para refactoring
docs/jarvis-TASK-XXX         ← para documentação
```

**Criar a branch:**
```bash
git checkout main                    # ou develop, conforme seu projeto
git pull origin main
git checkout -b feature/jarvis-TASK-XXX
```

### 1.3 Mover para "In Progress" no Jira

[PREENCHER: Incluir instruções específicas da ferramenta de board do seu projeto]

---

## 2. Documentação Inicial da Task

Crie a estrutura de documentação **no início da task**:

```
docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/
├── ANDAMENTO.md           ← Rastreamento de progresso
├── ANALISE.md             ← Análise técnica detalhada
├── CRITERIOS_ACEITE.md    ← Consolidação dos critérios
└── scripts/               ← Scripts de teste, queries, etc
```

### 2.1 Template ANDAMENTO.md

```markdown
# TASK-XXX — [Título da Task]

**Board**: [Onde está trackado: Jira, Linear, GitHub Projects, etc]  
**Sprint**: [Número do sprint ou iteração]  
**Prioridade**: [🔴 P0 / 🟠 P1 / 🟡 P2 / 🟢 P3]  
**Estimativa**: [X Story Points]  
**Branch**: `feature/jarvis-TASK-XXX`  
**Status**: 🟡 **Em Progresso**  
**Início**: [YYYY-MM-DD]  
**Término Previsto**: [YYYY-MM-DD]  
**Responsável**: [Seu nome]  

---

## 📝 Objetivo

[Descrição clara e concisa do que deve ser entregue]

**Exemplo:**
"Implementar autenticação JWT no API Gateway para validar tokens de requisições de clientes"

---

## ✅ Critérios de Aceitação

[Copiar exatamente do Jira/Linear]

- [ ] Requisito 1
- [ ] Requisito 2
- [ ] Requisito 3
- [ ] Testes unitários implementados
- [ ] Documentação da API atualizada
- [ ] Build passa sem erros
- [ ] Nenhuma regressão em funcionalidades existentes

---

## 📄 Arquivos Afetados

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/auth/jwt_handler.py` | Criar | Implementar lógica JWT |
| `tests/auth/test_jwt_handler.py` | Criar | Testes da lógica JWT |
| `docs/api.md` | Modificar | Documentar novo endpoint |

---

## 📊 Log de Andamento

| Data | Status | Descrição |
|---|---|---|
| 2026-03-10 | 🟡 Iniciado | Task criada, estrutura definida |
| 2026-03-10 | 🟡 Análise | Investigando requerimentos |
| [próximas atualizações] | | |

---

## 🔗 Dependências

- **Bloqueadores**: [Tasks que precisam ser feitas antes desta]
- **Desbloqueia**: [Tasks que esta libera]
- **Relacionadas**: [Tasks que têm contexto similar]

---

## 📌 Notas e Decisões

[Observações relevantes, riscos, decisões arquiteturais tomadas, etc]
```

### 2.2 Template ANALISE.md

```markdown
# TASK-XXX — Análise Técnica

**Revisão**: 1.0  
**Data**: [YYYY-MM-DD]  
**Autor**: [Seu nome]  

---

## 1. Contexto e Motivação

Por que essa task existe? Que problema resolve? Qual é o impacto esperado?

**Exemplo:**
"Atualmente, o API Gateway não valida tokens JWT. Isso significa que qualquer cliente pode acessar endpoints sem autenticação. Esta task implementa validação JWT para garantir que apenas clientes autorizados acessem a API."

---

## 2. Decisões de Design

Que decisões técnicas foram tomadas? Por quê?

| Decisão | Alternativas Consideradas | Motivo da Escolha |
|---|---|---|
| Usar JWT em lugar de OAuth2 | OAuth2, API Keys, Sessions | Simplicidade, sem servidor de auth externo |
| Armazenar secret em variável env | Hardcode, arquivo config | Segurança, facilita rotação de secrets |
| Token com expiração 1h | 24h, sem expiração | Balance entre segurança e UX |

---

## 3. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Token roubado | Média | Alto | Usar HTTPS sempre, refres tokens |
| Incompatibilidade com legacy clients | Baixa | Alto | Maintain backward compatibility |
| Performance de validação JWT | Baixa | Médio | Cache keys, benchmark antes de deploy |

---

## 4. Sequência de Validação

Que passos o QA deve seguir para verificar que a task foi concluída corretamente?

1. Verificar que token inválido retorna 401
2. Verificar que token válido passa
3. Verificar que token expirado retorna 401
4. Verificar que request sem token é rejeitado
5. Executar testes de carga para validação JWT
6. Testar com múltiplos clients

---

## 5. Impacto em Outros Módulos

Quais módulos/componentes são afetados? Precisa de mudanças em dependências?

- ✅ API Gateway (modificação — adicionar middleware)
- ✅ Services internos (impacto mínimo — ainda pode chamar com token)
- ⚠️ Clientes web/mobile (precisam gerar token antes de chamar)
- ✅ Logs (adicionar log de falhas de validação)

---

## 6. Estimativa de Esforço

| Atividade | Tempo Estimado |
|---|---|
| Design e análise | 2h |
| Implementação core | 4h |
| Testes | 3h |
| Code review e ajustes | 2h |
| **TOTAL** | **11h** (aprox 1.5 SP) |

---

## 7. Referências e Documentação

- [JWT.io](https://jwt.io) — Explicação de JWT
- [RFC 7519](https://tools.ietf.org/html/rfc7519) — Spec JWT
- Arquivo de config: `docs/SECURITY.md`
```

### 2.3 Template CRITERIOS_ACEITE.md

```markdown
# TASK-XXX — Critérios de Aceitação

> **Status Geral**: [⏳ Em Progresso / ✅ 100% COMPLETO] (DD/MM/YYYY)

---

## ✅ 1. Implementação Core

### 1.1 Validação JWT Implementada
- [ ] **Critério**: Middleware JWT criado e funciona corretamente
- **Evidência**: 
  - Arquivo: [src/auth/jwt_middleware.py](src/auth/jwt_middleware.py)
  - Implementa validação de assinatura, expiração e payload
  - ~150 linhas de código

### 1.2 Tratamento de Erros
- [ ] **Critério**: Retorna 401 para tokens inválidos/expirados
- **Evidência**: 
  - Código trata InvalidTokenError, ExpiredSignatureError
  - Response padrão: `{"error": "Invalid or expired token", "code": "INVALID_TOKEN"}`

---

## ✅ 2. Configuração e Segurança

### 2.1 Secret Key Management
- [ ] **Critério**: JWT secret carregado de variável de ambiente
- **Evidência**: 
  - Arquivo: [.env.example](.env.example)
  - Variável: `JWT_SECRET` (nunca hardcoded)

### 2.2 HTTPS Enforcement
- [ ] **Critério**: Middleware força HTTPS em produção
- **Evidência**: 
  - Flag conditional: `if ENV == 'prod': require https`

---

## ✅ 3. Testes Unitários

### 3.1 Cobertura de Testes
- [ ] **Critério**: Teste token válido
  - Arquivo: [tests/auth/test_jwt_handler.py](tests/auth/test_jwt_handler.py)
  - Método: `test_valid_token_returns_payload()`
  
- [ ] **Critério**: Teste token expirado
  - Método: `test_expired_token_returns_401()`
  
- [ ] **Critério**: Teste token malformado
  - Método: `test_malformed_token_returns_401()`
  
- [ ] **Critério**: Teste token ausente
  - Método: `test_missing_token_returns_401()`

**Evidência**: 
- Framework: pytest + fixtures
- Cobertura: 95%+ (ver relatório em `coverage/`)
- Execução: `pytest tests/auth/ -v` ✅ PASSING

---

## ✅ 4. Documentação da API

### 4.1 OpenAPI/Swagger Atualizado
- [ ] **Critério**: Novo schema de autorização documentado
- **Evidência**: 
  - Arquivo: [docs/openapi.yaml](docs/openapi.yaml)
  - Seção: `components.securitySchemes.bearerAuth`
  - Todos os endpoints autenticados têm `security: [bearerAuth: []]`

### 4.2 README Atualizado
- [ ] **Critério**: Instruções de autenticação adicionadas
- **Evidência**: 
  - Arquivo: [README.md](README.md)
  - Seção: "Authentication — How to get a JWT token"

---

## ✅ 5. Build e Integração

### 5.1 Build Passa
- [ ] **Critério**: `mvn clean install` ou `npm run build` sem erros
- **Evidência**: 
  - Build log: [TIMESTAMP]
  - Status: ✅ SUCCESS

### 5.2 Sem Regressões
- [ ] **Critério**: Testes legados passando (não há quebra em funcionalidades)
- **Evidência**: 
  - Testes onte existentes: `npm test` ✅ PASSING
  - Cobertura mantida ou aumentada

---

## ✅ 6. Code Review

### 6.1 PR Aprovado
- [ ] **Critério**: Code review feito por [reviewer name]
- **Evidência**: 
  - PR #XXX aprovada
  - Feedback resolvido

### 6.2 Padrões de Código
- [ ] **Critério**: Segue convenções do projeto
- **Evidência**: 
  - Lint passa: `npm run lint` ✅
  - Formatação: `prettier` ✅
  - Nomes de variáveis em inglês
  - Documentação inline para lógica complexa

---

## 📊 Resumo de Conformidade

| Categoria | Critérios | Atendidos | % |
|---|---|---|---|
| **Implementação Core** | 2 | 0 | 0% |
| **Config/Segurança** | 2 | 0 | 0% |
| **Testes** | 4 | 0 | 0% |
| **Documentação** | 2 | 0 | 0% |
| **Build/Integrção** | 2 | 0 | 0% |
| **Code Review** | 2 | 0 | 0% |
| **TOTAL** | **14** | **0** | **0%** |

---

## 🔗 Referências Rápidas

- **PR**: [Link do Pull Request](#)
- **Testes**: [Link do relatório de coverage](#)
- **Build**: [Link do build log](#)
- **Documentação Técnica**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🎯 Próximos Passos

1. ✅ Code Review aprovado
2. ✅ Branch mergeada para develop/main
3. ✅ Deploy em ambiente staging para QA
4. ✅ Mover task para \"Done\" no Jira
5. ✅ Preparar release notes

---

**Data de Conclusão**: [DD/MM/YYYY]  
**Commits**: [hash1, hash2, hash3]  
**Branch**: `feature/jarvis-TASK-XXX`  
**Mergeada em**: [DD/MM/YYYY]
```

---

## 3. Durante a Execução da Task

### 3.1 Atualizar ANDAMENTO.md Regularmente

Após cada sessão de trabalho, atualizar:

```markdown
## 📊 Log de Andamento

| Data | Status | Descrição |
|---|---|---|
| 2026-03-10 10:00 | 🟡 Iniciado | Task criada |
| 2026-03-10 14:30 | 🟡 Análise | Design finalizado, riscos identificados |
| 2026-03-11 09:00 | 🟡 Implementação | Middleware JWT implementado, 80% pronto |
| 2026-03-11 16:00 | 🟡 Testes | Testes unitários escritos, 5/6 passing |
| 2026-03-12 10:00 | 🟡 Code Review | PR enviada, aguardando review |
| 2026-03-12 14:00 | ✅ Concluído | Mergeada para main, em staging |
```

### 3.2 Fazer Commits Atômicos

**Convenção de mensagem de commit:**

```
[TASK-XXX] tipo: descrição curta

Corpo opcional com detalhes:
- Detalhe 1
- Detalhe 2

Refs: TASK-XXX, TASK-YYY
```

**Exemplo:**
```
[TASK-042] feat: implement JWT validation middleware

- Add JwtMiddleware class with token validation
- Handle expired and malformed tokens
- Add bearer token parsing from Authorization header
- Return 401 status for invalid tokens

Refs: TASK-042
```

### 3.3 Marcar Critérios Conforme Completa

No arquivo `CRITERIOS_ACEITE.md`, marcar os checkboxes:

```markdown
- [x] Token válido retorna payload ✅ COMPLETO
- [ ] Teste de token expirado — (em progresso)
- [ ] Documentação API — (não começado)
```

---

## 4. Critérios de Qualidade — Testes e Documentação

### 4.1 Testes Unitários (OBRIGATÓRIO)

**Regra**: Toda task que cria/modifica código **deve** ter testes correspondentes.

#### Padrões do Projeto

| Aspecto | Padrão |
|---|---|
| **Sufixo da classe de teste** | `[Classe]Test.py` ou `test_[modulo].py` |
| **Localização** | `tests/` espelhando estrutura de `src/` |
| **Framework** | [PREENCHER: Ex: pytest, unittest, Jest, etc] |
| **Execução** | [PREENCHER: Ex: `pytest tests/` ou `npm test`] |

#### O que Testar Obrigatoriamente

- ✅ **Caminho feliz**: Comportamento esperado com entrada válida
- ✅ **Casos nulos/inválidos**: `None`, string vazia, valores inválidos
- ✅ **Casos de erro**: Exceções apropriadas lançadas
- ✅ **Edge cases**: Limites, valores extremos

#### Exemplo de Teste

```python
import pytest
from src.auth.jwt_handler import JwtHandler, InvalidTokenError

class TestJwtHandler:
    
    @pytest.fixture
    def handler(self):
        return JwtHandler(secret="test-secret")
    
    def test_valid_token_returns_payload(self, handler):
        # Arrange
        token = handler.create_token({"user_id": 123})
        
        # Act
        payload = handler.validate_token(token)
        
        # Assert
        assert payload["user_id"] == 123
    
    def test_expired_token_raises_error(self, handler):
        # Arrange
        token = handler.create_token({"user_id": 123}, expires_in=-1)
        
        # Act & Assert
        with pytest.raises(InvalidTokenError):
            handler.validate_token(token)
    
    def test_invalid_signature_raises_error(self, handler):
        # Tampered token
        tampered_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjN9.TAMPERED"
        
        with pytest.raises(InvalidTokenError):
            handler.validate_token(tampered_token)
```

### 4.2 Documentação da API (OBRIGATÓRIO se há endpoints)

**Localização**: `docs/openapi.yaml` ou `postman/[PROJECT].postman_collection.json`

**Regra**: Qualquer novo/modificado endpoint deve ser documentado antes do merge.

#### Exemplo Swagger/OpenAPI

```yaml
/api/v1/auth/validate:
  post:
    summary: Validate JWT Token
    security:
      - bearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              token:
                type: string
    responses:
      200:
        description: Token is valid
      401:
        description: Invalid or expired token
```

---

## 5. Concluindo uma Task

### 5.1 Checklist Final

Antes de marcar como "Done":

- [ ] **Documentação**: ANDAMENTO.md, ANALISE.md, CRITERIOS_ACEITE.md atualizados
- [ ] **Código**: Build passa (`[build command]`)
- [ ] **Testes**: Todos passando (`[test command]`) — 100%
- [ ] **Segurança**: Sem credenciais hardcoded, sem secrets no repo
- [ ] **Revisão**: Code review aprovado
- [ ] **Documentação API**: Atualizada (Swagger, Postman, README)
- [ ] **Sem regressões**: Testes legados ainda passando

### 5.2 Merge para Branch Principal

```bash
git checkout [main/develop]
git pull origin [main/develop]
git merge feature/jarvis-TASK-XXX
git push origin [main/develop]
```

### 5.3 Atualizar Status no Jira

Mover task para:
1. **"Pronto para QA"** — se há aprovação
2. **"Em Homologação"** — se QA começou a testar
3. **"Done"** — se QA aprovou e task está completa

### 5.4 Cleanup

```bash
# Deletar branch local
git branch -d feature/jarvis-TASK-XXX

# Deletar branch remota
git push origin --delete feature/jarvis-TASK-XXX
```

---

## 6. Estrutura de Arquivos e Scripts

Todos os arquivos gerados para a task devem ficar em:

```
docs/03-DEVELOPMENT/tasks/jarvis-TASK-XXX/
├── ANDAMENTO.md
├── ANALISE.md
├── CRITERIOS_ACEITE.md
└── scripts/
    ├── test_queries.sql
    ├── setup_test_data.sh
    └── validate.sh
```

**Nunca** colocar temporários na raiz do projeto.

---

## 7. Apresentação de Opções ao Usuário

Quando precisar oferecer alternativas:

**Opções (responda só o número):**

1. Executar testes com coverage
2. Rodar apenas testes rápidos (smoke tests)
3. Pular testes e fazer code review primeiro

**Escolha**: ???

---

## 📚 Referências

- **Padrões de Commit**: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)
- **Setup Local**: [README.md](README.md)
- **Convenções de Código**: [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)
- **Security Best Practices**: [docs/SECURITY.md](docs/SECURITY.md)

---

**Última atualização**: [DATA]  
**Responsável**: [TIME / PESSOA]  
**Próxima revisão**: [DATA]

