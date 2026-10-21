import type { UsageState } from "@/lib/providers/types";

type Listener = () => void;

type UsageResponse = {
  used: number;
  reserved: number;
  remaining: number;
  limit: number;
  plan: "free" | "pro" | "internal";
  planName: string;
  periodLabel: string;
  resetAt: string;
};

const INITIAL_USAGE: UsageState = {
  used: 0,
  reserved: 0,
  remaining: 0,
  limit: 15,
  plan: "free",
  planName: "Free Plan",
  periodLabel: "Weekly",
  resetAt: null,
  loading: true,
};

class UsageManager {
  private listeners: Set<Listener> = new Set();
  private usage: UsageState = { ...INITIAL_USAGE };
  private refreshPromise: Promise<void> | null = null;
  private refreshPromiseGeneration: number | null = null;
  private generation = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  get(): UsageState {
    return { ...this.usage };
  }

  remaining(): number {
    return this.usage.remaining;
  }

  resetForAuthChange(): void {
    this.generation += 1;
    this.refreshPromise = null;
    this.refreshPromiseGeneration = null;
    this.usage = { ...INITIAL_USAGE };
    this.notify();
    // The initial request can finish after Supabase emits the auth event. Start
    // a fresh request for the new account rather than leaving the UI in loading.
    if (typeof window !== "undefined") queueMicrotask(() => void this.refresh());
  }

  async refresh(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.refreshPromise) return this.refreshPromise;

    const generation = this.generation;
    this.refreshPromiseGeneration = generation;
    this.usage = { ...this.usage, loading: true, error: undefined };
    this.notify();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12_000);
    const pending = (async () => {
      try {
        const response = await fetch("/api/usage", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (generation !== this.generation) return;
        if (!response.ok) {
          const message = response.status === 401
            ? "Sign in to view your weekly allowance and run new searches."
            : "Usage could not be loaded. Refresh to try again.";
          this.usage = { ...this.usage, loading: false, error: message };
          return;
        }

        const data = (await response.json()) as UsageResponse;
        if (generation !== this.generation) return;
        if (
          !Number.isInteger(data.used) ||
          !Number.isInteger(data.reserved) ||
          !Number.isInteger(data.remaining) ||
          !Number.isInteger(data.limit) || data.limit <= 0 ||
          !["free", "pro", "internal"].includes(data.plan) ||
          typeof data.planName !== "string" ||
          typeof data.periodLabel !== "string" ||
          !data.resetAt || Number.isNaN(Date.parse(data.resetAt))
        ) {
          throw new Error("The usage response was invalid.");
        }

        this.usage = {
          used: data.used,
          reserved: data.reserved,
          remaining: data.remaining,
          limit: data.limit,
          plan: data.plan,
          planName: data.planName,
          periodLabel: data.periodLabel,
          resetAt: data.resetAt,
          loading: false,
        };
      } catch {
        if (generation === this.generation) {
          this.usage = {
            ...this.usage,
            loading: false,
            error: controller.signal.aborted
              ? "Checking weekly usage timed out. Check your connection and retry."
              : "Usage could not be loaded. Please try again.",
          };
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (this.refreshPromiseGeneration === generation) {
          this.refreshPromise = null;
          this.refreshPromiseGeneration = null;
        }
        if (generation === this.generation) {
          this.notify();
        }
      }
    })();

    this.refreshPromise = pending;
    return pending;
  }
}

export const usageManager = new UsageManager();
