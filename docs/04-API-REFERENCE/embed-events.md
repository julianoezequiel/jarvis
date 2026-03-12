# Maya Widget — Embed Events API

> **Versão**: Phase 4 (TASK-002)
> **Escopo**: Contrato de eventos JavaScript para integração do `MayaWidget` em aplicações host.

---

## Visão Geral

O `MayaWidget` utiliza a **CustomEvent API nativa do browser** para comunicação bidirecional com a aplicação host. Você pode:

- **Disparar eventos para o widget** — solicitar enrollment de voz de um usuário
- **Ouvir eventos do widget** — receber o resultado do enrollment quando concluir

Todos os eventos são despachados em `window`.

---

## Eventos Recebidos pelo Widget

### `maya:enroll-voice`

Abre o fluxo de enrollment de voz para o usuário informado.

**Trigger:**
```ts
window.dispatchEvent(new CustomEvent('maya:enroll-voice', {
  detail: {
    name:   string,       // Nome a pré-preencher no modal (obrigatório)
    userId: string,       // ID do usuário na aplicação host (opcional)
  }
}))
```

**Comportamento:**
1. O widget expande a sidebar (se estiver minimizado)
2. Abre o modal `WidgetEnrollModal` com o campo `name` pré-preenchido
3. O usuário pode editar o nome, depois grava 5 segundos de voz
4. Ao concluir (sucesso ou erro), dispara `maya:enroll-complete`

**Campos do `detail`:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | `string` | Sim | Nome do usuário a ser cadastrado |
| `userId` | `string` | Não | ID externo; repassado intacto em `maya:enroll-complete` |

---

## Eventos Disparados pelo Widget

### `maya:enroll-complete`

Disparado quando o fluxo de enrollment termina — com sucesso ou falha.

**Payload:**
```ts
window.addEventListener('maya:enroll-complete', (event: CustomEvent) => {
  const { name, userId, success, error } = event.detail as {
    name:    string            // Nome cadastrado (ou tentado)
    userId?: string            // Mesmo valor passado em maya:enroll-voice
    success: boolean           // true = perfil salvo, false = falhou
    error?:  string            // Mensagem de erro (apenas se success = false)
  }
})
```

**Campos do `detail`:**

| Campo | Tipo | Sempre presente | Descrição |
|---|---|---|---|
| `name` | `string` | ✅ | Nome informado no modal |
| `userId` | `string \| undefined` | Somente se fornecido | Repasse do `userId` recebido |
| `success` | `boolean` | ✅ | `true` → perfil biométrico salvo com sucesso |
| `error` | `string \| undefined` | Somente se `success=false` | Descrição do erro |

---

## Evento interno (não-público)

### `maya:enroll-intent` *(uso interno)*

Disparado pela aba **Vozes** do `WidgetSettingsModal` para abrir o modal de enrollment sem `userId`. **Não deve ser usado pela aplicação host** — use `maya:enroll-voice` para integrações externas.

```ts
// Apenas documentado para referência interna
window.dispatchEvent(new CustomEvent('maya:enroll-intent', {
  detail: { suggestedName?: string }
}))
```

---

## Exemplo completo — Angular

```typescript
// enroll-user.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core'

@Component({ template: `<button (click)="enrollUser()">Cadastrar Voz</button>` })
export class EnrollUserComponent implements OnInit, OnDestroy {

  // --- Ouvir o resultado -------------------------------------------

  ngOnInit(): void {
    window.addEventListener('maya:enroll-complete', this.onEnrollComplete)
  }

  ngOnDestroy(): void {
    window.removeEventListener('maya:enroll-complete', this.onEnrollComplete)
  }

  private onEnrollComplete = (event: Event): void => {
    const e = event as CustomEvent<{
      name: string
      userId?: string
      success: boolean
      error?: string
    }>

    if (e.detail.success) {
      console.log(`Voz cadastrada: ${e.detail.name} (userId: ${e.detail.userId})`)
      // atualize seu estado / banco de dados
    } else {
      console.error(`Falha no enrollment: ${e.detail.error}`)
    }
  }

  // --- Solicitar o enrollment ---------------------------------------

  enrollUser(): void {
    window.dispatchEvent(new CustomEvent('maya:enroll-voice', {
      detail: {
        name:   'João Silva',       // pré-preenche o campo de nome
        userId: 'usr_abc123',       // repassado intacto no resultado
      },
    }))
  }
}
```

### Tipagem TypeScript recomendada

```typescript
// maya-widget.events.ts

export interface MayaEnrollVoiceDetail {
  name:    string
  userId?: string
}

export interface MayaEnrollCompleteDetail {
  name:    string
  userId?: string
  success: boolean
  error?:  string
}

/** Dispara o evento de enrollment para o widget */
export function dispatchMayaEnrollVoice(detail: MayaEnrollVoiceDetail): void {
  window.dispatchEvent(new CustomEvent('maya:enroll-voice', { detail }))
}

/** Registra ouvinte para o resultado do enrollment */
export function onMayaEnrollComplete(
  callback: (detail: MayaEnrollCompleteDetail) => void
): () => void {
  const handler = (e: Event) =>
    callback((e as CustomEvent<MayaEnrollCompleteDetail>).detail)
  window.addEventListener('maya:enroll-complete', handler)
  return () => window.removeEventListener('maya:enroll-complete', handler)
}
```

Uso com Angular/RxJS:

```typescript
import { dispatchMayaEnrollVoice, onMayaEnrollComplete } from './maya-widget.events'

// em ngOnInit:
const removeListener = onMayaEnrollComplete(detail => {
  if (detail.success) this.markUserVoiceEnrolled(detail.userId!)
})

// em ngOnDestroy:
removeListener()

// ao clicar em "Cadastrar":
dispatchMayaEnrollVoice({ name: user.name, userId: user.id })
```

---

## Fluxo de sequência resumido

```
HOST                                          WIDGET
  │                                              │
  │  dispatchEvent('maya:enroll-voice', …)  ───▶ │
  │                                              │
  │                               ┌─────────────┤
  │                               │ Expande sidebar
  │                               │ Abre WidgetEnrollModal
  │                               │ Usuário fala 5s
  │                               │ POST /api/speaker-enroll
  │                               └─────────────┤
  │                                              │
  │  ◀───  dispatchEvent('maya:enroll-complete') │
  │                                              │
```

---

## Notas de implementação

- O widget usa a **Web Audio API** para capturar o áudio via `window.__mayaGetLastAudioB64(sec)` — esse buffer é preenchido pelo `MicPermissionOverlay` que deve ter sido autorizado pelo usuário.
- O modal de enrollment tem `z-index: 10001`, acima do `WidgetSettingsModal` (10000) e da sidebar (9999).
- O `userId` não é processado pelo widget — é simplesmente ecoado de volta no evento `maya:enroll-complete` para correlação pelo host.
