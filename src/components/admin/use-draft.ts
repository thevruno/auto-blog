"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDraft<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return { ...defaultValue, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      /* ignore */
    }
    return defaultValue;
  });

  const [restored, setRestored] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(window.localStorage.getItem(key));
    } catch {
      return false;
    }
  });

  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [key, value]);

  const discard = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValue(defaultValue);
    setRestored(false);
  }, [key, defaultValue]);

  return { value, setValue, restored, discard };
}
