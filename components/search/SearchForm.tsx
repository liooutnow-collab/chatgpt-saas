"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BusinessType, SearchBrief, QualificationStyle } from "@/lib/providers/types";
import { useSearches } from "@/lib/hooks/use-search";
import { useUsage } from "@/lib/hooks/use-usage";
import { storage } from "@/lib/storage/local-storage";
import {
  BRIEF_GOALS,
  BriefPreferences,
  DEFAULT_BRIEF_PREFERENCES,
  getBriefGoalPrompt,
  getBriefPriorities,
  QUALIFICATION_STYLES,
} from "@/lib/search-brief";
import { Search, AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  DEFAULT_RESULT_COUNT,
  isAllowedResultCount,
  MIN_LEAD_COUNT,
  RESULT_COUNT_OPTIONS,
} from "@/lib/search/limits";

const BUSINESS_TYPES: BusinessType[] = [
  "Dentist",
  "Restaurant",
  "Gym",
  "Cafe",
  "Hotel",
  "Real Estate Agency",
  "Custom",
];

export function SearchForm() {
  const router = useRouter();
  const { createSearch } = useSearches();
  const {
    remaining,
    loading: usageLoading,
    error: usageError,
    refresh: refreshUsage,
  } = useUsage();
  const submitLock = useRef(false);

  const [businessType, setBusinessType] = useState("");
  const [customType, setCustomType] = useState("");
  const [location, setLocation] = useState("");
  const [requestedLeads, setRequestedLeads] = useState<number>(DEFAULT_RESULT_COUNT);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [briefStep, setBriefStep] = useState(false);
  const [preferences, setPreferences] = useState<BriefPreferences>(DEFAULT_BRIEF_PREFERENCES);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    setPreferences({ ...DEFAULT_BRIEF_PREFERENCES, ...storage.getBriefPreferences() });
    setPreferencesLoaded(true);
  }, []);

  const effectiveType = businessType === "Custom" ? customType.trim() : businessType;
  const priorities = useMemo(() => getBriefPriorities(effectiveType), [effectiveType]);
  const currentPriorities = useMemo(
    () => (preferences.priorities || []).filter((priority) => priorities.includes(priority)),
    [preferences.priorities, priorities]
  );
  const hasSavedPreferences = preferencesLoaded && Boolean(
    preferences.goal || preferences.additionalInstruction || currentPriorities.length
  );

  const validateSearchInput = () => {
    if (!businessType) return "Please choose a business type.";
    if (!location.trim()) return "Please enter a location.";
    if (businessType === "Custom" && !customType.trim()) return "Please enter a custom business type.";
    if (!isAllowedResultCount(requestedLeads)) return `Choose one of these result counts: ${RESULT_COUNT_OPTIONS.join(", ")}.`;
    if (usageLoading) return "Checking your lifetime discovery allowance. Please wait.";
    if (usageError) return usageError;
    if (remaining < MIN_LEAD_COUNT) return `You need at least ${MIN_LEAD_COUNT} lead discoveries to search, but you have ${remaining} remaining.`;
    if (remaining < requestedLeads) return `This search requests ${requestedLeads} discoveries, but you have ${remaining} remaining. Choose a smaller result count.`;
    return null;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSearchInput();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setBriefStep(true);
  };

  const handleFindLeads = () => {
    if (submitLock.current) return;
    const validationError = validateSearchInput();
    if (validationError) {
      setError(validationError);
      setBriefStep(false);
      return;
    }

    const leadCount = requestedLeads as number;

    const brief: SearchBrief = {
      businessType: effectiveType,
      location: location.trim(),
      resultCount: leadCount,
      goal: preferences.goal || undefined,
      priorities: currentPriorities,
      qualificationStyle: preferences.qualificationStyle || "balanced",
      additionalInstruction: preferences.additionalInstruction?.trim() || undefined,
    };

    submitLock.current = true;
    setSubmitting(true);
    try {
      storage.setBriefPreferences({
        goal: brief.goal,
        priorities: brief.priorities,
        qualificationStyle: brief.qualificationStyle,
        additionalInstruction: brief.additionalInstruction,
      });
      const job = createSearch(effectiveType, location.trim(), leadCount, brief);
      router.push(`/searches/${job.id}`);
    } catch {
      submitLock.current = false;
      setSubmitting(false);
      setError("The search could not be started. Please try again.");
    }
  };

  const togglePriority = (priority: string) => {
    setPreferences((current) => ({
      ...current,
      priorities: current.priorities?.includes(priority)
        ? current.priorities.filter((item) => item !== priority)
        : [...(current.priorities || []), priority],
    }));
  };

  if (briefStep) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <button type="button" onClick={() => setBriefStep(false)} className="mb-5 inline-flex min-h-10 items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Edit search inputs
          </button>
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Search Brief</p>
            <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">Help focus this search</h2>
            <p className="mt-1 text-sm text-slate-500">A few optional preferences are saved for future searches. They do not trigger another API request or consume credits.</p>
          </div>

          {hasSavedPreferences && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Using your previous preferences</p>
                <p className="text-xs text-slate-500">You can edit them below for this search.</p>
              </div>
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{getBriefGoalPrompt(effectiveType)}</label>
              <select value={preferences.goal || ""} onChange={(e) => setPreferences((current) => ({ ...current, goal: e.target.value || undefined }))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">Skip for now</option>
                {BRIEF_GOALS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
              </select>
            </div>

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-700">What should we prioritize?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {priorities.map((priority) => (
                  <label key={priority} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <input type="checkbox" checked={currentPriorities.includes(priority)} onChange={() => togglePriority(priority)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                    {priority}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">How selective should the results be?</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {QUALIFICATION_STYLES.map((style) => (
                  <button key={style.value} type="button" onClick={() => setPreferences((current) => ({ ...current, qualificationStyle: style.value as QualificationStyle }))} className={`min-h-16 rounded-lg border px-3 py-2 text-left transition-colors ${preferences.qualificationStyle === style.value ? "border-slate-300 bg-slate-50 text-slate-800 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    <span className="block text-sm font-medium">{style.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{style.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="additional-instruction" className="mb-1.5 block text-sm font-medium text-slate-700">Anything specific you&apos;re looking for? <span className="font-normal text-slate-400">Optional</span></label>
              <textarea id="additional-instruction" value={preferences.additionalInstruction || ""} onChange={(e) => setPreferences((current) => ({ ...current, additionalInstruction: e.target.value }))} maxLength={1000} rows={3} placeholder="For example: prioritize established businesses with clear contact details." className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Review Brief</p>
              <p className="mt-1 text-sm text-slate-700"><span className="font-medium text-slate-800">{effectiveType}</span> in <span className="font-medium text-slate-800">{location.trim()}</span> · {requestedLeads} results requested</p>
              <p className="mt-1 text-xs text-slate-500">{preferences.qualificationStyle || "Balanced"} · {currentPriorities.length ? currentPriorities.join(" · ") : "No priorities selected"}</p>
            </div>
            <button type="button" onClick={handleFindLeads} disabled={submitting} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
              <Search className="h-4 w-4" /> {submitting ? "Creating…" : "Find Leads"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleContinue} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Business Type</label>
          <select required value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
            <option value="">Choose a business type</option>
            {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {businessType === "Custom" && <input required type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Enter a custom business type" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
          <input required type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, country or region" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        </div>

        <div>
          <label htmlFor="result-count" className="mb-1.5 block text-sm font-medium text-slate-700">Results per search</label>
          <select id="result-count" required value={requestedLeads} onChange={(e) => { setRequestedLeads(Number(e.target.value)); setError(null); }} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
            {RESULT_COUNT_OPTIONS.map((count) => <option key={count} value={count}>{count} results</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">One search requests this many businesses; the provider may return fewer if fewer matches are available. {usageLoading ? "Checking your lifetime allowance…" : usageError ? usageError : `You have ${remaining} of 100 lifetime discoveries remaining. Choose a count no greater than your remaining allowance; otherwise no provider request will be made.`}</p>
          {usageError && (
            <button
              type="button"
              onClick={() => void refreshUsage()}
              disabled={usageLoading}
              className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry allowance check
            </button>
          )}
        </div>

        {error && <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 p-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p className="text-sm text-amber-800">{error}</p></div>}

        <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-medium text-white transition-colors hover:bg-slate-800"><ArrowRight className="h-4 w-4" /> Continue</button>
      </div>
    </form>
  );
}
