import { SearchBrief, QualificationStyle } from "@/lib/providers/types";

export type BriefPreferences = Pick<SearchBrief, "goal" | "priorities" | "qualificationStyle" | "additionalInstruction">;

const GENERIC_PRIORITIES = ["Contactability", "Website quality", "Business presence", "Location fit"];

export function getBriefPriorities(businessType: string): string[] {
  const type = businessType.toLowerCase();
  if (/(hotel|accommodation|resort|lodging)/.test(type)) {
    return ["Online booking", "Location fit", "Website quality", "Business presence"];
  }
  if (/(dentist|doctor|clinic|medical|health)/.test(type)) {
    return ["Online booking", "Contactability", "Website quality", "Business presence"];
  }
  if (/(restaurant|cafe|bakery|food|bar)/.test(type)) {
    return ["Menu or booking presence", "Location fit", "Contactability", "Website quality"];
  }
  if (/(real estate|property|agency)/.test(type)) {
    return ["Contactability", "Website quality", "Business presence", "Location fit"];
  }
  return GENERIC_PRIORITIES;
}

export function getBriefGoalPrompt(businessType: string): string {
  const type = businessType.trim();
  return type ? `What is your main goal for these ${type.toLowerCase()} leads?` : "What is your main goal for these leads?";
}

export const BRIEF_GOALS = [
  "Build a focused outreach list",
  "Find businesses with contact details",
  "Identify potential sales opportunities",
  "Explore the local market",
];

export const QUALIFICATION_STYLES: { value: QualificationStyle; label: string; description: string }[] = [
  { value: "broad", label: "Broad", description: "Show more potential matches." },
  { value: "balanced", label: "Balanced", description: "A practical mix of reach and focus." },
  { value: "strict", label: "Strict", description: "Prefer closer matches to your priorities." },
];

export const DEFAULT_BRIEF_PREFERENCES: BriefPreferences = {
  goal: undefined,
  priorities: [],
  qualificationStyle: "balanced",
  additionalInstruction: "",
};

export function summarizeBrief(brief?: SearchBrief): string[] {
  if (!brief) return [];
  return [
    brief.qualificationStyle ? brief.qualificationStyle[0].toUpperCase() + brief.qualificationStyle.slice(1) : "",
    brief.priorities?.join(" · ") || "No priorities selected",
    brief.goal || "No goal specified",
  ].filter(Boolean);
}
