import type { UsageState } from "@/lib/providers/types";

type Listener = () => void;

type UsageResponse = {
  used: number;
  reserved: number;
  remaining: number;
  limit: number;
  plan: "free";
};

const INITIAL_USAGE: UsageState = {
  used: 0,
  reserved: 0,
  remaining: 0,
  limit: 100,
  plan: "free",
  loading: true,
};

class UsageManager {
  private listeners: Set<Listener> = new Set();
  private usage: UsageState = { ...INITIAL_USAGE };
  private refreshPromise: Promise<void> | null = null;
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
    this.usage = { ...INITIAL_USAGE };
    this.notify();
  }

  async refresh(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.refreshPromise) return this.refreshPromise;

    const generation = this.generation;
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
            ? "Sign in to view your lifetime allowance and run new searches."
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
          data.limit !== 100
        ) {
          throw new Error("The usage response was invalid.");
        }

        this.usage = {
          used: data.used,
          reserved: data.reserved,
          remaining: data.remaining,
          limit: data.limit,
          plan: "free",
          loading: false,
        };
      } catch {
        if (generation === this.generation) {
          this.usage = {
            ...this.usage,
            loading: false,
            error: controller.signal.aborted
              ? "Checking lifetime usage timed out. Check your connection and retry."
              : "Usage could not be loaded. Please try again.",
          };
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (generation === this.generation) {
          this.notify();
          this.refreshPromise = null;
        }
      }
    })();

    this.refreshPromise = pending;
    return pending;
  }
}

export const usageManager = new UsageManager();
