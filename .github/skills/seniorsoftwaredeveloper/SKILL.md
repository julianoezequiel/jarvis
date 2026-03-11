````skill
---
name: seniorsoftwaredeveloper
description: >
  Habilidades e diretrizes de um desenvolvedor senior para o projeto PontoCore Backend.
  Use esta skill quando precisar implementar funcionalidades, corrigir bugs, refatorar codigo,
  criar endpoints REST, escrever migrations Flyway para PostgreSQL, analisar modulos Spring Boot,
  configurar Maven, revisar JPA/Hibernate multi-tenant, integrar MinIO (storage), RabbitMQ (mensageria),
  Redis, e tomar decisoes arquiteturais no projeto Java 8 multi-modulo (on-premise).
  Palavras-chave: Java, Spring Boot, Maven, PostgreSQL, REST API, JPA, Redis, RabbitMQ, MinIO,
  multi-tenant, schema, Flyway, modulo, endpoint, migration, refatoracao, debug, controller,
  service, repository, entidade, pom.xml, onpremise, Docker.
---

## Visao Geral da Skill

Esta skill fornece conhecimento especializado para desenvolver e manter o **PontoCore Backend**, um sistema de controle de ponto eletronico (PTRP) construido com Java 8 e Spring Boot em arquitetura multi-modulo Maven, rodando **on-premise** com PostgreSQL 16, Redis 7, RabbitMQ 3 e MinIO.

---

## Mapeamento de Modulos

Antes de qualquer alteracao, identifique o modulo correto:

| Modulo | Proposito | Quando usar |
|---|---|---|
| `b-inn-module-core` | Nucleo, configuracoes base, Flyway, multi-tenant | Configuracoes transversais, listeners, interceptors, migrations |
| `c-inn-module-auth` | Autenticacao de dispositivos REP via hardware | Requisicoes de relogios de ponto, tokens de dispositivo |
| `d-inn-module-ws` | Interface com front-end Angular | Novos endpoints consumidos pelo front-end |
| `e-inn-module-rest-comm` | Comunicacao REST com dispositivos e servicos externos | Integracao com REP-P, chamadas externas |
| `f-inn-module-manager` | Regras de negocio principais (jornadas, batidas, funcionarios) | A maioria das funcionalidades de negocio |
| `g-inn-module-commons` | Utilitarios, helpers, classes base | Sempre verifique aqui antes de criar codigo utilitario |
| `h-inn-module-model` | Entidades JPA, enums, DTOs | Modelos de dados, mapeamento de tabelas |

---

## Padroes de Implementacao

### Estrutura de Camadas (por modulo)

```
controller/   -> Recebe requisicoes HTTP, valida entrada, delega ao service
service/      -> Regras de negocio, transacoes (@Transactional)
repository/   -> Acesso a dados (Spring Data JPA / queries nativas)
model/        -> Entidades JPA (centralizado em h-inn-module-model)
dto/          -> Objetos de transferencia de dados (request/response)
config/       -> Beans de configuracao Spring
```

### Controller REST -- template padrao

```java
@RestController
@RequestMapping("/api/v1/recurso")
public class RecursoController {

    @Autowired
    private RecursoService recursoService;

    @GetMapping
    public ResponseEntity<List<RecursoDTO>> listar() {
        return ResponseEntity.ok(recursoService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<RecursoDTO> criar(@Valid @RequestBody RecursoDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recursoService.criar(dto));
    }
}
```

### Service -- template padrao

```java
@Service
@Transactional
public class RecursoService {

    @Autowired
    private RecursoRepository recursoRepository;

    public List<RecursoDTO> listarTodos() {
        return recursoRepository.findAll()
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    private RecursoDTO toDTO(Recurso entity) {
        // mapeamento entity -> DTO
    }
}
```

### Repository -- boas praticas

```java
public interface RecursoRepository extends JpaRepository<Recurso, Long> {

    // Prefira query methods quando possivel
    List<Recurso> findByAtivoTrue();

    // Use @Query para consultas complexas
    @Query("SELECT r FROM Recurso r WHERE r.empresa.id = :empresaId AND r.data BETWEEN :inicio AND :fim")
    List<Recurso> findByEmpresaAndPeriodo(@Param("empresaId") Long empresaId,
                                          @Param("inicio") LocalDate inicio,
                                          @Param("fim") LocalDate fim);
}
```

---

## Banco de Dados (PostgreSQL 16 -- perfil onpremise)

### Regras para migrations Flyway

- Migrations do schema `management` (tabelas do sistema): `b-inn-module-core/src/main/resources/db/migration/management/`
- Migrations dos schemas `tenant_xxx` (dados de negocio): `b-inn-module-core/src/main/resources/db/migration/tenant/`
- Nomenclatura: `V<numero>__<descricao_snake_case>.sql`
- **Nunca** alterar migrations existentes — sempre criar nova versao
- Sempre incluir cabecalho com proposito, data e autor

```sql
-- =============================================================
-- Descricao : Adiciona coluna motivo_afastamento na tabela funcionario
-- Versao    : V3
-- Data      : 2026-06-01
-- Autor     : Dev
-- Schema    : tenant (aplicado em todos os tenants via TenantSchemaFlywayCallback)
-- =============================================================

ALTER TABLE funcionario
    ADD COLUMN IF NOT EXISTS motivo_afastamento VARCHAR(200) NULL;
```

### Convencoes PostgreSQL

- Nomes de tabelas e colunas **sem aspas duplas** (armazenados em lowercase pelo PostgreSQL)
- Hibernate gera SQL em lowercase sem aspas -- devem coincidir
- Use `GENERATED ALWAYS AS IDENTITY` no lugar de `SERIAL` para PKs (padrao PG16)
- Prefira `TIMESTAMPTZ` para timestamps com fuso horario

```sql
-- CORRETO (PG16 onpremise)
CREATE TABLE funcionario (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL,
    cpf        VARCHAR(14)  NOT NULL,
    criadoem   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ERRADO (causa problemas com Hibernate)
CREATE TABLE "Funcionario" (
    "Id"   SERIAL PRIMARY KEY,   -- evite SERIAL
    "Nome" VARCHAR(150) NOT NULL -- aspas duplas criam case-sensitivity
);
```

---

## Multi-Tenant (PostgreSQL schema-per-tenant)

### Como funciona
1. Request chega com identificador do tenant (header / JWT)
2. `TenantInterceptor` -> `TenantContext` (ThreadLocal)
3. `TenantSchemaResolver` retorna o tenant ao Hibernate
4. `SchemaMultiTenantProvider` executa `SET search_path TO tenant_xxx`
5. Toda query JPA opera no schema do tenant

### Acessar schema management de dentro de tenant
```java
// Use entityManager com query nativa e schema explicito quando necessario
@Query(value = "SELECT c.basesql FROM management.cliente c WHERE c.ativo = TRUE", nativeQuery = true)
List<String> findAllActiveTenantSchemas();
```

### TenantSchemaFlywayCallback
Quando uma nova migration de tenant e criada em `db/migration/tenant/`, ela e aplicada automaticamente em **todos** os schemas de tenant ativos. O `TenantSchemaFlywayCallback` iteraa `management.cliente WHERE ativo = TRUE`.

---

## MinIO (Storage -- substitui Azure Blob)

### Uso do MinioAdapter
```java
@Autowired
private MinioStorageAdapter minioStorageAdapter;  // em g-inn-module-commons

// Upload de arquivo
minioStorageAdapter.upload("fotos-funcionarios", "foto_123.jpg", inputStream, contentType);

// Download
InputStream is = minioStorageAdapter.download("fotos-funcionarios", "foto_123.jpg");

// URL publica temporaria
String url = minioStorageAdapter.getPresignedUrl("fotos-funcionarios", "foto_123.jpg", 60); // 60 min
```

### Buckets padrao
| Bucket | Conteudo |
|---|---|
| `fotos-funcionarios` | Selfies de batida de ponto |
| `relatorios-pdf` | Espelhos de ponto e relatorios JasperReports |
| `firmware-rep` | Arquivos de firmware para REP-P |

---

## RabbitMQ (Mensageria -- substitui Kafka)

### Producao de mensagem
```java
@Autowired
private RabbitTemplate rabbitTemplate;

rabbitTemplate.convertAndSend("pontocore.exchange", "presenca.calcular", payload);
```

### Consumo de mensagem
```java
@RabbitListener(queues = "presenca.calcular.queue")
public void processarPresenca(PresencaMessage message) {
    // processamento assincrono
}
```

---

## Redis -- Cache

```java
@Cacheable(value = "funcionarios", key = "#empresaId")
public List<Funcionario> buscarPorEmpresa(Long empresaId) { ... }

@CacheEvict(value = "funcionarios", key = "#empresaId")
public void atualizarFuncionario(Long empresaId, ...) { ... }
```

---

## Profiles e Ambientes

| Profile | Ambiente | Banco | Startup |
|---|---|---|---|
| `onpremise` | Desenvolvimento local / Docker | PostgreSQL 5433 local | `java -Dspring.profiles.active=onpremise -jar ponto-qa-api.jar` |
| `innova_prod` | Producao Innova (legado Azure) | SQL Server Azure | `startup_innova.sh` |
| `ameps_prod` | Producao Ameps (legado Azure) | SQL Server Azure | `startup_ameps.sh` |
| `sirium_prod` | Producao Sirium (legado Azure) | SQL Server Azure | `startup_sirium.sh` |
| `qa` | Homologacao | Varia | `startup_qa.sh` |

### Docker Compose (onpremise)
```bash
# Subir infraestrutura local
docker-compose -f docker-compose.onpremise.yml up -d

# Verificar saude
curl http://localhost:8090/apiponto/actuator/health
```

---

## Dependencias entre Modulos

Ao adicionar dependencia de um modulo, edite o `pom.xml` do modulo dependente:

```xml
<dependency>
    <groupId>br.com.innova</groupId>
    <artifactId>inn-module-commons</artifactId>
    <version>${project.version}</version>
</dependency>
```

Hierarquia de dependencias comum:
- `f-inn-module-manager` -> depende de `g-commons` e `h-model`
- `c-inn-module-auth` -> depende de `g-commons` e `h-model`
- `d-inn-module-ws` -> depende de `f-manager` (indiretamente via REST)

---

## Checklist antes de finalizar qualquer implementacao

- [ ] Modulo correto identificado e alterado
- [ ] Sem duplicacao com `g-inn-module-commons`
- [ ] Modelos de dados em `h-inn-module-model`
- [ ] Validacoes de entrada com `@Valid` / Bean Validation
- [ ] Tratamento de excecoes com respostas HTTP semanticas
- [ ] Migration Flyway criada se houver alteracao de schema (sem aspas duplas, GENERATED ALWAYS AS IDENTITY)
- [ ] Compatibilidade Java 8 mantida (sem features Java 9+)
- [ ] `pom.xml` atualizado se nova dependencia adicionada
- [ ] Build `mvn clean install` passaria sem erros
- [ ] Comportamento testado com profile `onpremise` (Docker local)
- [ ] Storage: usar MinioStorageAdapter (nao azure-storage diretamente)
- [ ] Mensageria: usar RabbitMQ (nao Kafka diretamente na nova arquitetura)
````