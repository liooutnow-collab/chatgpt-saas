"use client";

import { useEffect, useState, useCallback } from "react";
import { Lead } from "@/lib/providers/types";
import { savedLeadsManager } from "@/lib/storage/saved-leads";
import { searchManager } from "@/lib/search/search-manager";

export function useSavedLeads() {
  const [saved, setSaved] = useState<(Lead & { savedAt: string; searchId: string })[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    searchManager.init();
    const update = () => {
      setSaved(savedLeadsManager.getSavedLeadsWithDetails());
      setSavedIds(new Set(savedLeadsManager.getAll().map((s) => s.leadId)));
    };
    update();
    const u1 = savedLeadsManager.subscribe(update);
    const u2 = searchManager.subscribe(update);
    return () => {
      u1();
      u2();
    };
  }, []);

  const save = useCallback((leadId: string, searchId: string) => {
    savedLeadsManager.save(leadId, searchId);
  }, []);

  const unsave = useCallback((leadId: string) => {
    savedLeadsManager.unsave(leadId);
  }, []);

  const isSaved = useCallback(
    (leadId: string) => savedIds.has(leadId),
    [savedIds]
  );

  return {
    saved,
    count: saved.length,
    save,
    unsave,
    isSaved,
  };
}
