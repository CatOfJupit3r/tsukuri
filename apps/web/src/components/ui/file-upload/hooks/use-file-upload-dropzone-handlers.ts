import { useCallback } from 'react';
import type { ClipboardEvent, ComponentProps, DragEvent, KeyboardEvent, MouseEvent, RefObject } from 'react';

import { KEYBOARD_KEYS } from '@startername/common/enums/keyboard-keys.enums';

import { FILE_UPLOAD_STORE_ACTION_TYPES } from '#~/components/ui/file-upload/file-upload.constants';
import type { iStore } from '#~/components/ui/file-upload/file-upload.store';
import { collectClipboardFiles, commitFilesToInput } from '#~/components/ui/file-upload/file-upload.utils';
import { useAsRef } from '#~/hooks/react-utilities/use-as-ref';

export type iFileUploadDropzoneHandlerProps = Pick<
  ComponentProps<'div'>,
  'onClick' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop' | 'onKeyDown' | 'onPaste'
>;

interface iDropzoneHandlersBaseProps {
  inputRef: RefObject<HTMLInputElement | null>;
  propsRef: RefObject<iFileUploadDropzoneHandlerProps>;
}

interface iDropzoneStoreHandlersProps extends iDropzoneHandlersBaseProps {
  store: iStore;
}

function useDropzoneActivationHandlers({ inputRef, propsRef }: iDropzoneHandlersBaseProps) {
  const onClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      propsRef.current.onClick?.(event);

      if (event.defaultPrevented) return;

      const { target } = event;

      const isFromTrigger = target instanceof HTMLElement && target.closest('[data-slot="file-upload-trigger"]');

      if (!isFromTrigger) {
        inputRef.current?.click();
      }
    },
    [inputRef, propsRef],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      propsRef.current.onKeyDown?.(event);

      if (!event.defaultPrevented && (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE)) {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [inputRef, propsRef],
  );

  return { onClick, onKeyDown };
}

function useDropzoneDragHandlers({ inputRef, propsRef, store }: iDropzoneStoreHandlersProps) {
  const onDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDragOver?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_DRAG_OVER, dragOver: true });
    },
    [store, propsRef],
  );

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDragEnter?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_DRAG_OVER, dragOver: true });
    },
    [store, propsRef],
  );

  const onDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDragLeave?.(event);

      if (event.defaultPrevented) return;

      const { relatedTarget } = event;
      if (relatedTarget && relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
        return;
      }

      event.preventDefault();
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_DRAG_OVER, dragOver: false });
    },
    [store, propsRef],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDrop?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_DRAG_OVER, dragOver: false });

      const files = Array.from(event.dataTransfer.files);
      const inputElement = inputRef.current;
      if (!inputElement) return;

      commitFilesToInput(inputElement, files);
    },
    [store, inputRef, propsRef],
  );

  return { onDragEnter, onDragLeave, onDragOver, onDrop };
}

function useDropzonePasteHandler({ inputRef, propsRef, store }: iDropzoneStoreHandlersProps) {
  return useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      propsRef.current.onPaste?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_DRAG_OVER, dragOver: false });

      const items = event.clipboardData?.items;
      if (!items) return;

      const files = collectClipboardFiles(items);
      if (files.length === 0) return;

      const inputElement = inputRef.current;
      if (!inputElement) return;

      commitFilesToInput(inputElement, files);
    },
    [store, inputRef, propsRef],
  );
}

interface iUseFileUploadDropzoneHandlersProps extends Pick<iDropzoneStoreHandlersProps, 'inputRef' | 'store'> {
  handlerProps: iFileUploadDropzoneHandlerProps;
}

export function useFileUploadDropzoneHandlers({ handlerProps, inputRef, store }: iUseFileUploadDropzoneHandlersProps) {
  const propsRef = useAsRef(handlerProps);
  const activationHandlers = useDropzoneActivationHandlers({ inputRef, propsRef });
  const dragHandlers = useDropzoneDragHandlers({ inputRef, propsRef, store });
  const onPaste = useDropzonePasteHandler({ inputRef, propsRef, store });

  return { ...activationHandlers, ...dragHandlers, onPaste };
}
