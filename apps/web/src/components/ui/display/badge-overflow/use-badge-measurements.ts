import { useLayoutEffect, useRef, useState } from 'react';

const DEFAULT_BADGE_GAP = 4;
const DEFAULT_BADGE_HEIGHT = 20;
const DEFAULT_OVERFLOW_BADGE_WIDTH = 40;

function readBadgeWidths<T>(measureElement: HTMLElement, items: T[], getBadgeLabel: (item: T) => string) {
  const widthMap = new Map<string, number>();
  for (let index = 0; index < items.length; index += 1) {
    const child = measureElement.children[index] as HTMLElement | undefined;
    const item = items[index];
    if (child && item !== undefined) widthMap.set(getBadgeLabel(item), child.offsetWidth);
  }
  return widthMap;
}

/** Measures every badge in a hidden copy of the list, and the container, whenever it resizes. */
export function useBadgeMeasurements<T>(items: T[], getBadgeLabel: (item: T) => string) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [badgeGap, setBadgeGap] = useState(DEFAULT_BADGE_GAP);
  const [badgeHeight, setBadgeHeight] = useState(DEFAULT_BADGE_HEIGHT);
  const [overflowBadgeWidth, setOverflowBadgeWidth] = useState(DEFAULT_OVERFLOW_BADGE_WIDTH);
  const [isMeasured, setIsMeasured] = useState(false);
  const [badgeWidths, setBadgeWidths] = useState<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return undefined;
    const rootElement = root;
    const measureElement = measure;

    function measureBadges() {
      const computedStyle = getComputedStyle(rootElement);
      const totalPadding =
        (Number.parseFloat(computedStyle.paddingLeft) || 0) + (Number.parseFloat(computedStyle.paddingRight) || 0);
      const firstBadge = measureElement.children[0] as HTMLElement | undefined;
      const overflowBadge = measureElement.children[items.length] as HTMLElement | undefined;
      setBadgeGap(Number.parseFloat(computedStyle.gap) || DEFAULT_BADGE_GAP);
      setBadgeWidths(readBadgeWidths(measureElement, items, getBadgeLabel));
      setBadgeHeight(firstBadge?.offsetHeight ?? DEFAULT_BADGE_HEIGHT);
      setOverflowBadgeWidth(overflowBadge?.offsetWidth ?? DEFAULT_OVERFLOW_BADGE_WIDTH);
      setContainerWidth(rootElement.clientWidth - totalPadding);
      setIsMeasured(true);
    }

    measureBadges();
    const resizeObserver = new ResizeObserver(measureBadges);
    resizeObserver.observe(rootElement);
    return () => resizeObserver.disconnect();
  }, [getBadgeLabel, items]);

  return {
    rootRef,
    measureRef,
    containerWidth,
    badgeGap,
    badgeHeight,
    overflowBadgeWidth,
    isMeasured,
    badgeWidths,
  };
}
