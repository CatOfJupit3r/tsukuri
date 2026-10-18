import { useRender } from '@base-ui/react/use-render';
import { isValidElement } from 'react';
import type { ReactNode } from 'react';

interface iRenderSlotProps {
  children?: ReactNode;
  [key: string]: unknown;
}

export function RenderSlot({ children, ...props }: iRenderSlotProps) {
  const render = isValidElement(children) ? children : undefined;

  return useRender({
    defaultTagName: 'div',
    render,
    props: render ? props : { ...props, children },
  });
}
