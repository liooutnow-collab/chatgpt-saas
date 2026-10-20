import { Skeleton } from "@/components/ui/Skeleton";

export function SearchCardSkeleton() {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Loading search">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-6 w-20 rounded-full" /></div>
    <div className="mt-5 space-y-2"><div className="flex justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-2 w-full rounded-full" /><Skeleton className="h-3 w-24" /></div>
    <div className="mt-5 flex gap-2"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-24" /></div>
  </div>;
}
