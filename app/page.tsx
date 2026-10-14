import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "L.I.O. — Sales Intelligence and Business Lead Discovery",
  description: "L.I.O. gives agencies and sales teams practical sales intelligence to discover, qualify, and organize businesses worth contacting.",
  alternates: { canonical: "https://outreach-saas-lio-8f66.vercel.app/" },
  openGraph: { type: "website", title: "L.I.O. — Business Lead Discovery for Outreach Teams", description: "Discover and organize qualified business leads by type and location.", url: "https://outreach-saas-lio-8f66.vercel.app/", siteName: "L.I.O.", images: [{ url: "https://outreach-saas-lio-8f66.vercel.app/og-image.svg", width: 1200, height: 630, alt: "L.I.O. business lead discovery" }] },
  twitter: { card: "summary_large_image", title: "L.I.O. — Business Lead Discovery", description: "Find businesses worth contacting by type and location.", images: ["https://outreach-saas-lio-8f66.vercel.app/og-image.svg"] },
};

const structuredData = { "@context": "https://schema.org", "@graph": [
  { "@type": "SoftwareApplication", name: "L.I.O.", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "Business lead discovery software for agencies and outreach teams.", url: "https://outreach-saas-lio-8f66.vercel.app/", offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free plan with weekly lead units" } },
  { "@type": "Organization", name: "L.I.O.", url: "https://outreach-saas-lio-8f66.vercel.app/", email: "contact.lio@protonmail.com", contactPoint: { "@type": "ContactPoint", email: "contact.lio@protonmail.com", contactType: "customer support" }, address: { "@type": "PostalAddress", addressCountry: "BD" } },
] };

const steps = [
  ["01", "Describe your market", "Choose a business type and location, then set the number of results you want to review."],
  ["02", "Review useful prospects", "L.I.O. returns structured business details so you can focus on fit, contactability, and next steps."],
  ["03", "Save and export", "Keep promising leads in your workspace and format results for the workflow your team already uses."],
];

export default function HomePage() {
  return <div className="space-y-16 py-4 sm:py-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="max-w-4xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sales intelligence, organized for action</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">Find businesses worth contacting before your outreach begins.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">L.I.O. is sales intelligence software and a business lead discovery workspace for agencies, freelancers, and sales teams. Search by business type and location, review qualified results, save the leads that matter, and export them for your next campaign.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">Start discovering leads</Link><Link href="/about" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">How L.I.O. works</Link></div></section>
    <section aria-labelledby="workflow-heading" className="grid gap-5 md:grid-cols-3"><h2 id="workflow-heading" className="sr-only">L.I.O. lead discovery workflow</h2>{steps.map(([number, title, text]) => <article key={number} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-slate-400">{number}</p><h3 className="mt-5 text-xl font-medium text-slate-950">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</section>
    <section className="grid gap-8 border-y border-slate-200 py-12 lg:grid-cols-2"><div><h2 className="text-2xl font-semibold text-slate-950">Built for focused prospecting</h2><p className="mt-3 leading-7 text-slate-600">Use L.I.O. when you need a repeatable way to discover local businesses, build a targeted prospect list, or prepare a location-based outreach campaign without losing the search context.</p></div><ul className="space-y-4 text-sm text-slate-700"><li><strong>Server-enforced usage:</strong> valid unique businesses returned by searches count against your plan.</li><li><strong>Account-scoped workspace:</strong> searches, saved leads, and preferences stay separated by signed-in account.</li><li><strong>Free to evaluate:</strong> every account starts with a rolling weekly allowance of lead units.</li></ul></section>
    <section className="rounded-2xl bg-slate-950 p-8 text-white sm:p-10"><h2 className="text-2xl font-semibold">Ready to build a better prospect list?</h2><p className="mt-3 max-w-xl text-slate-300">Create an account to try L.I.O. or read more about the product, privacy, and support.</p><div className="mt-6 flex flex-wrap gap-5 text-sm"><Link className="font-medium underline underline-offset-4" href="/login">Create an account</Link><Link className="text-slate-300 underline underline-offset-4" href="/contact">Contact the team</Link><Link className="text-slate-300 underline underline-offset-4" href="/privacy">Privacy</Link></div></section>
  </div>;
}
