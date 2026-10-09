import {
  SearchJob,
  Lead,
  SavedLead,
  SearchBrief,
} from "@/lib/providers/types";

const KEYS = {
  searches: "li_searches",
  leads: "li_leads",
  saved: "li_saved_leads",
  legacyUsage: "li_usage",
  briefPreferences: "li_search_brief_preferences",
  formatterFields: "li_formatter_fields",
} as const;

let activeUserId: string | null = null;
const userChangeListeners = new Set<() => void>();

function scopedKey(key: string): string {
  const owner = activeUserId ? encodeURIComponent(activeUserId) : "anonymous";
  return `li_user:${owner}:${key}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  setUserId(userId: string | null): boolean {
    const nextUserId = userId || null;
    if (activeUserId === nextUserId) return false;
    activeUserId = nextUserId;
    userChangeListeners.forEach((listener) => listener());
    return true;
  },

  subscribeUserIdChange(listener: () => void): () => void {
    userChangeListeners.add(listener);
    return () => userChangeListeners.delete(listener);
  },

  getSearches(): SearchJob[] {
    if (typeof window === "undefined") return [];
    const searches = safeParse<SearchJob[]>(localStorage.getItem(scopedKey(KEYS.searches)), []);
    // Older builds persisted provider failures as `failed`; normalize that
    // legacy value so the current Failed section and Retry action still work.
    return searches.map((search) =>
      (search.status as string) === "failed"
        ? { ...search, status: "error", statusMessage: search.statusMessage || "Search failed" }
        : search
    );
  },

  setSearches(searches: SearchJob[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(scopedKey(KEYS.searches), JSON.stringify(searches));
  },

  getLeads(): Record<string, Lead> {
    if (typeof window === "undefined") return {};
    return safeParse(localStorage.getItem(scopedKey(KEYS.leads)), {});
  },

  setLeads(leads: Record<string, Lead>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(scopedKey(KEYS.leads), JSON.stringify(leads));
  },

  getSavedLeads(): SavedLead[] {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(scopedKey(KEYS.saved)), []);
  },

  setSavedLeads(saved: SavedLead[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(scopedKey(KEYS.saved), JSON.stringify(saved));
  },

  getBriefPreferences(): Pick<SearchBrief, "goal" | "priorities" | "qualificationStyle" | "additionalInstruction"> {
    if (typeof window === "undefined") return {};
    return safeParse(localStorage.getItem(scopedKey(KEYS.briefPreferences)), {});
  },

  setBriefPreferences(
    preferences: Pick<SearchBrief, "goal" | "priorities" | "qualificationStyle" | "additionalInstruction">
  ): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(scopedKey(KEYS.briefPreferences), JSON.stringify(preferences));
  },

  getFormatterFields(searchId: string): string[] {
    if (typeof window === "undefined") return [];
    const saved = safeParse<Record<string, string[]>>(
      localStorage.getItem(scopedKey(KEYS.formatterFields)),
      {}
    );
    return Array.isArray(saved[searchId]) ? saved[searchId] : [];
  },

  setFormatterFields(searchId: string, fields: string[]): void {
    if (typeof window === "undefined") return;
    const key = scopedKey(KEYS.formatterFields);
    const saved = safeParse<Record<string, string[]>>(localStorage.getItem(key), {});
    saved[searchId] = fields;
    localStorage.setItem(key, JSON.stringify(saved));
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((key) => localStorage.removeItem(scopedKey(key)));
  },
};
