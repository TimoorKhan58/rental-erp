"use client";

import { useEffect, useState } from "react";
import { debounce } from "@/lib/utils";

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const update = debounce((nextValue: T) => {
      setDebouncedValue(nextValue);
    }, delayMs);

    update(value);
  }, [delayMs, value]);

  return debouncedValue;
}
