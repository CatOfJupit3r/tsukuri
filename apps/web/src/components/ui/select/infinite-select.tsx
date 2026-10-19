import { ClientOnly } from '@tanstack/react-router';
import { merge } from 'lodash-es';
import type { ReactNode, Ref, RefAttributes } from 'react';
import { forwardRef, useCallback, useId, useMemo, useRef } from 'react';
import { LuLoader } from 'react-icons/lu';
import SelectComponent, { components, createFilter } from 'react-select';
import type { GroupBase, MenuListProps, Props, SelectInstance } from 'react-select';

import { usePortalContainer } from '#~/components/ui/overlay/portal-container.context';
import { DEFAULT_SELECT_CLASSNAMES, DEFAULT_SELECT_STYLES } from '#~/components/ui/select/constants';
import {
  ClearIndicator,
  DropdownIndicator,
  Menu,
  MultiValue,
  MultiValueRemove,
  Option,
  SingleValue,
} from '#~/components/ui/select/select';
import type {
  iOptionType,
  MultiSelectValueChangeHandler,
  SingleSelectValueChangeHandler,
} from '#~/components/ui/select/types';
import { useNearScrollBottom } from '#~/hooks/browser/use-near-scroll-bottom';
import { cn } from '#~/lib/utils';
import { isOnClient } from '#~/utils/is-on-client';

interface iInfiniteSelectBaseProps<TValue extends string = string, IsMulti extends boolean = false> extends Omit<
  Props<iOptionType<TValue>, IsMulti, GroupBase<iOptionType<TValue>>>,
  'options' | 'isLoading'
> {
  /** Items loaded so far */
  items: iOptionType<TValue>[];
  /** Whether more items are loading */
  isLoadingMore?: boolean;
  /** Whether the initial load is happening */
  isLoading?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Called when more items should be loaded */
  onLoadMore?: () => unknown;
  /** Total count (optional, for display) */
  total?: number;
  /** Whether to use DOM portal target */
  isDOMTarget?: boolean;
}

const OPTION_HEIGHT = 35;
const MAX_VISIBLE_OPTIONS = 6;
const MAX_MENU_HEIGHT = OPTION_HEIGHT * MAX_VISIBLE_OPTIONS;

/**
 * Custom MenuList with infinite scroll support
 */
function InfiniteMenuList({
  children,
  hasMore,
  isLoadingMore,
  onLoadMore,
  ...props
}: MenuListProps<iOptionType> & {
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => unknown;
}) {
  const menuListRef = useRef<HTMLDivElement>(null);

  useNearScrollBottom(menuListRef, onLoadMore, Boolean(hasMore));

  const shouldShowAllLoaded = !hasMore && !isLoadingMore;

  return (
    <div ref={menuListRef} className={cn('max-h-52 overflow-y-auto', props.className)}>
      <components.MenuList {...props}>{children}</components.MenuList>
      {isLoadingMore ? (
        <div className="flex items-center justify-center py-2 text-muted-foreground">
          <LuLoader className="mr-2 size-4 animate-spin" />
          <span className="text-sm">Loading more...</span>
        </div>
      ) : null}
      {shouldShowAllLoaded ? (
        <div className="py-2 text-center text-xs text-muted-foreground">All items loaded</div>
      ) : null}
    </div>
  );
}

const BaseInfiniteSelect = <IsMulti extends boolean = false>(
  props: iInfiniteSelectBaseProps<string, IsMulti> & { isMulti?: IsMulti },
  ref: Ref<SelectInstance<iOptionType, IsMulti, GroupBase<iOptionType>>>,
) => {
  const {
    items,
    isLoading = false,
    isLoadingMore = false,
    hasMore = false,
    onLoadMore,
    styles = DEFAULT_SELECT_STYLES,
    classNames = {},
    components: componentsFromProps = {},
    isDOMTarget = true,
    maxMenuHeight = MAX_MENU_HEIGHT,
    ...rest
  } = props;
  const instanceId = useId();
  const portalContainer = usePortalContainer();

  // Custom MenuList with infinite scroll
  const MenuListWithInfinite = useCallback(
    (menuListProps: MenuListProps<iOptionType>) => (
      <InfiniteMenuList {...menuListProps} hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} />
    ),
    [hasMore, isLoadingMore, onLoadMore],
  );

  return (
    <ClientOnly>
      <SelectComponent<iOptionType, IsMulti, GroupBase<iOptionType>>
        ref={ref}
        instanceId={instanceId}
        unstyled
        filterOption={createFilter({
          matchFrom: 'any',
          stringify: (option) => option.label,
        })}
        menuPortalTarget={isDOMTarget && isOnClient ? (portalContainer ?? document.body) : undefined}
        maxMenuHeight={maxMenuHeight}
        isLoading={isLoading}
        options={items}
        components={{
          DropdownIndicator,
          ClearIndicator,
          MultiValueRemove,
          MultiValue,
          Option,
          SingleValue,
          Menu,
          MenuList: MenuListWithInfinite,
          ...componentsFromProps,
        }}
        styles={styles}
        classNames={merge(DEFAULT_SELECT_CLASSNAMES, classNames)}
        {...rest}
      />
    </ClientOnly>
  );
};

const ForwardedInfiniteSelect = forwardRef(BaseInfiniteSelect);

/** generic view over the shared infinite forwarded select, typed for single selection */
type iForwardedInfiniteSelectSingle = <TValue extends string = string>(
  p: iInfiniteSelectBaseProps<TValue> & {
    ref?: Ref<SelectInstance<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>>;
  },
) => ReactNode;

/** generic view over the shared infinite forwarded select, typed for multi selection */
type iForwardedInfiniteSelectMulti = <TValue extends string = string>(
  p: iInfiniteSelectBaseProps<TValue, true> & {
    isMulti?: true;
    ref?: Ref<SelectInstance<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>>;
  },
) => ReactNode;

const ForwardedInfiniteSelectSingle = ForwardedInfiniteSelect as iForwardedInfiniteSelectSingle;
const ForwardedInfiniteSelectMulti = ForwardedInfiniteSelect as iForwardedInfiniteSelectMulti;

export interface iInfiniteSingleSelectProps<TValue extends string = string> extends Omit<
  iInfiniteSelectBaseProps<TValue>,
  'value' | 'defaultValue' | 'onChange' | 'isMulti'
> {
  value?: TValue | null;
  defaultValue?: TValue | null;
  onValueChange?: SingleSelectValueChangeHandler<TValue>;
  onOptionChange?: Props<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>['onChange'];
}

/**
 * Single select with infinite scroll support.
 * Use this for selects that need to load large datasets.
 *
 * @example
 * ```tsx
 * const { items, hasMore, fetchNextPage, isFetchingNextPage, isPending } = useItemListInfinite();
 *
 * <InfiniteSingleSelect
 *   items={items.map((item) => ({ label: item.name, value: item.id }))}
 *   isLoading={isPending}
 *   isLoadingMore={isFetchingNextPage}
 *   hasMore={hasMore}
 *   onLoadMore={() => fetchNextPage()}
 *   value={selectedId}
 *   onValueChange={setSelectedId}
 *   placeholder="Select an item..."
 * />
 * ```
 */
type iInfiniteSingleSelectComponent = <TValue extends string = string>(
  props: iInfiniteSingleSelectProps<TValue> &
    RefAttributes<SelectInstance<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>>,
) => ReactNode;

function InfiniteSingleSelectRender<TValue extends string = string>(
  { value, defaultValue, onValueChange, onOptionChange, items, ...rest }: iInfiniteSingleSelectProps<TValue>,
  ref: Ref<SelectInstance<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>>,
) {
  const computedValue = useMemo<iOptionType<TValue> | null | undefined>(() => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return items.find((option) => option.value === value) ?? null;
  }, [items, value]);

  const computedDefaultValue = useMemo<iOptionType<TValue> | null | undefined>(() => {
    if (defaultValue === undefined) return undefined;
    if (defaultValue === null) return null;
    return items.find((option) => option.value === defaultValue) ?? null;
  }, [defaultValue, items]);

  return (
    <ForwardedInfiniteSelectSingle<TValue>
      {...rest}
      ref={ref}
      items={items}
      value={computedValue}
      defaultValue={computedDefaultValue}
      onChange={(selected, actionMeta) => {
        onOptionChange?.(selected, actionMeta);
        const normalizedOption = selected ?? null;
        onValueChange?.(normalizedOption?.value ?? null, normalizedOption, actionMeta);
      }}
    />
  );
}

export const InfiniteSingleSelect = forwardRef(InfiniteSingleSelectRender) as iInfiniteSingleSelectComponent;

export interface iInfiniteMultiSelectProps<TValue extends string = string> extends Omit<
  iInfiniteSelectBaseProps<TValue, true>,
  'value' | 'defaultValue' | 'onChange' | 'isMulti'
> {
  value?: TValue[];
  defaultValue?: TValue[];
  onValueChange?: MultiSelectValueChangeHandler<TValue>;
  onOptionChange?: Props<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>['onChange'];
}

/**
 * Multi select with infinite scroll support.
 * Use this for multi-selects that need to load large datasets.
 *
 * @example
 * ```tsx
 * const { items, hasMore, fetchNextPage, isFetchingNextPage, isPending } = useItemListInfinite();
 *
 * <InfiniteMultiSelect
 *   items={items.map((item) => ({ label: item.name, value: item.id }))}
 *   isLoading={isPending}
 *   isLoadingMore={isFetchingNextPage}
 *   hasMore={hasMore}
 *   onLoadMore={() => fetchNextPage()}
 *   value={selectedIds}
 *   onValueChange={setSelectedIds}
 *   placeholder="Select items..."
 * />
 * ```
 */
type iInfiniteMultiSelectComponent = <TValue extends string = string>(
  props: iInfiniteMultiSelectProps<TValue> &
    RefAttributes<SelectInstance<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>>,
) => ReactNode;

function InfiniteMultiSelectRender<TValue extends string = string>(
  {
    value,
    defaultValue,
    onValueChange,
    onOptionChange,
    items,
    closeMenuOnSelect = false,
    ...rest
  }: iInfiniteMultiSelectProps<TValue>,
  ref: Ref<SelectInstance<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>>,
) {
  const computedValue = useMemo<readonly iOptionType<TValue>[] | undefined>(() => {
    if (value === undefined) return undefined;
    if (!value || value.length === 0) return [];
    const lookup = new Set<TValue>(value);
    return items.filter((option) => lookup.has(option.value));
  }, [items, value]);

  const computedDefaultValue = useMemo<readonly iOptionType<TValue>[] | undefined>(() => {
    if (defaultValue === undefined) return undefined;
    if (!defaultValue || defaultValue.length === 0) return [];
    const lookup = new Set<TValue>(defaultValue);
    return items.filter((option) => lookup.has(option.value));
  }, [defaultValue, items]);

  return (
    <ForwardedInfiniteSelectMulti<TValue>
      {...rest}
      ref={ref}
      isMulti
      items={items}
      closeMenuOnSelect={closeMenuOnSelect}
      value={computedValue}
      defaultValue={computedDefaultValue}
      onChange={(selected, actionMeta) => {
        onOptionChange?.(selected, actionMeta);
        const normalizedOptions: iOptionType<TValue>[] = Array.isArray(selected) ? [...selected] : [];
        onValueChange?.(
          normalizedOptions.map((option) => option.value),
          normalizedOptions,
          actionMeta,
        );
      }}
    />
  );
}

export const InfiniteMultiSelect = forwardRef(InfiniteMultiSelectRender) as iInfiniteMultiSelectComponent;
