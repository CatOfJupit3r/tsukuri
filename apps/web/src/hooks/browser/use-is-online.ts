import { useSyncExternalStore } from 'react';

function subscribeToNetworkStatus(listener: () => unknown) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

function getIsOnline() {
  return navigator.onLine;
}

function getServerIsOnline() {
  return true;
}

/** Whether the browser reports a network connection. */
export function useIsOnline() {
  return useSyncExternalStore(subscribeToNetworkStatus, getIsOnline, getServerIsOnline);
}
