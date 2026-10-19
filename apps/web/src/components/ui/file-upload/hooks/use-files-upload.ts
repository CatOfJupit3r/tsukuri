import { useCallback } from 'react';
import type { RefObject } from 'react';

import { FILE_UPLOAD_STORE_ACTION_TYPES } from '#~/components/ui/file-upload/file-upload.constants';
import type { iStore } from '#~/components/ui/file-upload/file-upload.store';
import type { iFileUploadCallbackProps } from '#~/components/ui/file-upload/file-upload.types';
import { createProgressReporter } from '#~/components/ui/file-upload/file-upload.utils';
import { useLazyValue } from '#~/hooks/react-utilities/use-lazy-value';
import { getHumanFormErrorMessage } from '#~/utils/forms/form-error';

const FILE_UPLOAD_FAILURE_MESSAGE = 'Upload failed';

interface iUseFilesUploadProps {
  callbacksRef: RefObject<iFileUploadCallbackProps>;
  store: iStore;
}

export function useFilesUpload({ callbacksRef, store }: iUseFilesUploadProps) {
  const onProgress = useLazyValue(() => createProgressReporter(store));

  const onFilesUpload = useCallback(
    async (files: File[]) => {
      try {
        for (const file of files) {
          store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_PROGRESS, file, progress: 0 });
        }

        if (callbacksRef.current.onUpload) {
          await callbacksRef.current.onUpload(files, {
            onProgress,
            onSuccess: (file) => {
              store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_SUCCESS, file });
            },
            onError: (file, error) => {
              store.dispatch({
                type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_ERROR,
                file,
                error: getHumanFormErrorMessage(error, FILE_UPLOAD_FAILURE_MESSAGE),
              });
            },
          });
        } else {
          for (const file of files) {
            store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_SUCCESS, file });
          }
        }
      } catch (error) {
        const errorMessage = getHumanFormErrorMessage(error, FILE_UPLOAD_FAILURE_MESSAGE);
        for (const file of files) {
          store.dispatch({
            type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_ERROR,
            file,
            error: errorMessage,
          });
        }
      }
    },
    [store, callbacksRef, onProgress],
  );

  return onFilesUpload;
}
