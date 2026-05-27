import { useEffect, useEffectEvent, useRef } from "react";
export { INITIAL_RENDER_COUNT, RENDER_BATCH_SIZE } from "../../lib/incrementalPokemonGrid";

export function useIncrementalPokemonGrid(hasMore: boolean, onLoadMore: () => void) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const handleLoadMore = useEffectEvent(() => {
    if (hasMore) {
      onLoadMore();
    }
  });

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        handleLoadMore();
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore]);

  return loadMoreRef;
}
