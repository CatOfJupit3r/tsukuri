import {
  FILE_UPLOAD_STATUSES,
  FILE_UPLOAD_STORE_ACTION_TYPE_CASES,
} from '#~/components/ui/file-upload/file-upload.constants';
import type { FileUploadStatus } from '#~/components/ui/file-upload/file-upload.constants';

export interface iFileState {
  file: File;
  progress: number;
  error?: string;
  status: FileUploadStatus;
}

export interface iStoreState {
  files: Map<File, iFileState>;
  dragOver: boolean;
  invalid: boolean;
}

export type StoreAction =
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.ADD_FILES; files: File[] }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_FILES; files: File[] }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_PROGRESS; file: File; progress: number }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_SUCCESS; file: File }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_ERROR; file: File; error: string }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.REMOVE_FILE; file: File }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_DRAG_OVER; dragOver: boolean }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_INVALID; invalid: boolean }
  | { type: typeof FILE_UPLOAD_STORE_ACTION_TYPE_CASES.CLEAR };

export interface iStore {
  getState: () => iStoreState;
  dispatch: (action: StoreAction) => unknown;
  subscribe: (listener: () => unknown) => () => unknown;
  setCallbacks: (callbacks: iFileUploadStoreCallbacks) => unknown;
}

export interface iFileUploadStoreCallbacks {
  onValueChange?: (files: File[]) => unknown;
}

interface iFileUploadStoreOptions {
  fileMap: Map<File, iFileState>;
  listeners: Set<() => unknown>;
  urlCache: WeakMap<File, string>;
  isInvalid: boolean;
}

interface iFileUploadStoreContext extends Pick<iFileUploadStoreOptions, 'fileMap' | 'urlCache'> {
  getCallbacks: () => iFileUploadStoreCallbacks;
}

function createIdleFileState(file: File): iFileState {
  return { file, progress: 0, status: FILE_UPLOAD_STATUSES.IDLE };
}

function notifyValueChange({ fileMap, getCallbacks }: iFileUploadStoreContext) {
  const { onValueChange } = getCallbacks();
  if (!onValueChange) return;

  onValueChange(Array.from(fileMap.values()).map((fileState) => fileState.file));
}

function revokeCachedUrl({ urlCache }: iFileUploadStoreContext, file: File) {
  const cachedUrl = urlCache.get(file);
  if (!cachedUrl) return;

  URL.revokeObjectURL(cachedUrl);
  urlCache.delete(file);
}

function updateFileState({ fileMap }: iFileUploadStoreContext, file: File, changes: Partial<Omit<iFileState, 'file'>>) {
  const fileState = fileMap.get(file);
  if (fileState) {
    fileMap.set(file, { ...fileState, ...changes });
  }
}

function addFiles(context: iFileUploadStoreContext, files: File[]) {
  for (const file of files) {
    context.fileMap.set(file, createIdleFileState(file));
  }

  notifyValueChange(context);
}

function replaceFiles({ fileMap }: iFileUploadStoreContext, files: File[]) {
  const nextFiles = new Set(files);
  for (const existingFile of fileMap.keys()) {
    if (!nextFiles.has(existingFile)) {
      fileMap.delete(existingFile);
    }
  }

  for (const file of files) {
    if (!fileMap.get(file)) {
      fileMap.set(file, createIdleFileState(file));
    }
  }
}

function removeFile(context: iFileUploadStoreContext, file: File) {
  revokeCachedUrl(context, file);
  context.fileMap.delete(file);
  notifyValueChange(context);
}

function clearFiles(context: iFileUploadStoreContext) {
  for (const file of context.fileMap.keys()) {
    revokeCachedUrl(context, file);
  }

  context.fileMap.clear();
  context.getCallbacks().onValueChange?.([]);
}

function reduceFileUploadState(
  context: iFileUploadStoreContext,
  currentState: iStoreState,
  action: StoreAction,
): iStoreState {
  const withFiles = { ...currentState, files: context.fileMap };

  switch (action.type) {
    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.ADD_FILES:
      addFiles(context, action.files);
      return withFiles;

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_FILES:
      replaceFiles(context, action.files);
      return withFiles;

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_PROGRESS:
      updateFileState(context, action.file, { progress: action.progress, status: FILE_UPLOAD_STATUSES.UPLOADING });
      return withFiles;

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_SUCCESS:
      updateFileState(context, action.file, { progress: 100, status: FILE_UPLOAD_STATUSES.SUCCESS });
      return withFiles;

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_ERROR:
      updateFileState(context, action.file, { error: action.error, status: FILE_UPLOAD_STATUSES.ERROR });
      return withFiles;

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.REMOVE_FILE:
      removeFile(context, action.file);
      return withFiles;

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_DRAG_OVER:
      return { ...currentState, dragOver: action.dragOver };

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.SET_INVALID:
      return { ...currentState, invalid: action.invalid };

    case FILE_UPLOAD_STORE_ACTION_TYPE_CASES.CLEAR:
      clearFiles(context);
      return { ...withFiles, invalid: false };

    default:
      return currentState;
  }
}

export function createFileUploadStore({ fileMap, listeners, urlCache, isInvalid }: iFileUploadStoreOptions): iStore {
  let callbacks: iFileUploadStoreCallbacks = {};
  const context = { fileMap, urlCache, getCallbacks: () => callbacks };
  let state: iStoreState = { files: fileMap, dragOver: false, invalid: isInvalid };

  return {
    getState: () => state,
    dispatch: (action) => {
      state = reduceFileUploadState(context, state, action);
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setCallbacks: (nextCallbacks) => {
      callbacks = nextCallbacks;
    },
  };
}

export interface iSelectedStateCache<TValue> {
  value: TValue;
  state: iStoreState;
}

export function createSelectedStateCache<TValue>(
  store: iStore,
  selector: (state: iStoreState) => TValue,
): iSelectedStateCache<TValue> {
  const state = store.getState();

  return { value: selector(state), state };
}

export function readSelectedState<TValue>(
  cache: iSelectedStateCache<TValue>,
  store: iStore,
  selector: (state: iStoreState) => TValue,
) {
  const state = store.getState();

  if (cache.state === state) {
    return cache.value;
  }

  const nextValue = selector(state);
  cache.value = nextValue;
  cache.state = state;

  return nextValue;
}
