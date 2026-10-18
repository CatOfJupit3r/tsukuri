import { FILE_UPLOAD_STORE_ACTION_TYPES } from '#~/components/ui/file-upload/file-upload.constants';
import type { iFileState, iStore } from '#~/components/ui/file-upload/file-upload.store';

export function commitFilesToInput(inputElement: HTMLInputElement, files: File[]) {
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }

  inputElement.files = dataTransfer.files;
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
}

export function revokeCachedUrls(fileMap: Map<File, iFileState>, urlCache: WeakMap<File, string>) {
  for (const file of fileMap.keys()) {
    const cachedUrl = urlCache.get(file);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
    }
  }
}

export function createProgressReporter(store: iStore) {
  let frame = 0;

  return (file: File, progress: number) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      store.dispatch({
        type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_PROGRESS,
        file,
        progress: Math.min(Math.max(0, progress), 100),
      });
    });
  };
}

export function collectClipboardFiles(items: DataTransferItemList) {
  const files: File[] = [];
  for (const item of items) {
    const file = item?.kind === 'file' ? item.getAsFile() : null;
    if (file) {
      files.push(file);
    }
  }
  return files;
}
