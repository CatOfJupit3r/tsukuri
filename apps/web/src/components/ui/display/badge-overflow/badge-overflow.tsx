import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Fragment, useCallback, useMemo } from 'react';

import { cn } from '#~/lib/utils';

import { selectVisibleBadges } from './badge-overflow.utils';
import { useBadgeMeasurements } from './use-badge-measurements';

export interface iBadgeOverflowProps<T = string> extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  items: T[];
  getBadgeLabel?: (item: T) => string;
  lineCount?: number;
  renderBadge: (item: T, label: string) => ReactNode;
  renderOverflow?: (count: number) => ReactNode;
}

function OverflowBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-xs font-semibold">
      +{count}
    </span>
  );
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
  const getBadgeLabel = useCallback(
    (item: T) => {
      if (typeof item === 'object' && !getBadgeLabelProp) {
        throw new Error('getBadgeLabel is required when badge items are objects.');
      }
      return getBadgeLabelProp ? getBadgeLabelProp(item) : String(item);
    },
    [getBadgeLabelProp],
  );
  const { rootRef, measureRef, containerWidth, badgeGap, badgeHeight, overflowBadgeWidth, isMeasured, badgeWidths } =
    useBadgeMeasurements(items, getBadgeLabel);
  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref, rootRef],
  );

  const placeholderHeight = badgeHeight * lineCount + badgeGap * (lineCount - 1);
  const { visibleItems, hiddenCount } = useMemo(
    () =>
      selectVisibleBadges({
        items,
        getBadgeLabel,
        badgeWidths,
        badgeGap,
        containerWidth,
        overflowBadgeWidth,
        lineCount,
      }),
    [badgeGap, badgeWidths, containerWidth, getBadgeLabel, items, lineCount, overflowBadgeWidth],
  );
  const displayedItems = isMeasured ? visibleItems : items.slice(0, Math.max(1, lineCount * 3 - 1));

  return (
    <>
      <div ref={measureRef} className="pointer-events-none invisible absolute flex flex-wrap" style={{ gap: badgeGap }}>
        {items.map((item) => (
          <Fragment key={getBadgeLabel(item)}>{renderBadge(item, getBadgeLabel(item))}</Fragment>
        ))}
        {renderOverflow ? renderOverflow(99) : <OverflowBadge count={99} />}
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
          ? (renderOverflow?.(hiddenCount) ?? <OverflowBadge count={hiddenCount} />)
          : null}
      </div>
    </>
  );
}
