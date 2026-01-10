import { useEffect, useRef, useCallback, useState } from "react";

interface UseInfiniteScrollOptions {
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Root margin for intersection observer (default: "100px") */
  rootMargin?: string;
  /** Threshold for intersection observer (default: 0.1) */
  threshold?: number;
  /** Whether infinite scroll is enabled */
  enabled?: boolean;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "100px",
  threshold = 0.1,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      setIsIntersecting(entry?.isIntersecting ?? false);

      if (entry?.isIntersecting && hasMore && !isLoading && enabled) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore, enabled]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, rootMargin, threshold, enabled]);

  return {
    sentinelRef,
    isIntersecting,
  };
}
