interface iVisibleBadgesInput<T> {
  items: T[];
  getBadgeLabel: (item: T) => string;
  badgeWidths: Map<string, number>;
  badgeGap: number;
  containerWidth: number;
  overflowBadgeWidth: number;
  lineCount: number;
}

/** Fills up to `lineCount` lines with badges, keeping room for the overflow badge on the last line. */
export function selectVisibleBadges<T>({
  items,
  getBadgeLabel,
  badgeWidths,
  badgeGap,
  containerWidth,
  overflowBadgeWidth,
  lineCount,
}: iVisibleBadgesInput<T>) {
  if (!containerWidth || items.length === 0 || badgeWidths.size === 0) {
    return { visibleItems: items, hiddenCount: 0 };
  }
  let currentLineWidth = 0;
  let currentLine = 1;
  const visible: T[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const badgeWidth = item === undefined ? undefined : badgeWidths.get(getBadgeLabel(item));
    if (item === undefined || !badgeWidth) continue;
    const widthWithGap = badgeWidth + badgeGap;
    const isLastLine = currentLine === lineCount;
    const hasMoreItems = index < items.length - 1;
    const availableWidth = isLastLine && hasMoreItems ? containerWidth - overflowBadgeWidth - badgeGap : containerWidth;
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
}
