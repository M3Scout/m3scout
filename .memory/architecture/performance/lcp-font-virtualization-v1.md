# Memory: architecture/performance/lcp-font-virtualization-v1
Updated: 2025-02-06

## LCP Optimization

### Hero Image (Landing Page `/`)
- **Element**: `hero-stadium-cinematic.jpg` na CinematicHero
- **Otimizações aplicadas**:
  - `fetchpriority="high"` para prioridade máxima de download
  - `loading="eager"` para carregamento imediato (não lazy)
  - `decoding="async"` para não bloquear thread principal
  - Importado via ES6 para bundling e cache-busting automático

### Outras Páginas
- `/atletas`: Primeiro card de atleta (foto do jogador)
- `/app/dashboard`: Hero section / KPI Cards
- `/app/live-match`: Scoreboard / Timer

## Font Optimization

### Estratégia
1. **Preload da fonte principal**: Inter Regular (woff2) carregado via `<link rel="preload">` no `index.html`
2. **font-display: swap**: Todas as fontes usam `display=swap` para evitar FOIT (Flash of Invisible Text)
3. **Preconnect**: Conexão prévia com `fonts.googleapis.com` e `fonts.gstatic.com`

### Arquivos Modificados
- `index.html`: Adicionado preload e preconnect
- `src/index.css`: Comentário de fallback com display=swap

## List Virtualization

### Biblioteca
- `@tanstack/react-virtual` instalada

### Componentes Criados
- `src/hooks/useVirtualList.ts`: Hook reutilizável para virtualização
- `src/components/ui/virtual-list.tsx`: Componente wrapper

### Configuração
- **Threshold**: Virtualização ativa automaticamente para listas com 50+ items
- **Overscan**: 5 items adicionais renderizados fora da viewport
- **Compatibilidade**: iOS Safari, Chrome, Firefox

### Uso
```tsx
import { VirtualList } from "@/components/ui/virtual-list";

<VirtualList
  items={players}
  estimateSize={80}
  renderItem={(player, index) => <PlayerCard player={player} />}
  className="max-h-[600px]"
/>
```

## Debug Page
Todas as métricas visíveis em `/app/debug/performance`:
- Web Vitals (LCP, INP, CLS, TTFB, FCP)
- Status de prefetch
- Elementos LCP por página
- Status de virtualização
