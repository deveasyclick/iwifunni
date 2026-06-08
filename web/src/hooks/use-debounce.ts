'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `callback` after `delay`ms of inactivity.
 * The delay resets whenever any value in `deps` changes.
 *
 * Usage:
 *   useDebounce(() => search(query), 300, [query]);
 */
export function useDebounce(
  callback: () => void | Promise<void>,
  delay: number,
  deps: unknown[],
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (delay <= 0) {
      void callbackRef.current();
      return;
    }

    const timer = setTimeout(() => {
      void callbackRef.current();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, ...deps]);
}
