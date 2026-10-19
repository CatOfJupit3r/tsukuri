import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type { ComponentProps, ReactNode } from 'react';
import { LuX } from 'react-icons/lu';

import { Drawer, DrawerContent } from '#~/components/ui/overlay/drawer';
import { OVERLAY_BACKDROP_CLASS_NAME } from '#~/components/ui/overlay/overlay.constants';
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

export interface iResponsiveDialogProps extends Pick<DialogPrimitive.Root.Props, 'open' | 'defaultOpen'> {
  onOpenChange?: (open: boolean) => unknown;
  children: ReactNode;
}

export function ResponsiveDialog({ children, ...props }: iResponsiveDialogProps) {
  const isDrawer = useMediaQuery(RESPONSIVE_DIALOG_MOBILE_QUERY);

  return (
    <ResponsiveDialogModeContext value={isDrawer}>
      {isDrawer ? (
        <Drawer {...props}>{children}</Drawer>
      ) : (
        <DialogPrimitive.Root data-slot="dialog" {...props}>
          {children}
        </DialogPrimitive.Root>
      )}
    </ResponsiveDialogModeContext>
  );
}

interface iResponsiveDialogContentProps
  extends
    Pick<ComponentProps<'div'>, 'className' | 'children' | 'aria-label'>,
    Pick<DialogPrimitive.Popup.Props, 'initialFocus'> {
  showCloseButton?: boolean;
}

export function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: iResponsiveDialogContentProps) {
  const isDrawer = useIsResponsiveDialogDrawer();

  if (isDrawer) {
    return (
      <DrawerContent className={className} {...props}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={OVERLAY_BACKDROP_CLASS_NAME} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-close-button={showCloseButton ? '' : undefined}
        className={cn(RESPONSIVE_DIALOG_POPUP_CLASS_NAME, className)}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-open:bg-accent data-open:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <LuX />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export function ResponsiveDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center md:text-left', className)}
      {...props}
    />
  );
}

export function ResponsiveDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 md:flex-row md:justify-end', className)}
      {...props}
    />
  );
}

export function ResponsiveDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg/tight font-semibold group-data-close-button/responsive-dialog:pr-8', className)}
      {...props}
    />
  );
}

export function ResponsiveDialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function ResponsiveDialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}
