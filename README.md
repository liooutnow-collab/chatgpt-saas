# L.I.O — Lead Intelligence

The **Lead Intelligence** SaaS product for discovering and organizing business leads.

This repository validates the core discovery experience:

```
FIND → SEARCH → QUEUE → PROCESS → RESULTS → SAVE
```

---

## Product

Agencies need a reliable way to:

1. **Find** businesses worth contacting
2. **Understand** why they are potential prospects
3. Eventually **contact and follow up** with them

This release focuses exclusively on the **find / search / queue / results / save** loop.
Outreach automation, AI Insights, CRM sync, and billing are intentionally out of scope.

---

## Current Flow

```
User creates a search (business type + location + count)
        ↓
Search job enters the queue
        ↓
Up to 2 jobs process concurrently
        ↓
SearchManager makes one provider request per started search
        ↓
User views results, saves interesting leads
        ↓
Usage is charged only for leads actually discovered
```

Multiple searches can be created without waiting. Extra jobs wait in a queue and automatically start when a slot frees up.

---

## Architecture

### Provider abstraction

```
LeadProvider (interface)
    └── MockLeadProvider   ← implemented now
    └── (future) GooglePlacesProvider
    └── (future) PrivateCoffeeOverpassProvider
    └── (future) PremiumProvider
```

The UI never contains provider-specific logic.

### Search job lifecycle

Client-side `SearchManager` owns the browser lifecycle and local persistence while
the server API owns provider access:

- Statuses: `queued` → `searching` → `collecting` → `checking` → `completed` | `cancelled` | `error`
- Max **2 concurrent** active jobs
- Queue advances automatically when a job finishes or is cancelled
- One `POST /api/leads/search` request per started search
- Active requests use `AbortController` and are aborted on cancellation
- Retry reuses the same attempt ID; settled results are replayed without another provider search or quota charge

### Persistence

Browser-local state lives in `localStorage`, namespaced by the authenticated user ID:

- Searches & status
- Normalized provider leads
- Saved leads
- Formatter and search-brief preferences

Discovery usage is enforced server-side by Supabase, not stored as trusted browser state. Legacy keys from before account partitioning are not imported automatically because they have no account owner metadata.

Refreshing the page restores state. Active and queued jobs are marked **cancelled** on reload and can be retried explicitly (there is no real background worker in the browser).

### Data separation

```
Search  ≠  Lead  ≠  SavedLead  ≠  Usage
```

This separation is intentional so a future Supabase migration stays straightforward.

---

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (icons)
- Next.js server route for provider access

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

The production Vercel project is linked to
[`liooutnow-collab/L.I.O`](https://github.com/liooutnow-collab/L.I.O) on the
`main` branch. Vercel detects the Next.js App Router project automatically.

Set these environment variables in Vercel as appropriate for the deployment:

- `GEOAPIFY_API_KEY` for production lead discovery
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key if required)

Development without `GEOAPIFY_API_KEY` uses the Mock Business Directory
provider; production fails safely instead of silently using mock data.

---

## Current Limitations

| Limitation | Reason |
|---|---|
| Search lifecycle runs in the browser | Provider requests run through the Next.js server route |
| Interrupted jobs become cancelled on refresh | Browser cannot keep background timers |
| Geoapify is the current real provider | Mock provider remains available for development/testing |
| Free plan is currently fixed | No payment provider or billing integration yet |
| Search and saved-lead records are browser-local | Supabase currently enforces authentication and discovery usage, while lead/search persistence remains local |
| AI Insights and Outreach automation are unavailable | These features have not been implemented |

---

## Future Architecture

```
Next.js (App Router)
    +
Supabase (Auth, Postgres, Realtime)
    +
Server-side Lead Providers
    +
Background Workers / Queue (e.g. Inngest, Trigger.dev, or custom)
    +
Email finding, verification, AI qualification
    +
Outreach sequences & reply tracking
    +
Stripe billing
```

The current code is structured so `LocalStorage*` repositories can be replaced with `Supabase*` implementations without rewriting the UI or job orchestration concepts.

---

## Project Structure

```
app/                  # Next.js App Router pages
components/
  dashboard/          # Stats cards
  search/             # Form, cards, progress, cancel dialog
  leads/              # Table, row, card
  layout/             # Sidebar
  ui/                 # Shared UI primitives
lib/
  providers/          # LeadProvider interface + MockLeadProvider
  search/             # SearchManager (queue + one-request lifecycle)
  usage/              # UsageManager
  storage/            # localStorage adapters
  hooks/              # React hooks for state
data/
  mock-leads.ts       # Fictional business dataset
```

---

## License

Private demo — all rights reserved.
