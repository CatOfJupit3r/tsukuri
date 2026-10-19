import type { TextDirection } from '@base-ui/react/direction-provider';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';

import { FILE_UPLOAD_ROOT_NAME } from '#~/components/ui/file-upload/file-upload.constants';
import { createSelectedStateCache, readSelectedState } from '#~/components/ui/file-upload/file-upload.store';
import type { iStore, iStoreState } from '#~/components/ui/file-upload/file-upload.store';
import { useLazyValue } from '#~/hooks/react-utilities/use-lazy-value';

export const StoreContext = createContext<iStore | null>(null);

export function useStoreContext(consumerName: string) {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${FILE_UPLOAD_ROOT_NAME}\``);
  }
  return context;
}

export function useStore<T>(selector: (state: iStoreState) => T): T {
  const store = useStoreContext('useStore');
  const selectedStateCache = useLazyValue(() => createSelectedStateCache(store, selector));

  const getSnapshot = useCallback(
    () => readSelectedState(selectedStateCache, store, selector),
    [store, selector, selectedStateCache],
  );

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export interface iFileUploadContextValue {
  inputId: string;
  dropzoneId: string;
  listId: string;
  labelId: string;
  disabled: boolean;
  dir: TextDirection;
  inputRef: RefObject<HTMLInputElement | null>;
  urlCache: WeakMap<File, string>;
}

export const FileUploadContext = createContext<iFileUploadContextValue | null>(null);

export function useFileUploadContext(consumerName: string) {
  const context = useContext(FileUploadContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${FILE_UPLOAD_ROOT_NAME}\``);
  }
  return context;
}
