import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function EmailVerifiedPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:min-h-screen">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Email verified
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">
          Your account is ready
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your email address has been confirmed and your Lead Intelligence account is active. Continue to sign in and start discovering businesses.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Continue to Lead Intelligence
        </Link>
      </section>
    </main>
  );
}
