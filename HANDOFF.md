# AdPilot — Project Handoff

> Give this file (or the whole `adpilot` folder containing it) to a new Claude
> session to continue work. It contains everything needed; no prior chat
> context required.

## Who you're working with

Owen (odlowe@gmail.com) — **non-technical founder**, first-time Claude user,
previously burned on a handshake equity deal at beatnews.ai. Communicate in
plain English: no jargon, explain every click when he must do something
(GitHub, Vercel, Supabase are all new to him). He moves fast, asks for big
feature batches, and appreciates honest strategic pushback. Concise replies.

## The product

**AdPilot** (working name — final name undecided, see "Open decisions") is an
AI marketing platform for non-technical small business owners. Core pitch:
"Extreme Simplicity" — three dials (budget $250–5,000/mo, radius 1–50 mi,
duration 1–6 mo or continuous), one plain-English description of the customer,
one Launch button. The "agent" writes ad copy + targeting and (eventually)
runs ads on Google, Meta, and Reddit. Revenue model: 15% management fee on ad
spend. Business status: pre-validation demo; next milestone is showing it to
~20 real business owners.

## Stack & architecture

Next.js 14.2 App Router, TypeScript strict, Tailwind (navy/slate/emerald
theme in `tailwind.config.ts`), lucide-react, @supabase/supabase-js. No other
deps — Stripe/Resend/storage all use raw `fetch`. Design conventions:
rounded-xl/2xl, `shadow-card`/`shadow-lift`, emerald CTAs, navy headers.

```
src/lib/
  types.ts        All shared types (User, Business, Campaign, CampaignPlan…)
  db.ts           Backend switcher: Supabase when SUPABASE_URL +
                  SUPABASE_SERVICE_ROLE_KEY set, else local JSON file store.
                  store-file.ts / store-supabase.ts implement IDENTICAL
                  function signatures — keep them in lockstep.
  ai.ts           MOCK campaign generator (regex vertical/audience detection).
                  Swap generateCampaignPlan() for a real model call; the
                  CampaignPlan return type is the contract.
  metrics.ts      Deterministic fake analytics (seeded by campaign id) —
                  30-day series, CTR/CPC/conversions. Replace with real
                  platform APIs eventually.
  auth.ts         scrypt password hashing + HMAC-signed session cookie
                  ("adpilot_session"). SESSION_SECRET env var.
  email.ts        Resend-ready (RESEND_API_KEY) else console-logs.
  stripe.ts       Checkout via REST (STRIPE_SECRET_KEY) else "not configured".
  storage.ts      Supabase Storage bucket "creatives" else data-URL fallback.
  samples.ts      Every new business is seeded 3 sample campaigns (isSample).
  legal.ts        ToS/privacy copy for /terms and /privacy pages.

src/app/          Landing (page.tsx), signup/login/forgot-password/
                  reset-password, onboarding (2-step wizard), dashboard,
                  terms, privacy, icon.svg, opengraph-image.tsx.
  api/            auth/{signup,login,logout,forgot,reset}, account (PATCH
                  profile/billing/emailPrefs, DELETE account), businesses
                  (+[id] PATCH/DELETE), campaigns (+[id] PATCH: action
                  pause/resume/end OR updates{}), generate, upload,
                  billing/{checkout,webhook}, cron/digests (vercel.json cron).

src/components/
  landing/        Navbar, Hero (video w/ CSS-animation fallback),
                  HeroConfigurator (3 dials; saves draft to localStorage key
                  "adpilot_campaign_draft" — dashboard picks it up post-signup),
                  HeroAnimation (pure CSS keyframes in globals.css),
                  HowItWorks, Pricing (live calc), Footer.
  dashboard/      DashboardShell (tabs: campaigns/analytics/history, business
                  selector + pencil, settings gear), ActiveCampaigns (pause/
                  resume/end/edit, progress bars, creative thumbs),
                  CampaignModal (create: 3 dials + Manual Mode platform-split
                  sliders + site targeting + uploader), EditCampaignModal,
                  BusinessModal (create/edit/delete + AI profile fields),
                  AnalyticsView (all-time + include/exclude picker),
                  AnalyticsPanel (metric cards w/ tooltips), PerformanceChart
                  (hand-rolled SVG), HistoryTable, SettingsModal (account/
                  billing/email digests/appearance + delete account + pw reset),
                  CreativeUploader (drag-drop, live preview, uploads when
                  onUploaded prop given).
```

Dark mode: `.dark` on `<html>` (localStorage "adpilot_theme", pre-paint script
in layout.tsx) — implemented via CSS invert filter in globals.css; images/
videos counter-inverted. Flagged for hand-tuning at brand pass.

Login security: 3 wrong passwords → 10-min lockout (failed_logins/
locked_until on users).

## Deployment (live!)

- **GitHub repo** `adpilot` (Owen's account) → **Vercel** auto-deploys on
  commit. Owen updates by drag-uploading changed files via GitHub web UI —
  he does NOT use git locally. When delivering changes, produce a fresh zip
  of the whole `adpilot` folder and tell him to upload its contents.
- **Supabase**: schema in `supabase/schema.sql` (authoritative, current).
  If tables already exist, give him `ALTER TABLE ... ADD COLUMN IF NOT
  EXISTS` snippets instead of the full schema.
- **Vercel env vars set**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  SESSION_SECRET.
- **Not yet set** (features sleep until then): RESEND_API_KEY (email),
  STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (payments), CRON_SECRET
  (optional), Supabase Storage bucket "creatives" (public) may not be
  created yet.

## What's real vs simulated

Real: accounts, sessions, businesses, campaigns, editing, pause/resume/end,
uploads, settings, dark mode — all persisted in Supabase.
Simulated: campaign copy/targeting (regex mock), ALL analytics numbers
(deterministic fake), platform "In review/Live" statuses. **No actual ads
run and no money moves.** Owen knows this.

## Open decisions & next steps

1. **Name**: undecided. Vetted available (name unclaimed + exact .com free as
   of Jul 2026): Adjoinly, AdClasp, TownHitch, AdBraid, TownFuse, TownMingle,
   TownKnit, TownFlock, TownRally, TownGreet, AdBeckon, AdBellhop, Adcinity,
   AdFella, townhum. Names he liked that were TAKEN: AdValet (.com parked),
   AdAgent, AdRelay, Localink, Campaign Connect, AdEnvoy, Addly.
   Domain check trick: fetch `https://rdap.verisign.com/com/v1/domain/X.com`
   — JSON = taken, empty 404 = available. After he picks: rebrand site + logo.
2. **Real AI**: hook generateCampaignPlan to Claude API (his top-value next
   build). Business profile (description/address) is already fed into the
   generator input.
3. **Validation**: he's been advised to demo to ~20 local business owners
   before building payments/platform APIs ("concierge MVP" path).
4. Later: Stripe activation, Resend activation, real ad platform APIs
   (Google/Meta/Reddit — the months-long moat), email verification,
   error monitoring, lawyer review of legal templates, LLC.

## Working conventions with Owen

- Batch requests arrive as long run-on lists — restate as a task list, build
  all of it, verify statically (imports resolve, "use client" present, the
  two stores' exports identical), then zip: exclude `.data/` and `.DS_Store`.
- npm/registry access may be blocked in the sandbox — `next build` can't be
  run; rely on static checks and careful typing (TS strict). If Vercel build
  fails, he pastes the error and we fix.
- Competitive landscape he knows: AdCritter (~15 ppl, ~$2–5M/yr, closest),
  LocalPilot AI, Addy.co, The Ad Agent; giants: Meta Advantage+, Google PMax,
  Amazon Ads Agent. Positioning: radical simplicity for owners who'll never
  open Ads Manager, cross-platform incl. Reddit, honest 15% fee.
