import { ClientOnly } from '@tanstack/react-router';
import { merge } from 'lodash-es';
import { Children, forwardRef, useId, useMemo } from 'react';
import type { ReactElement, Ref, RefAttributes } from 'react';
import { LuCheck, LuChevronDown, LuX } from 'react-icons/lu';
import SelectComponent, { components, createFilter } from 'react-select';
import type {
  MultiValueProps,
  DropdownIndicatorProps,
  GroupBase,
  MultiValueRemoveProps,
  ClearIndicatorProps,
  OptionProps,
  MenuProps,
  MenuListProps,
  SingleValueProps,
  Props,
  SelectInstance,
} from 'react-select';
import { List } from 'react-window';

import { usePortalContainer } from '#~/components/ui/overlay/portal-container.context';
import { DEFAULT_SELECT_CLASSNAMES, DEFAULT_SELECT_STYLES } from '#~/components/ui/select/constants';
import type {
  iOptionType,
  iSelectOption,
  MultiSelectValueChangeHandler,
  SingleSelectValueChangeHandler,
} from '#~/components/ui/select/types';
import { isOnClient } from '#~/utils/is-on-client';

/**
 * React select custom components
 */
export const DropdownIndicator = (props: DropdownIndicatorProps<iOptionType>) => (
  <components.DropdownIndicator {...props}>
    <LuChevronDown className="size-4 opacity-50" />
  </components.DropdownIndicator>
);

export const ClearIndicator = (props: ClearIndicatorProps<iOptionType>) => (
  <components.ClearIndicator {...props}>
    <LuX className="size-4 opacity-50" />
  </components.ClearIndicator>
);

export const MultiValueRemove = (props: MultiValueRemoveProps<iOptionType>) => (
  <components.MultiValueRemove {...props}>
    <LuX className="size-3.5 opacity-50" />
  </components.MultiValueRemove>
);

export const MultiValue = (props: MultiValueProps<iOptionType, boolean, GroupBase<iOptionType>>) => {
  const { data } = props;
  const { icon } = data;

  return (
    <components.MultiValue {...props}>
      <div className="flex min-w-0 items-center gap-1.5">
        {icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
        ) : null}
        <span className="truncate">{data.label}</span>
      </div>
    </components.MultiValue>
  );
};

export const Option = (props: OptionProps<iOptionType, boolean, GroupBase<iOptionType>>) => {
  const { data, isSelected, label } = props;
  const { icon, description, meta } = data;

  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {icon ? (
            <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{label}</div>
            {description ? <div className="truncate text-xs text-muted-foreground">{description}</div> : null}
          </div>
        </div>
        {meta || isSelected ? (
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            {meta}
            {isSelected ? <LuCheck className="size-4" /> : null}
          </div>
        ) : null}
      </div>
    </components.Option>
  );
};

export const SingleValue = (props: SingleValueProps<iOptionType, boolean, GroupBase<iOptionType>>) => {
  const { data, children } = props;
  const { icon, description, meta } = data;

  return (
    <components.SingleValue {...props}>
      <div className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-medium">{children}</span>
          {description ? <span className="truncate text-xs text-muted-foreground">{description}</span> : null}
        </div>
        {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
      </div>
    </components.SingleValue>
  );
};

// Using Menu and MenuList fixes the scrolling behavior
export const Menu = ({ children, ...props }: MenuProps<iOptionType>) => (
  <components.Menu {...props}>{children}</components.Menu>
);

const isGroupOption = <TValue extends string>(
  option: iSelectOption<TValue>,
): option is GroupBase<iOptionType<TValue>> => Array.isArray((option as GroupBase<iOptionType<TValue>>).options);

const OPTION_HEIGHT = 35;
const MAX_VISIBLE_OPTIONS = 6;
const MAX_MENU_HEIGHT = OPTION_HEIGHT * MAX_VISIBLE_OPTIONS;

export const MenuList = (props: MenuListProps<iOptionType>) => {
  const { children, className, maxHeight, options } = props;

  // Group headings make the rows uneven, so a grouped list scrolls as react-select lays it out.
  if (options.some(isGroupOption)) return <components.MenuList {...props} />;

  const childrenArray = Children.toArray(children);

  if (!childrenArray || childrenArray.length === 0) return <components.MenuList {...props} />;

  // Calculate the appropriate height - use the minimum of total items height or maxHeight
  const totalHeight = childrenArray.length * OPTION_HEIGHT;
  const listHeight = Math.min(totalHeight, typeof maxHeight === 'number' ? maxHeight : MAX_MENU_HEIGHT);

  return (
    <div style={{ height: listHeight, overflow: 'hidden' }}>
      <List
        rowCount={childrenArray.length}
        rowHeight={OPTION_HEIGHT}
        rowProps={{ children: childrenArray }}
        // eslint-disable-next-line react/no-unstable-nested-components
        rowComponent={({ index, style }) => <div style={style}>{childrenArray[index]}</div>}
        className={className}
      />
    </div>
  );
};

const BaseSelect = <IsMulti extends boolean = false>(
  props: Props<iOptionType, IsMulti> & { isMulti?: IsMulti; isDOMTarget?: boolean },
  ref: Ref<SelectInstance<iOptionType, IsMulti, GroupBase<iOptionType>>>,
) => {
  const {
    styles = DEFAULT_SELECT_STYLES,
    classNames = {},
    components: componentsFromProps = {},
    isDOMTarget = true,
    ...rest
  } = props;
  const instanceId = useId();
  const portalContainer = usePortalContainer();

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
        menuPlacement="auto"
        menuShouldScrollIntoView={false}
        components={{
          DropdownIndicator,
          ClearIndicator,
          MultiValueRemove,
          Option,
          SingleValue,
          Menu,
          MenuList,
          MultiValue,
          ...componentsFromProps,
        }}
        styles={styles}
        classNames={merge(DEFAULT_SELECT_CLASSNAMES, classNames)}
        {...rest}
      />
    </ClientOnly>
  );
};

const ForwardedSelect = forwardRef(BaseSelect);

const flattenOptions = <TValue extends string>(options?: readonly iSelectOption<TValue>[]): iOptionType<TValue>[] => {
  if (!options) return [];
  const flattened: iOptionType<TValue>[] = [];

  options.forEach((entry) => {
    if (isGroupOption(entry)) {
      flattened.push(...entry.options);
    } else {
      flattened.push(entry);
    }
  });

  return flattened;
};

type SingleSelectBaseProps<TValue extends string = string> = Props<
  iOptionType<TValue>,
  false,
  GroupBase<iOptionType<TValue>>
>;
type MultiSelectBaseProps<TValue extends string = string> = Props<
  iOptionType<TValue>,
  true,
  GroupBase<iOptionType<TValue>>
>;

/** generic view over the shared forwarded select, typed for single selection */
type iForwardedSelectSingle = <TValue extends string = string>(
  props: SingleSelectBaseProps<TValue> &
    RefAttributes<SelectInstance<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>>,
) => ReactElement;

/** generic view over the shared forwarded select, typed for multi selection */
type iForwardedSelectMulti = <TValue extends string = string>(
  props: MultiSelectBaseProps<TValue> &
    RefAttributes<SelectInstance<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>>,
) => ReactElement;

const ForwardedSelectSingle = ForwardedSelect as iForwardedSelectSingle;
const ForwardedSelectMulti = ForwardedSelect as iForwardedSelectMulti;

export interface iSingleSelectProps<TValue extends string = string> extends Omit<
  SingleSelectBaseProps<TValue>,
  'value' | 'defaultValue' | 'onChange' | 'isMulti'
> {
  value?: TValue | null;
  defaultValue?: TValue | null;
  onValueChange?: SingleSelectValueChangeHandler<TValue>;
  onOptionChange?: NonNullable<SingleSelectBaseProps<TValue>['onChange']>;
}

type iSingleSelectComponent = <TValue extends string = string>(
  props: iSingleSelectProps<TValue> &
    RefAttributes<SelectInstance<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>>,
) => ReactElement;

function SingleSelectRender<TValue extends string = string>(
  {
    value,
    defaultValue,
    onValueChange,
    onOptionChange,
    options,
    maxMenuHeight = MAX_MENU_HEIGHT,
    ...rest
  }: iSingleSelectProps<TValue>,
  ref: Ref<SelectInstance<iOptionType<TValue>, false, GroupBase<iOptionType<TValue>>>>,
) {
  const flatOptions = useMemo(() => flattenOptions(options), [options]);

  const computedValue = useMemo<iOptionType<TValue> | null | undefined>(() => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return flatOptions.find((option) => option.value === value) ?? null;
  }, [flatOptions, value]);

  const computedDefaultValue = useMemo<iOptionType<TValue> | null | undefined>(() => {
    if (defaultValue === undefined) return undefined;
    if (defaultValue === null) return null;
    return flatOptions.find((option) => option.value === defaultValue) ?? null;
  }, [defaultValue, flatOptions]);

  return (
    <ForwardedSelectSingle<TValue>
      {...rest}
      ref={ref}
      options={options}
      value={computedValue}
      maxMenuHeight={maxMenuHeight}
      defaultValue={computedDefaultValue}
      onChange={(selected, actionMeta) => {
        onOptionChange?.(selected, actionMeta);
        const normalizedOption = selected ?? null;
        onValueChange?.(normalizedOption?.value ?? null, normalizedOption, actionMeta);
      }}
    />
  );
}

export const SingleSelect = forwardRef(SingleSelectRender) as iSingleSelectComponent;

export interface iMultiSelectProps<TValue extends string = string> extends Omit<
  MultiSelectBaseProps<TValue>,
  'value' | 'defaultValue' | 'onChange' | 'isMulti'
> {
  value?: TValue[];
  defaultValue?: TValue[];
  onValueChange?: MultiSelectValueChangeHandler<TValue>;
  onOptionChange?: NonNullable<MultiSelectBaseProps<TValue>['onChange']>;
}

type iMultiSelectComponent = <TValue extends string = string>(
  props: iMultiSelectProps<TValue> &
    RefAttributes<SelectInstance<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>>,
) => ReactElement;

function MultiSelectRender<TValue extends string = string>(
  {
    value,
    defaultValue,
    onValueChange,
    onOptionChange,
    options,
    closeMenuOnSelect = false,
    maxMenuHeight = MAX_MENU_HEIGHT,
    ...rest
  }: iMultiSelectProps<TValue>,
  ref: Ref<SelectInstance<iOptionType<TValue>, true, GroupBase<iOptionType<TValue>>>>,
) {
  const flatOptions = useMemo(() => flattenOptions(options), [options]);

  const computedValue = useMemo<readonly iOptionType<TValue>[] | undefined>(() => {
    if (value === undefined) return undefined;
    if (!value || value.length === 0) return [];
    const lookup = new Set<TValue>(value);
    return flatOptions.filter((option) => lookup.has(option.value));
  }, [flatOptions, value]);

  const computedDefaultValue = useMemo<readonly iOptionType<TValue>[] | undefined>(() => {
    if (defaultValue === undefined) return undefined;
    if (!defaultValue || defaultValue.length === 0) return [];
    const lookup = new Set<TValue>(defaultValue);
    return flatOptions.filter((option) => lookup.has(option.value));
  }, [defaultValue, flatOptions]);

  return (
    <ForwardedSelectMulti<TValue>
      {...rest}
      ref={ref}
      isMulti
      closeMenuOnSelect={closeMenuOnSelect}
      options={options}
      maxMenuHeight={maxMenuHeight}
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

export const MultiSelect = forwardRef(MultiSelectRender) as iMultiSelectComponent;
