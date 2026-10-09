import { SavedLead, Lead } from "@/lib/providers/types";
import { storage } from "./local-storage";
import { searchManager } from "@/lib/search/search-manager";

type Listener = () => void;

class SavedLeadsManager {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getAll(): SavedLead[] {
    return storage.getSavedLeads();
  }

  isSaved(leadId: string): boolean {
    return this.getAll().some((s) => s.leadId === leadId);
  }

  save(leadId: string, searchId: string): void {
    const existing = this.getAll();
    if (existing.some((s) => s.leadId === leadId)) return;
    const next = [
      { leadId, savedAt: new Date().toISOString(), searchId },
      ...existing,
    ];
    storage.setSavedLeads(next);
    this.notify();
  }

  unsave(leadId: string): void {
    const next = this.getAll().filter((s) => s.leadId !== leadId);
    storage.setSavedLeads(next);
    this.notify();
  }

  getSavedLeadsWithDetails(): (Lead & { savedAt: string; searchId: string })[] {
    const saved = this.getAll();
    return saved
      .map((s) => {
        const lead = searchManager.getLead(s.leadId);
        if (!lead) return null;
        return { ...lead, savedAt: s.savedAt, searchId: s.searchId };
      })
      .filter(Boolean) as (Lead & { savedAt: string; searchId: string })[];
  }

  count(): number {
    return this.getAll().length;
  }
}

export const savedLeadsManager = new SavedLeadsManager();
