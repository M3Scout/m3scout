/**
 * Virtual List Component
 * 
 * Wrapper component for virtualized lists.
 * Handles the container setup and item positioning automatically.
 * 
 * Usage:
 * ```tsx
 * <VirtualList
 *   items={players}
 *   estimateSize={80}
 *   renderItem={(player, index) => <PlayerCard key={player.id} player={player} />}
 *   className="max-h-[600px]"
 * />
 * ```
 */

import { forwardRef, ReactNode, useMemo } from "react";
import { useVirtualList, getVirtualContainerStyle, getVirtualItemStyle } from "@/hooks/useVirtualList";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated height of each item in pixels */
  estimateSize: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Get unique key for each item */
  getItemKey?: (item: T, index: number) => string | number;
  /** Container className (should include max-height/height for scrolling) */
  className?: string;
  /** Inner list className */
  listClassName?: string;
  /** Number of items to render outside visible area */
  overscan?: number;
  /** Minimum items before virtualization kicks in */
  minItemsForVirtualization?: number;
  /** Enable/disable virtualization */
  enabled?: boolean;
  /** Gap between items */
  gap?: number;
  /** Loading state - shows skeleton/loading indicator */
  isLoading?: boolean;
  /** Loading skeleton component */
  loadingSkeleton?: ReactNode;
  /** Empty state component */
  emptyState?: ReactNode;
  /** Footer (e.g., infinite scroll sentinel) */
  footer?: ReactNode;
}

function VirtualListInner<T>(
  {
    items,
    estimateSize,
    renderItem,
    getItemKey,
    className,
    listClassName,
    overscan = 5,
    minItemsForVirtualization = 50,
    enabled = true,
    gap = 0,
    isLoading = false,
    loadingSkeleton,
    emptyState,
    footer,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const {
    parentRef,
    visibleItems,
    totalHeight,
    isVirtualized,
  } = useVirtualList({
    items,
    estimateSize,
    overscan,
    enabled,
    minItemsForVirtualization,
    getItemKey: getItemKey 
      ? (index) => getItemKey(items[index], index)
      : undefined,
    gap,
  });
  
  // Merge refs
  const setRefs = (el: HTMLDivElement | null) => {
    (parentRef as any).current = el;
    if (typeof ref === "function") {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };
  
  // Loading state
  if (isLoading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }
  
  // Empty state
  if (!isLoading && items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }
  
  return (
    <div
      ref={setRefs}
      className={cn("overflow-auto", className)}
    >
      <div
        style={getVirtualContainerStyle(totalHeight, isVirtualized)}
        className={listClassName}
      >
        {visibleItems.map(({ item, index, start, isVirtual }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            data-index={index}
            style={getVirtualItemStyle(start, isVirtual)}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}

// Forward ref with generic support
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof VirtualListInner>;

/**
 * Hook export for custom implementations
 */
export { useVirtualList, getVirtualContainerStyle, getVirtualItemStyle } from "@/hooks/useVirtualList";
