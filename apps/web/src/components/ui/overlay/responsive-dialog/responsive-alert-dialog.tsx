import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { Button } from '#~/components/ui/button/button';
import { buttonVariants } from '#~/components/ui/button/constants';
import { Drawer, DrawerContent } from '#~/components/ui/overlay/drawer';
import { OVERLAY_BACKDROP_CLASS_NAME } from '#~/components/ui/overlay/overlay.constants';
import type { iResponsiveDialogProps } from '#~/components/ui/overlay/responsive-dialog/responsive-dialog';
import {
  RESPONSIVE_DIALOG_MOBILE_QUERY,
  RESPONSIVE_DIALOG_POPUP_CLASS_NAME,
} from '#~/components/ui/overlay/responsive-dialog/responsive-dialog.constants';
import {
  ResponsiveDialogModeContext,
  useIsResponsiveDialogDrawer,
} from '#~/components/ui/overlay/responsive-dialog/responsive-dialog.context';
import { useMediaQuery } from '#~/hooks/browser/use-media-query';
import { cn } from '#~/lib/utils';

export function ResponsiveAlertDialog({ children, ...props }: iResponsiveDialogProps) {
  const isDrawer = useMediaQuery(RESPONSIVE_DIALOG_MOBILE_QUERY);

  return (
    <ResponsiveDialogModeContext value={isDrawer}>
      {isDrawer ? (
        <Drawer disablePointerDismissal {...props}>
          {children}
        </Drawer>
      ) : (
        <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props}>
          {children}
        </AlertDialogPrimitive.Root>
      )}
    </ResponsiveDialogModeContext>
  );
}

interface iResponsiveAlertDialogContentProps extends Pick<ComponentProps<'div'>, 'className' | 'children'> {}

export function ResponsiveAlertDialogContent({ className, ...props }: iResponsiveAlertDialogContentProps) {
  const isDrawer = useIsResponsiveDialogDrawer();

  if (isDrawer) {
    return <DrawerContent role="alertdialog" className={className} {...props} />;
  }

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className={OVERLAY_BACKDROP_CLASS_NAME} />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(RESPONSIVE_DIALOG_POPUP_CLASS_NAME, className)}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

interface iResponsiveAlertDialogActionProps
  extends AlertDialogPrimitive.Close.Props, Pick<VariantProps<typeof buttonVariants>, 'variant'> {}

export function ResponsiveAlertDialogAction({ className, variant, ...props }: iResponsiveAlertDialogActionProps) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export function ResponsiveAlertDialogCancel(props: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" render={<Button variant="outline" />} {...props} />
  );
}
