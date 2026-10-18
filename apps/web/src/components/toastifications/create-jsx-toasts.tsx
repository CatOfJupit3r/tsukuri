import { toast } from 'react-toastify';

import type { iInfoToastData } from './custom-jsx-toasts';
import { ErrorToast, InfoToast } from './custom-jsx-toasts';
import type { CustomToastOptions } from './types';

export const toastError = (title: string, message?: string, options?: CustomToastOptions<iInfoToastData>) => {
  toast(<ErrorToast />, {
    data: {
      title,
      message,
    },
    position: 'top-center',
    closeOnClick: true,
    pauseOnHover: false,
    ...options,
  });
};
export const toastInfo = (title: string, message?: string, options?: CustomToastOptions<iInfoToastData>) => {
  toast(<InfoToast />, {
    data: {
      title,
      message,
    },
    position: 'top-center',
    closeOnClick: true,
    ...options,
  });
};

export const dismissToastById = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};

export const toastSuccess = (title: string, message?: string, options?: CustomToastOptions<iInfoToastData>) => {
  toast(<InfoToast />, {
    data: {
      title,
      message,
    },
    position: 'top-center',
    closeOnClick: true,
    ...options,
  });
};
