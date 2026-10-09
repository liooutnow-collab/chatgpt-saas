import { SearchJob, Lead, SearchStatus, SearchBrief } from "@/lib/providers/types";
import { storage } from "@/lib/storage/local-storage";
import { usageManager } from "@/lib/usage/usage-manager";

const MAX_CONCURRENT = 2;

function newAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

const ACTIVE_STATUSES: SearchStatus[] = [
  "searching",
  "collecting",
  "checking",
];

const STATUS_MESSAGES: Record<string, string> = {
  queued: "Waiting in queue…",
  searching: "Searching with the lead provider…",
  collecting: "Receiving provider results…",
  checking: "Finalizing results…",
  completed: "Search complete",
  cancelled: "Search cancelled",
  error: "Search failed",
};

type Listener = () => void;
type SearchResponse = {
  provider?: string;
  results?: Lead[];
  error?: { message?: string };
};

/**
 * Client-side search lifecycle manager.
 *
 * Each started job makes exactly one request to the server API. The browser
 * owns only the lifecycle and local persistence; provider work stays server-side.
 * Active requests can be aborted, and queued jobs start only after capacity is
 * released by completion, failure, or cancellation.
 */
class SearchManager {
  private searches: SearchJob[] = [];
  private leads: Record<string, Lead> = {};
  private listeners: Set<Listener> = new Set();
  private controllers: Map<string, AbortController> = new Map();
  private initialized = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    this.searches = storage.getSearches();
    this.leads = storage.getLeads();

    // A browser refresh cannot safely resume an in-flight request.
    let changed = false;
    this.searches = this.searches.map((search) => {
      if (ACTIVE_STATUSES.includes(search.status)) {
        changed = true;
        return {
          ...search,
          status: "cancelled" as SearchStatus,
          completedAt: new Date().toISOString(),
          statusMessage: "Interrupted by page refresh — partial results kept",
        };
      }
      return search;
    });

    if (changed) this.persist();
    this.advanceQueue();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private persist() {
    storage.setSearches(this.searches);
    storage.setLeads(this.leads);
  }

  getSearches(): SearchJob[] {
    return [...this.searches].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getSearch(id: string): SearchJob | undefined {
    return this.searches.find((search) => search.id === id);
  }

  getLeadsForSearch(searchId: string): Lead[] {
    const search = this.getSearch(searchId);
    if (!search) return [];
    return search.leadIds
      .map((leadId) => this.leads[leadId])
      .filter(Boolean) as Lead[];
  }

  getAllLeads(): Lead[] {
    return Object.values(this.leads);
  }

  getLead(id: string): Lead | undefined {
    return this.leads[id];
  }

  createSearch(
    businessType: string,
    location: string,
    requestedLeads: number,
    brief: SearchBrief
  ): SearchJob {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `search_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const job: SearchJob = {
      id,
      attemptId: newAttemptId(),
      businessType,
      location,
      requestedLeads,
      processedLeads: 0,
      status: "queued",
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      leadIds: [],
      progress: 0,
      statusMessage: STATUS_MESSAGES.queued,
      brief,
    };

    this.searches = [job, ...this.searches];
    this.persist();
    this.notify();
    this.advanceQueue();
    return job;
  }

  private getActiveCount(): number {
    return this.searches.filter((search) =>
      ACTIVE_STATUSES.includes(search.status)
    ).length;
  }

  private advanceQueue() {
    while (this.getActiveCount() < MAX_CONCURRENT) {
      const next = this.searches.find((search) => search.status === "queued");
      if (!next) return;
      this.startJob(next.id);
    }
  }

  private startJob(id: string) {
    const job = this.getSearch(id);
    if (!job || job.status !== "queued" || this.controllers.has(id)) return;

    this.updateJob(id, {
      status: "searching",
      startedAt: new Date().toISOString(),
      statusMessage: STATUS_MESSAGES.searching,
      progress: 5,
    });

    const controller = new AbortController();
    this.controllers.set(id, controller);
    void this.runSearch(id, controller);
  }

  private updateJob(id: string, patch: Partial<SearchJob>) {
    this.searches = this.searches.map((search) =>
      search.id === id ? { ...search, ...patch } : search
    );
    this.persist();
    this.notify();
  }

  private async runSearch(id: string, controller: AbortController) {
    const job = this.getSearch(id);
    if (!job) {
      this.controllers.delete(id);
      return;
    }
    const attemptId = job.attemptId || newAttemptId();
    if (job.attemptId !== attemptId) this.updateJob(id, { attemptId });

    try {
      const response = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          requestId: attemptId,
          businessType: job.businessType,
          location: job.location,
          limit: job.requestedLeads,
          offset: 0,
          brief: job.brief,
        }),
      });

      const payload = (await response.json()) as SearchResponse;
      if (!response.ok || !Array.isArray(payload.results)) {
        throw new Error(
          payload.error?.message ||
            "The lead provider could not complete this search."
        );
      }

      const current = this.getSearch(id);
      if (!current || current.status === "cancelled") return;

      const newIds: string[] = [];
      const seenSourceIds = new Set<string>();
      for (const lead of payload.results) {
        if (seenSourceIds.has(lead.sourceId)) continue;
        seenSourceIds.add(lead.sourceId);
        const uniqueId = `${lead.id}_${id.slice(0, 8)}`;
        const stored: Lead = { ...lead, id: uniqueId };
        this.leads[uniqueId] = stored;
        newIds.push(uniqueId);
      }

      this.updateJob(id, {
        provider: payload.provider,
        status: "completed",
        processedLeads: newIds.length,
        leadIds: newIds,
        progress: 100,
        completedAt: new Date().toISOString(),
        statusMessage: STATUS_MESSAGES.completed,
      });
    } catch (error) {
      const current = this.getSearch(id);
      if (!current || current.status === "cancelled") return;
      if (error instanceof DOMException && error.name === "AbortError") return;

      this.updateJob(id, {
        status: "error",
        completedAt: new Date().toISOString(),
        statusMessage: STATUS_MESSAGES.error,
        errorMessage:
          error instanceof Error
            ? error.message
            : "The lead provider could not complete this search.",
      });
    } finally {
      this.controllers.delete(id);
      void usageManager.refresh();
      this.advanceQueue();
    }
  }

  cancelSearch(id: string): void {
    const job = this.getSearch(id);
    if (!job) return;

    if (job.status === "queued") {
      this.updateJob(id, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
        statusMessage: "Cancelled before starting",
        progress: 0,
      });
      this.advanceQueue();
      return;
    }

    if (ACTIVE_STATUSES.includes(job.status)) {
      this.controllers.get(id)?.abort();
      this.controllers.delete(id);
      this.updateJob(id, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
        statusMessage: `Cancelled — ${job.processedLeads} leads found`,
      });
      this.advanceQueue();
    }
  }

  retrySearch(id: string): SearchJob | null {
    const job = this.getSearch(id);
    if (!job || job.status !== "error" || this.controllers.has(id)) return null;

    // Retry the same job so search history does not accumulate duplicate
    // records. The next queue slot starts exactly one new provider request.
    this.updateJob(id, {
      attemptId: newAttemptId(),
      status: "queued",
      completedAt: null,
      progress: job.processedLeads > 0 ? job.progress : 0,
      statusMessage: STATUS_MESSAGES.queued,
      errorMessage: undefined,
    });
    this.advanceQueue();
    return this.getSearch(id) ?? null;
  }

  getStats() {
    const active = this.searches.filter((search) =>
      [...ACTIVE_STATUSES, "queued"].includes(search.status)
    ).length;
    const completed = this.searches.filter(
      (search) => search.status === "completed"
    ).length;
    const leadsFound = this.searches.reduce(
      (sum, search) => sum + search.processedLeads,
      0
    );
    return { active, completed, leadsFound };
  }
}

export const searchManager = new SearchManager();
