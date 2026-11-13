import { useSyncExternalStore } from 'react';

// Shared by the demos: re-renders when the browser goes on or offline.
const subscribe = (cb: () => void) => {
  addEventListener('online', cb);
  addEventListener('offline', cb);
  return () => { removeEventListener('online', cb); removeEventListener('offline', cb); };
};

export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine);
