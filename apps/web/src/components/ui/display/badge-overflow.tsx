import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '#~/lib/utils';

export interface iBadgeOverflowProps<T = string> extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  items: T[];
  getBadgeLabel?: (item: T) => string;
  lineCount?: number;
  renderBadge: (item: T, label: string) => ReactNode;
  renderOverflow?: (count: number) => ReactNode;
}

export function BadgeOverflow<T = string>({
  items,
  getBadgeLabel: getBadgeLabelProp,
  lineCount = 1,
  renderBadge,
  renderOverflow,
  className,
  style,
  ref,
  ...rootProps
}: iBadgeOverflowProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [badgeGap, setBadgeGap] = useState(4);
  const [badgeHeight, setBadgeHeight] = useState(20);
  const [overflowBadgeWidth, setOverflowBadgeWidth] = useState(40);
  const [isMeasured, setIsMeasured] = useState(false);
  const [badgeWidths, setBadgeWidths] = useState<Map<string, number>>(new Map());
  const getBadgeLabel = useCallback(
    (item: T) => {
      if (typeof item === 'object' && !getBadgeLabelProp) {
        throw new Error('getBadgeLabel is required when badge items are objects.');
      }
      return getBadgeLabelProp ? getBadgeLabelProp(item) : String(item);
    },
    [getBadgeLabelProp],
  );
  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return undefined;
    const rootElement = root;
    const measureElement = measure;

    function measureBadges() {
      const computedStyle = getComputedStyle(rootElement);
      const nextGap = Number.parseFloat(computedStyle.gap) || 4;
      const totalPadding =
        (Number.parseFloat(computedStyle.paddingLeft) || 0) + (Number.parseFloat(computedStyle.paddingRight) || 0);
      const widthMap = new Map<string, number>();
      for (let index = 0; index < items.length; index += 1) {
        const child = measureElement.children[index] as HTMLElement | undefined;
        const item = items[index];
        if (child && item !== undefined) widthMap.set(getBadgeLabel(item), child.offsetWidth);
      }
      const firstBadge = measureElement.children[0] as HTMLElement | undefined;
      const overflowBadge = measureElement.children[items.length] as HTMLElement | undefined;
      setBadgeGap(nextGap);
      setBadgeWidths(widthMap);
      setBadgeHeight(firstBadge?.offsetHeight ?? 20);
      setOverflowBadgeWidth(overflowBadge?.offsetWidth ?? 40);
      setContainerWidth(rootElement.clientWidth - totalPadding);
      setIsMeasured(true);
    }

    measureBadges();
    const resizeObserver = new ResizeObserver(measureBadges);
    resizeObserver.observe(rootElement);
    return () => resizeObserver.disconnect();
  }, [getBadgeLabel, items]);

  const placeholderHeight = badgeHeight * lineCount + badgeGap * (lineCount - 1);
  const { visibleItems, hiddenCount } = useMemo(() => {
    if (!containerWidth || items.length === 0 || badgeWidths.size === 0) {
      return { visibleItems: items, hiddenCount: 0 };
    }
    let currentLineWidth = 0;
    let currentLine = 1;
    const visible: T[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item === undefined) continue;
      const badgeWidth = badgeWidths.get(getBadgeLabel(item));
      if (!badgeWidth) continue;
      const widthWithGap = badgeWidth + badgeGap;
      const isLastLine = currentLine === lineCount;
      const hasMoreItems = index < items.length - 1;
      const availableWidth =
        isLastLine && hasMoreItems ? containerWidth - overflowBadgeWidth - badgeGap : containerWidth;
      if (currentLineWidth + widthWithGap <= availableWidth) {
        currentLineWidth += widthWithGap;
        visible.push(item);
      } else if (currentLine < lineCount) {
        currentLine += 1;
        currentLineWidth = widthWithGap;
        visible.push(item);
      } else {
        break;
      }
    }
    return { visibleItems: visible, hiddenCount: Math.max(0, items.length - visible.length) };
  }, [badgeGap, badgeWidths, containerWidth, getBadgeLabel, items, lineCount, overflowBadgeWidth]);
  const displayedItems = isMeasured ? visibleItems : items.slice(0, Math.max(1, lineCount * 3 - 1));

  return (
    <>
      <div ref={measureRef} className="pointer-events-none invisible absolute flex flex-wrap" style={{ gap: badgeGap }}>
        {items.map((item) => (
          <Fragment key={getBadgeLabel(item)}>{renderBadge(item, getBadgeLabel(item))}</Fragment>
        ))}
        {renderOverflow ? (
          renderOverflow(99)
        ) : (
          <span className="inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-xs font-semibold">
            +99
          </span>
        )}
      </div>
      <div
        {...rootProps}
        ref={setRootRef}
        className={cn('flex flex-wrap', className)}
        style={{ gap: badgeGap, ...(!isMeasured ? { minHeight: placeholderHeight } : {}), ...style }}
      >
        {displayedItems.map((item) => (
          <Fragment key={getBadgeLabel(item)}>{renderBadge(item, getBadgeLabel(item))}</Fragment>
        ))}
        {isMeasured && hiddenCount > 0
          ? (renderOverflow?.(hiddenCount) ?? (
              <span className="inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-xs font-semibold">
                +{hiddenCount}
              </span>
            ))
          : null}
      </div>
    </>
  );
}
