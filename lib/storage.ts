'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Local persistence only. Nothing here leaves the device — the account-backed
 * versions of these records live behind authentication once the backend is
 * connected, and this hook is the seam where that swap happens.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
    } catch {
      // A corrupt or unavailable store should never break the page.
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or private-mode failures are non-fatal.
    }
  }, [key, value, hydrated]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setValue(initial);
  }, [key, initial]);

  return { value, setValue, hydrated, clear } as const;
}

export const storageKeys = {
  plan: 'lumanest:plan',
  profile: 'lumanest:home-profile',
  booking: 'lumanest:booking',
  quiz: 'lumanest:cleanmatch',
} as const;
