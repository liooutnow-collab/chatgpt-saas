"use client";

import { useEffect, useState } from "react";
import type { UsageState } from "@/lib/providers/types";
import { usageManager } from "@/lib/usage/usage-manager";

export function useUsage() {
  const [usage, setUsage] = useState<UsageState>(() => usageManager.get());

  useEffect(() => {
    setUsage(usageManager.get());
    const unsubscribe = usageManager.subscribe(() => {
      setUsage(usageManager.get());
    });
    void usageManager.refresh();
    return unsubscribe;
  }, []);

  return {
    usage,
    remaining: usage.remaining,
    loading: usage.loading,
    error: usage.error,
    refresh: () => usageManager.refresh(),
  };
}
