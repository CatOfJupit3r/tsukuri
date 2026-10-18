import { useEffect, useEffectEvent } from 'react';
import type { RefObject } from 'react';

const THRESHOLD = 50; // px from bottom to consider "near bottom"

export function useNearScrollBottom(ref: RefObject<HTMLElement | null>, callback?: () => unknown, isEnabled = true) {
  const handleScroll = useEffectEvent(() => {
    const el = ref.current;
    if (!el || !isEnabled) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - THRESHOLD;

    if (isNearBottom) {
      callback?.();
    }
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!isEnabled) return undefined;

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [ref, isEnabled]);

  return null;
}
