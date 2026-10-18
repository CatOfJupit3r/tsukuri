import { Button as ButtonPrimitive } from '@base-ui/react/button';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '#~/lib/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { buttonVariants } from './constants';

export interface iButtonProps extends ComponentProps<typeof ButtonPrimitive>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  tooltip?: string;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  tooltip,
  children,
  render,
  nativeButton,
  ...props
}: iButtonProps) {
  const button = (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={asChild ? (children as ReactElement) : render}
      nativeButton={nativeButton ?? (asChild || render ? false : undefined)}
      {...props}
    >
      {asChild ? null : children}
    </ButtonPrimitive>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button}>{null}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
