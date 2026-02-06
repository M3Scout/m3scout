# Memory: architecture/performance/mobile-optimization-standard
Updated: 2026-02-06

## Mobile Performance Optimization Strategy

A estratégia de performance foca em carregamento instantâneo e fluidez em dispositivos móveis:

### 1. Code-Splitting
- Rotas são carregadas via `React.lazy()` (src/App.tsx)
- Cada rota gera um chunk separado no build

### 2. Prefetching Inteligente
- Após `boot_complete`, módulos críticos (ex: Live Match) são pré-carregados via `requestIdleCallback`
- Hook: `usePrefetchRoutes.ts`
- Lib: `routePrefetch.ts`

### 3. LCP Optimization
- Imagens principais usam `fetchpriority="high"`, `loading="eager"` e `decoding="async"`
- O utilitário `getOptimizedImageUrl` aplica redimensionamento via Supabase com presets:
  - avatar: 200w
  - card: 600w
  - profile: 1200w
  - hero: 1920w

### 4. Fontes
- Utiliza `font-display: swap` globalmente
- Preload do peso principal Inter Regular (woff2)
- Preconnect para fonts.googleapis.com e fonts.gstatic.com

### 5. Virtualização
- Listas com mais de 50 itens utilizam o componente `VirtualList` (@tanstack/react-virtual)
- Hook: `useVirtualList.ts`
- Garante 60fps no scroll

### 6. Service Worker (vite-plugin-pwa)
- **m3-images-v1**: Stale-While-Revalidate para imagens Supabase (máx 300 entradas, LRU)
- **m3-assets-v1**: CacheFirst para imagens estáticas locais (imutável, 1 ano)
- **js/css-assets-cache**: CacheFirst para bundles com hash
- **html-pages-cache**: NetworkFirst com timeout 3s
- Exclusões: `/auth/*`, `/rest/v1/rpc/*`, `/user_roles`, `/user_permissions`

### 7. WebWorker para Cálculos Pesados
- Worker: `src/workers/statsWorker.ts`
- Client: `src/lib/workerClient.ts`
- Tasks suportadas:
  - `aggregate_stats`: Agregação de estatísticas
  - `calculate_rating`: Cálculo de nota do atleta
  - `rank_players`: Ranking/sorting de atletas
  - `generate_insights`: Geração de insights do dashboard
- Timeout: 2s (fallback para main thread se exceder ou Worker não suportado)
- Telemetria: `localStorage.m3_worker_telemetry` (últimos 100 eventos)

### 8. Cache RBAC
- Permissões possuem TTL de 3 minutos para evitar refetch em cada navegação

### 9. Debug
- Página `/app/debug/performance` mostra:
  - Web Vitals (LCP, INP, CLS, TTFB, FCP)
  - Memória JS (Chrome)
  - Rotas pré-carregadas
  - Status do Service Worker e caches
  - Estatísticas do WebWorker
