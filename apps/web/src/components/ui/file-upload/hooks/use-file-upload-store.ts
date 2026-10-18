import { useEffect, useMemo } from 'react';

import { FILE_UPLOAD_STORE_ACTION_TYPES } from '#~/components/ui/file-upload/file-upload.constants';
import { createFileUploadStore } from '#~/components/ui/file-upload/file-upload.store';
import type { iFileState } from '#~/components/ui/file-upload/file-upload.store';
import type { iFileUploadProps } from '#~/components/ui/file-upload/file-upload.types';
import { revokeCachedUrls } from '#~/components/ui/file-upload/file-upload.utils';
import { useIsomorphicLayoutEffect } from '#~/hooks/react-utilities/use-isomorphic-layout-effect';
import { useLazyValue } from '#~/hooks/react-utilities/use-lazy-value';

type iUseFileUploadStoreProps = Pick<iFileUploadProps, 'defaultValue' | 'isInvalid' | 'onValueChange' | 'value'>;

export function useFileUploadStore({
  defaultValue,
  isInvalid = false,
  onValueChange,
  value,
}: iUseFileUploadStoreProps) {
  const listeners = useLazyValue<Set<() => unknown>>(() => new Set());
  const fileMap = useLazyValue<Map<File, iFileState>>(() => new Map());
  const urlCache = useLazyValue(() => new WeakMap<File, string>());
  const isControlled = value !== undefined;

  const store = useMemo(
    () => createFileUploadStore({ fileMap, listeners, urlCache, isInvalid }),
    [listeners, fileMap, isInvalid, urlCache],
  );

  useIsomorphicLayoutEffect(() => {
    store.setCallbacks({ onValueChange });
  }, [store, onValueChange]);

  useEffect(() => {
    if (isControlled) {
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_FILES, files: value });
    } else if (defaultValue && defaultValue.length > 0 && !store.getState().files.size) {
      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_FILES, files: defaultValue });
    }
  }, [value, defaultValue, isControlled, store]);

  useEffect(
    () => () => {
      revokeCachedUrls(fileMap, urlCache);
    },
    [fileMap, urlCache],
  );

  return { isControlled, store, urlCache };
}
