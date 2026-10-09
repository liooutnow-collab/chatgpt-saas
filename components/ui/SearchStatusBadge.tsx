import { SearchStatus } from "@/lib/providers/types";
import { cn } from "@/lib/utils";

const STYLES: Record<
  SearchStatus,
  { bg: string; text: string; label: string }
> = {
  queued: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    label: "Queued",
  },
  searching: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Searching",
  },
  collecting: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    label: "Collecting",
  },
  checking: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    label: "Checking",
  },
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Cancelled",
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    label: "Failed",
  },
};

export function SearchStatusBadge({ status }: { status: SearchStatus }) {
  const s = STYLES[status] || STYLES.queued;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        s.bg,
        s.text
      )}
    >
      {s.label}
    </span>
  );
}
