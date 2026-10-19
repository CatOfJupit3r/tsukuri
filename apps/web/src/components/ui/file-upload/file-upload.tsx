import { useDirection } from '@base-ui/react/direction-provider';
import { useCallback, useMemo, useRef } from 'react';
import type { ComponentProps, MouseEvent } from 'react';

import { RenderSlot } from '#~/components/ui/display/render-slot';
import {
  FileUploadContext,
  StoreContext,
  useFileUploadContext,
  useStore,
  useStoreContext,
} from '#~/components/ui/file-upload/file-upload-context';
import { FileUploadHiddenInput } from '#~/components/ui/file-upload/file-upload-hidden-input';
import {
  FILE_UPLOAD_DROPZONE_NAME,
  FILE_UPLOAD_TRIGGER_NAME,
} from '#~/components/ui/file-upload/file-upload.constants';
import type { iFileUploadProps } from '#~/components/ui/file-upload/file-upload.types';
import { useFileUploadContextValue } from '#~/components/ui/file-upload/hooks/use-file-upload-context-value';
import { useFileUploadDropzoneHandlers } from '#~/components/ui/file-upload/hooks/use-file-upload-dropzone-handlers';
import { useFileUploadHandlers } from '#~/components/ui/file-upload/hooks/use-file-upload-handlers';
import { useFileUploadStore } from '#~/components/ui/file-upload/hooks/use-file-upload-store';
import { useAsRef } from '#~/hooks/react-utilities/use-as-ref';
import { cn } from '#~/lib/utils';

export function FileUpload(props: iFileUploadProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    onAccept,
    onFileAccept,
    onFileReject,
    onFileValidate,
    onUpload,
    accept,
    maxFiles,
    maxSize,
    dir: dirProp,
    label,
    name,
    asChild: shouldRenderAsChild,
    isDisabled = false,
    isInvalid = false,
    isMultiple = false,
    isRequired = false,
    children,
    className,
    ...rootProps
  } = props;

  const inheritedDir = useDirection();
  const dir = dirProp ?? inheritedDir;
  const inputRef = useRef<HTMLInputElement>(null);
  const callbacksRef = useAsRef({ onValueChange, onAccept, onFileAccept, onFileReject, onFileValidate, onUpload });
  const { isControlled, store, urlCache } = useFileUploadStore({ defaultValue, isInvalid, onValueChange, value });
  const acceptTypes = useMemo(() => accept?.split(',').map((t) => t.trim()) ?? null, [accept]);
  const { onInputChange } = useFileUploadHandlers({
    acceptTypes,
    callbacksRef,
    isControlled,
    isDisabled,
    maxFiles,
    maxSize,
    store,
  });
  const contextValue = useFileUploadContextValue({ dir, inputRef, isDisabled, urlCache });

  const RootPrimitive = shouldRenderAsChild ? RenderSlot : 'div';

  return (
    <StoreContext.Provider value={store}>
      <FileUploadContext.Provider value={contextValue}>
        <RootPrimitive
          data-disabled={isDisabled ? '' : undefined}
          data-slot="file-upload"
          dir={dir}
          {...rootProps}
          className={cn('relative flex flex-col gap-2', className)}
        >
          {children}
          <FileUploadHiddenInput
            accept={accept}
            dropzoneId={contextValue.dropzoneId}
            inputId={contextValue.inputId}
            inputRef={inputRef}
            isDisabled={isDisabled}
            isMultiple={isMultiple}
            isRequired={isRequired}
            label={label}
            labelId={contextValue.labelId}
            name={name}
            onInputChange={onInputChange}
          />
        </RootPrimitive>
      </FileUploadContext.Provider>
    </StoreContext.Provider>
  );
}

interface iFileUploadDropzoneProps extends ComponentProps<'div'> {
  asChild?: boolean;
}

function FileUploadDropzone(props: iFileUploadDropzoneProps) {
  const {
    asChild: shouldRenderAsChild,
    className,
    onClick,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onPaste,
    onKeyDown,
    ...dropzoneProps
  } = props;

  const context = useFileUploadContext(FILE_UPLOAD_DROPZONE_NAME);
  const store = useStoreContext(FILE_UPLOAD_DROPZONE_NAME);
  const isInvalid = useStore((state) => state.invalid);
  const isDragging = useStore((state) => state.dragOver);
  const handlers = useFileUploadDropzoneHandlers({
    handlerProps: { onClick, onDragEnter, onDragLeave, onDragOver, onDrop, onKeyDown, onPaste },
    inputRef: context.inputRef,
    store,
  });

  const DropzonePrimitive = shouldRenderAsChild ? RenderSlot : 'div';

  return (
    <DropzonePrimitive
      role="button"
      id={context.dropzoneId}
      aria-controls={`${context.inputId} ${context.listId}`}
      aria-disabled={context.disabled}
      data-disabled={context.disabled ? '' : undefined}
      data-dragging={isDragging ? '' : undefined}
      data-invalid={isInvalid ? '' : undefined}
      data-slot="file-upload-dropzone"
      dir={context.dir}
      tabIndex={context.disabled ? undefined : 0}
      {...dropzoneProps}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors outline-none select-none hover:bg-accent/30 focus-visible:border-ring/50 data-disabled:pointer-events-none data-dragging:border-primary/30 data-dragging:bg-accent/30 data-invalid:border-destructive data-invalid:ring-destructive/20',
        className,
      )}
      {...handlers}
    />
  );
}

interface iFileUploadTriggerProps extends ComponentProps<'button'> {
  asChild?: boolean;
}

function FileUploadTrigger(props: iFileUploadTriggerProps) {
  const { asChild: shouldRenderAsChild, onClick: onClickProp, ...triggerProps } = props;

  const context = useFileUploadContext(FILE_UPLOAD_TRIGGER_NAME);

  const propsRef = useAsRef({
    onClick: onClickProp,
  });

  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      propsRef.current.onClick?.(event);

      if (event.defaultPrevented) return;

      context.inputRef.current?.click();
    },
    [context.inputRef, propsRef],
  );

  const TriggerPrimitive = shouldRenderAsChild ? RenderSlot : 'button';

  return (
    <TriggerPrimitive
      type="button"
      aria-controls={context.inputId}
      data-disabled={context.disabled ? '' : undefined}
      data-slot="file-upload-trigger"
      {...triggerProps}
      disabled={context.disabled}
      onClick={onClick}
    />
  );
}

export { FileUploadDropzone, FileUploadTrigger };
