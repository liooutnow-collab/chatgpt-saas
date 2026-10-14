"use client";

import { UsageMeter } from "@/components/ui/UsageMeter";
import { storage } from "@/lib/storage/local-storage";
import { useState } from "react";

export default function SettingsPage() {
  const [cleared, setCleared] = useState(false);

  const handleClearAll = () => {
    if (
      confirm(
        "Clear local searches, results, saved leads, and preferences? Your account's server-side weekly usage will not be reset."
      )
    ) {
      storage.clearAll();
      setCleared(true);
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Preferences and data management</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-900">Usage</h2>
        <UsageMeter />
        <p className="text-xs leading-relaxed text-slate-500">
          Your plan allowance is tied to your signed-in account and enforced by the server. Only valid, unique businesses actually returned by a search consume lead units. Clearing browser data does not reset this allowance or change its server-side reset time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-900">Data</h2>
        <p className="text-sm text-slate-500">
          Search history, results, saved leads, formatter choices, and brief preferences remain in this browser&apos;s local storage, partitioned by your signed-in account. They are not synced between browsers. Older unscoped browser data is not imported automatically, to avoid showing one account&apos;s data to another. Refreshing the page preserves account-scoped data; active or queued searches are cancelled and require an explicit retry.
        </p>
        <button
          onClick={handleClearAll}
          className="h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Clear local data
        </button>
        {cleared && <p className="text-sm text-emerald-600">Local data cleared. Reloading…</p>}
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-900">About lead discovery</h2>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-500">
          <li>Searches use the configured server-side lead provider.</li>
          <li>Choose 5, 10, 25, 50, or 100 results for each search.</li>
          <li>Your configured plan allowance resets on a rolling server-side schedule; only actual unique returned businesses count.</li>
          <li>Search history and saved leads are stored in this browser and isolated by signed-in account.</li>
          <li>Email/password authentication and quota enforcement are handled by Supabase.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-900">Contact us</h2>
        <p className="text-sm text-slate-500">
          Questions or feedback? Email us at{" "}
          <a
            href="mailto:contact.lio@protonmail.com?subject=Contact%20from%20L.I.O"
            className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
          >
            contact.lio@protonmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
