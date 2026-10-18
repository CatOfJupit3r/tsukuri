import type { ReactNode } from 'react';

import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
} from '#~/components/ui/overlay/responsive-dialog/responsive-alert-dialog';
import type { iResponsiveDialogProps } from '#~/components/ui/overlay/responsive-dialog/responsive-dialog';
import {
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '#~/components/ui/overlay/responsive-dialog/responsive-dialog';

interface iResponsiveConfirmDialogProps extends Pick<iResponsiveDialogProps, 'open' | 'onOpenChange'> {
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  onConfirm: () => unknown;
  isDestructive?: boolean;
  isPending?: boolean;
  children?: ReactNode;
}

export function ResponsiveConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  isDestructive = false,
  isPending = false,
  children,
  ...rootProps
}: iResponsiveConfirmDialogProps) {
  return (
    <ResponsiveAlertDialog {...rootProps}>
      <ResponsiveAlertDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {children}
        <ResponsiveDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>{cancelLabel}</ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            variant={isDestructive ? 'destructive' : 'default'}
          >
            {confirmLabel}
          </ResponsiveAlertDialogAction>
        </ResponsiveDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
