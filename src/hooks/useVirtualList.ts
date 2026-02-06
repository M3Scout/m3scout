/**
 * Virtual List Hook
 * 
 * Provides performant virtualized scrolling for large lists.
 * Uses @tanstack/react-virtual under the hood.
 * 
 * Features:
 * - Only renders visible items (+ overscan buffer)
 * - Works with iOS Safari
 * - Compatible with infinite scroll
 * - Preserves filters and search functionality
 */

import { useRef, useMemo, useCallback } from "react";
import { useVirtualizer, VirtualizerOptions } from "@tanstack/react-virtual";

interface UseVirtualListOptions<T> {
  /** Array of items to virtualize */
  items: T[];
  /** Estimated height of each item in pixels */
  estimateSize: number;
  /** Number of items to render outside visible area (default: 5) */
  overscan?: number;
  /** Enable/disable virtualization (useful for small lists) */
  enabled?: boolean;
  /** Threshold below which virtualization is skipped (default: 50) */
  minItemsForVirtualization?: number;
  /** Get unique key for each item */
  getItemKey?: (index: number) => string | number;
  /** Gap between items in pixels */
  gap?: number;
}

export function useVirtualList<T>({
  items,
  estimateSize,
  overscan = 5,
  enabled = true,
  minItemsForVirtualization = 50,
  getItemKey,
  gap = 0,
}: UseVirtualListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Only virtualize if we have enough items
  const shouldVirtualize = enabled && items.length >= minItemsForVirtualization;
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
    getItemKey: getItemKey ?? ((index) => index),
    enabled: shouldVirtualize,
  });
  
  const virtualItems = virtualizer.getVirtualItems();
  
  // Calculate total height for container
  const totalHeight = virtualizer.getTotalSize();
  
  // Get the visible items with their virtual positioning
  const visibleItems = useMemo(() => {
    if (!shouldVirtualize) {
      // Return all items when not virtualizing
      return items.map((item, index) => ({
        item,
        index,
        start: index * (estimateSize + gap),
        size: estimateSize,
        isVirtual: false,
      }));
    }
    
    return virtualItems.map((virtualItem) => ({
      item: items[virtualItem.index],
      index: virtualItem.index,
      start: virtualItem.start,
      size: virtualItem.size,
      isVirtual: true,
    }));
  }, [items, virtualItems, shouldVirtualize, estimateSize, gap]);
  
  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number, options?: { align?: "start" | "center" | "end" | "auto" }) => {
      virtualizer.scrollToIndex(index, options);
    },
    [virtualizer]
  );
  
  // Measure item (for dynamic heights)
  const measureItem = useCallback(
    (index: number) => {
      virtualizer.measureElement(
        parentRef.current?.querySelector(`[data-index="${index}"]`) as Element
      );
    },
    [virtualizer]
  );
  
  return {
    /** Ref to attach to scrollable container */
    parentRef,
    /** Visible items with positioning info */
    visibleItems,
    /** Total height of all items (for container sizing) */
    totalHeight,
    /** Whether virtualization is active */
    isVirtualized: shouldVirtualize,
    /** Virtualizer instance for advanced usage */
    virtualizer,
    /** Scroll to specific index */
    scrollToIndex,
    /** Re-measure item at index */
    measureItem,
    /** Total item count */
    itemCount: items.length,
  };
}

/**
 * Virtual List Container Component Props
 */
export interface VirtualListContainerProps {
  /** Total height from useVirtualList */
  totalHeight: number;
  /** Whether virtualization is active */
  isVirtualized: boolean;
  /** Children to render */
  children: React.ReactNode;
}

/**
 * Helper to create the inner container with proper height
 */
export function getVirtualContainerStyle(totalHeight: number, isVirtualized: boolean): React.CSSProperties {
  if (!isVirtualized) {
    return {};
  }
  
  return {
    height: `${totalHeight}px`,
    width: "100%",
    position: "relative",
  };
}

/**
 * Helper to create item positioning styles
 */
export function getVirtualItemStyle(start: number, isVirtualized: boolean): React.CSSProperties {
  if (!isVirtualized) {
    return {};
  }
  
  return {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    transform: `translateY(${start}px)`,
  };
}
