import { useEffect, useState } from 'react';

import { IMAGE_LOAD_STATES } from '#~/hooks/browser/use-image-load-state.constants';
import type { ImageLoadState } from '#~/hooks/browser/use-image-load-state.constants';

interface iImageLoadResult {
  imageUrl: string;
  state: ImageLoadState;
}

/** Tracks whether the browser can load an image, so the UI can show a placeholder or a fallback meanwhile. */
export function useImageLoadState(imageUrl: string | null): ImageLoadState {
  const [loadResult, setLoadResult] = useState<iImageLoadResult | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      return undefined;
    }

    let isDisposed = false;
    const image = new window.Image();

    image.decoding = 'async';
    image.onload = () => {
      if (!isDisposed) {
        setLoadResult({ imageUrl, state: IMAGE_LOAD_STATES.READY });
      }
    };
    image.onerror = () => {
      if (!isDisposed) {
        setLoadResult({ imageUrl, state: IMAGE_LOAD_STATES.ERROR });
      }
    };
    image.src = imageUrl;

    return () => {
      isDisposed = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return IMAGE_LOAD_STATES.IDLE;
  }

  return loadResult?.imageUrl === imageUrl ? loadResult.state : IMAGE_LOAD_STATES.LOADING;
}
