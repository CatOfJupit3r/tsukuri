import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import type { ComponentProps } from 'react';

import { OVERLAY_BACKDROP_CLASS_NAME } from '#~/components/ui/overlay/overlay.constants';
import { cn } from '#~/lib/utils';

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(OVERLAY_BACKDROP_CLASS_NAME, className)}
      {...props}
    />
  );
}

interface iDrawerContentProps
  extends
    Pick<ComponentProps<'div'>, 'className' | 'children' | 'role' | 'aria-label'>,
    Pick<DrawerPrimitive.Popup.Props, 'initialFocus'> {}

function DrawerContent({ className, children, ...props }: iDrawerContentProps) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] transform-[translateY(var(--drawer-swipe-movement-y))] flex-col rounded-t-2xl border-t bg-popover text-sm shadow-lg transition-transform duration-300 ease-out data-ending-style:transform-[translateY(100%)] data-starting-style:transform-[translateY(100%)] data-swiping:duration-0"
          {...props}
        >
          <div className="mx-auto mt-3 mb-1 h-1 w-12 shrink-0 rounded-full bg-muted" />
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className={cn(
              'mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
              className,
            )}
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex flex-col gap-0.5 p-4 text-center md:text-left', className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-base font-medium text-foreground', className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
