# Memory: technical/live-match/resilience-and-telemetry-v2

O módulo Live Match utiliza um sistema de fila de eventos (Event Queue) com persistência dual no IndexedDB (primário) e localStorage (fallback), e retentativas com backoff exponencial (1s, 2s, 4s) para garantir a durabilidade dos dados em redes móveis instáveis.

## Arquitetura de Persistência

1. **IndexedDB (Primário)**: Capacidade de 50MB+, operações não-bloqueantes, funciona em Service Workers
   - Database: `m3_live_match_queue`
   - Store: `events` com indexes em `matchId`, `status`, e `createdAt`
   - Eventos expiram após 24 horas

2. **localStorage (Fallback)**: Usado quando IndexedDB não está disponível
   - Chave: `m3_live_match_queue_{matchId}`
   - Migração automática para IndexedDB quando disponível

## Idempotência

Cada evento possui um `client_event_id` único (UUID) enviado ao servidor via RPC `create_live_event_v2`, garantindo que eventos duplicados (por retry ou reconexão) não criem registros duplicados.

## Status do Evento

```
pending → sending → confirmed (sucesso)
                 → failed (erro permanente após 3 tentativas)
```

## Indicadores Visuais (SyncStatusBadge)

- 🟢 **Sincronizado**: Todos os eventos confirmados
- 🟡 **Pendente**: Eventos aguardando sincronização
- 🔵 **Sincronizando**: Evento em transmissão
- 🔴 **Falhou**: Erro permanente (com botão de retry)
- ⚫ **Offline**: Dispositivo sem conexão (eventos serão sincronizados ao reconectar)

## Telemetria

Mantém um ring buffer de 200 eventos no localStorage, acessível via páginas de debug (`/app/debug/auth` e `/app/debug/live-match`). Todos os logs são isolados por um `boot_id` único gerado no início da aplicação.

Eventos de telemetria:
- `enqueue`, `send_start`, `send_success`, `send_fail`
- `retry_scheduled`, `migrate_to_indexeddb`
- `sync_status_change` (online/offline)
- `indexeddb_init`, `indexeddb_error`

## Arquivos Relacionados

- `src/lib/liveMatchEventQueue.ts` - Fila principal com localStorage
- `src/lib/liveMatchIndexedDB.ts` - Persistência IndexedDB
- `src/hooks/useLiveMatchQueue.ts` - Hook React com sync status
- `src/components/live-match/SyncStatusBadge.tsx` - Indicador visual
- `src/components/live-match/skeletons/` - Skeletons estruturais
