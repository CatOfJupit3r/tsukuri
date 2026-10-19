import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { Children, cloneElement, isValidElement } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import { cn } from '#~/lib/utils';

const avatarGroupVariants = cva('flex items-center', {
  variants: {
    orientation: { horizontal: 'flex-row', vertical: 'flex-col' },
    dir: { ltr: '', rtl: '' },
  },
  compoundVariants: [
    { orientation: 'horizontal', dir: 'ltr', className: '-space-x-1' },
    { orientation: 'horizontal', dir: 'rtl', className: 'flex-row-reverse -space-x-1 space-x-reverse' },
    { orientation: 'vertical', dir: 'ltr', className: '-space-y-1' },
    { orientation: 'vertical', dir: 'rtl', className: 'flex-col-reverse -space-y-1 space-y-reverse' },
  ],
  defaultVariants: { orientation: 'horizontal', dir: 'ltr' },
});

interface iAvatarGroupProps
  extends
    Omit<ComponentProps<'div'>, 'dir'>,
    Omit<VariantProps<typeof avatarGroupVariants>, 'dir'>,
    useRender.ComponentProps<'div'> {
  dir?: 'ltr' | 'rtl';
  size?: number;
  max?: number;
  isReverse?: boolean;
  renderOverflow?: (count: number) => ReactNode;
}

export function AvatarGroup({
  orientation = 'horizontal',
  dir = 'ltr',
  size = 40,
  max,
  isReverse = false,
  renderOverflow,
  className,
  children,
  render,
  ...rootProps
}: iAvatarGroupProps) {
  const childrenArray = Children.toArray(children).filter(isValidElement);
  const itemCount = childrenArray.length;
  const shouldTruncate = Boolean(max && itemCount > max);
  const visibleItems = shouldTruncate && max ? childrenArray.slice(0, max - 1) : childrenArray;
  const overflowCount = shouldTruncate && max ? itemCount - (max - 1) : 0;
  const totalRenderedItems = shouldTruncate && max ? max : itemCount;

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(avatarGroupVariants({ orientation, dir, className })),
        children: (
          <>
            {Children.map(visibleItems, (child, index) => (
              <AvatarGroupItem
                child={child}
                index={index}
                itemCount={totalRenderedItems}
                orientation={orientation}
                dir={dir}
                size={size}
                isReverse={isReverse}
              />
            ))}
            {shouldTruncate ? (
              <AvatarGroupItem
                child={
                  renderOverflow ? (
                    renderOverflow(overflowCount)
                  ) : (
                    <div className="inline-flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      +{overflowCount}
                    </div>
                  )
                }
                index={visibleItems.length}
                itemCount={totalRenderedItems}
                orientation={orientation}
                dir={dir}
                size={size}
                isReverse={isReverse}
              />
            ) : null}
          </>
        ),
      },
      rootProps,
    ),
    render,
    state: { slot: 'avatar-group', orientation },
  });
}

interface iAvatarGroupItemProps extends Omit<ComponentProps<'div'>, 'dir'>, VariantProps<typeof avatarGroupVariants> {
  child: ReactNode;
  index: number;
  itemCount: number;
  size: number;
  isReverse: boolean;
}

function AvatarGroupItem({
  child,
  index,
  size,
  orientation,
  dir = 'ltr',
  isReverse,
  itemCount,
  className,
  style,
  ...itemProps
}: iAvatarGroupItemProps) {
  if (!isValidElement<ComponentProps<'div'>>(child)) return null;
  return cloneElement(child, {
    ...itemProps,
    className: cn(
      'size-full shrink-0 overflow-hidden rounded-full [&_img]:size-full',
      className,
      child.props.className,
    ),
    style: {
      ...createAvatarMaskStyle({ size, index, orientation, dir, isReverse, itemCount }),
      ...style,
      ...child.props.style,
    },
  });
}

interface iAvatarMaskInput extends Pick<
  iAvatarGroupItemProps,
  'size' | 'index' | 'orientation' | 'dir' | 'isReverse' | 'itemCount'
> {}

function createAvatarMaskStyle({
  size,
  index,
  orientation,
  dir,
  isReverse,
  itemCount,
}: iAvatarMaskInput): CSSProperties {
  const isVerticallyReversedRtl = orientation === 'vertical' && dir === 'rtl' && isReverse;
  let shouldMask: boolean;
  if (isVerticallyReversedRtl) shouldMask = index !== itemCount - 1;
  else if (isReverse) shouldMask = index < itemCount - 1;
  else shouldMask = index > 0;
  if (!shouldMask) return { width: size, height: size };
  const maskRadius = size / 2;
  const maskOffset = size / 4 + size / 10;
  const isVertical = orientation === 'vertical';
  const isLeadingMask = dir === 'ltr' ? !isReverse : isReverse;
  const maskCoordinate = isLeadingMask ? `-${maskOffset}px` : `${size + maskOffset}px`;
  const position = isVertical ? `50% ${maskCoordinate}` : `${maskCoordinate} 50%`;
  return {
    width: size,
    height: size,
    maskImage: `radial-gradient(circle ${maskRadius}px at ${position}, transparent 99%, white 100%)`,
  };
}
