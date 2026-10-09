"use client";

import { useEffect, useState, useCallback } from "react";
import { SearchJob, Lead, SearchBrief } from "@/lib/providers/types";
import { searchManager } from "@/lib/search/search-manager";

export function useSearches() {
  const [searches, setSearches] = useState<SearchJob[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    searchManager.init();
    setSearches(searchManager.getSearches());
    setReady(true);
    return searchManager.subscribe(() => {
      setSearches(searchManager.getSearches());
    });
  }, []);

  const createSearch = useCallback(
    (businessType: string, location: string, requestedLeads: number, brief: SearchBrief) => {
      return searchManager.createSearch(businessType, location, requestedLeads, brief);
    },
    []
  );

  const cancelSearch = useCallback((id: string) => {
    searchManager.cancelSearch(id);
  }, []);

  const retrySearch = useCallback((id: string) => {
    return searchManager.retrySearch(id);
  }, []);

  return {
    searches,
    ready,
    createSearch,
    cancelSearch,
    retrySearch,
    getLeadsForSearch: (id: string) => searchManager.getLeadsForSearch(id),
    getSearch: (id: string) => searchManager.getSearch(id),
    stats: searchManager.getStats(),
  };
}

export function useSearch(id: string) {
  const [search, setSearch] = useState<SearchJob | undefined>();
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    searchManager.init();
    const update = () => {
      setSearch(searchManager.getSearch(id));
      setLeads(searchManager.getLeadsForSearch(id));
    };
    update();
    return searchManager.subscribe(update);
  }, [id]);

  return { search, leads };
}
