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
  ai.ts           REAL Claude campaign generator (raw fetch, no SDK) when
                  ANTHROPIC_API_KEY is set (model via ANTHROPIC_MODEL, default
                  claude-sonnet-5); falls back to the regex mock with no key
                  OR on any API failure, so generation can never break.
                  Also generateAdTagline() for /api/creative visuals.
  brand.ts        Single source of app identity: name (NEXT_PUBLIC_APP_NAME),
                  support email, session cookie name. Rename the app via env
                  vars — no other file hardcodes "AdPilot" anymore (except
                  internal localStorage keys, deliberately kept).
  metrics.ts      Deterministic fake analytics — window-aware (Jul 10):
                  metricsForCampaign(c, windowDays) + windowDaysFor(cs, tf)
                  with Timeframe week/month/year/all; per-DATE seeding
                  (id+date) so numbers are stable across timeframes; spend =
                  budget/30 per active day within window. TimeframePicker
                  pills on AnalyticsView + per-campaign modal. Replace with
                  real platform APIs eventually.
  auth.ts         scrypt password hashing + HMAC-signed session cookie
                  ("adpilot_session"). SESSION_SECRET env var.
  email.ts        Resend-ready (RESEND_API_KEY) else console-logs.
  stripe.ts       Checkout via REST (STRIPE_SECRET_KEY) else "not configured".
                  Sessions carry client_reference_id=userId. Webhook signature
                  verification (verifyStripeSignature) implemented; webhook
                  route handles checkout.session.completed → users.billing_active
                  true + stripe_customer_id, invoice.payment_failed → false.
  storage.ts      Supabase Storage bucket "creatives" else data-URL fallback.
  samples.ts      Every new business is seeded 3 sample campaigns (isSample).
  legal.ts        ToS/privacy copy for /terms and /privacy pages.

src/app/          Landing (page.tsx), signup/login/forgot-password/
                  reset-password, onboarding (3-step wizard: name → category
                  → AI profile [description/address/phone/website], step 3
                  skippable), dashboard, terms, privacy, icon.svg,
                  opengraph-image.tsx.
  api/            auth/{signup,login,logout,forgot,reset}, account (PATCH
                  profile/billing/emailPrefs, DELETE account), businesses
                  (+[id] PATCH/DELETE), campaigns (+[id] PATCH: action
                  pause/resume/end OR updates{} — changing industryText or
                  radius RE-RUNS the AI planner and rewrites adCopyJson +
                  targetingJson, owner-edited keywords win; maxDuration 30),
                  generate (real AI, maxDuration 30), creative (AI visual: Claude tagline + branded SVG card →
                  stored like an upload; swap buildAdSvg for a real image API
                  later), upload, billing/{checkout,webhook — signature-verified},
                  cron/digests (STRICT: 401 unless Bearer CRON_SECRET, so
                  digests are DEAD until CRON_SECRET is set in Vercel).

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
                  businesses [list + completeness hint + edit via BusinessModal]/
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
- **Vercel env vars set**: RESEND_API_KEY (welcome + reset emails live
  as of Jul 9).
- **Set Jul 10**: ANTHROPIC_API_KEY (real AI copy/targeting is LIVE;
  optional ANTHROPIC_MODEL override, default claude-sonnet-5).
- **Not yet set** (features sleep until then): GEMINI_API_KEY (real AI ad
  PHOTOS via Google aistudio.google.com/apikey — src/lib/imagegen.ts, model
  gemini-3.1-flash-image, override with GEMINI_IMAGE_MODEL; without it the
  visual generator makes SVG concept cards), CRON_SECRET
  CRON_SECRET (NOW REQUIRED for digest emails — endpoint 401s without it),
  STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (payments; webhook endpoint is
  /api/billing/webhook), NEXT_PUBLIC_APP_NAME + NEXT_PUBLIC_SUPPORT_EMAIL +
  EMAIL_FROM + SESSION_COOKIE_NAME (rebrand tokens — defaults keep "AdPilot"),
  Supabase Storage bucket "creatives" (public) may not be created yet.
- **Schema migration needed** (Jul 10): users gained stripe_customer_id +
  billing_active, AND Owen's live campaigns table had a stale
  campaigns_status_check constraint (pre-'paused' era) that 500'd every
  pause — full upgrade snippet at the bottom of supabase/schema.sql.
  LESSON: his DB predates parts of schema.sql; when adding constraints or
  columns, always ship ALTER statements, never trust "if not exists" alone.

## What's real vs simulated

Real: accounts, sessions, businesses, campaigns, editing, pause/resume/end
(now optimistic — flips instantly, rolls back on failure), uploads, settings,
dark mode, transactional email — all persisted in Supabase. Campaign
copy/targeting is REAL AI once ANTHROPIC_API_KEY is set.
Simulated: ALL analytics numbers (deterministic fake), platform "In
review/Live" statuses. AI visuals: REAL Gemini ads once GEMINI_API_KEY set
(billing enabled Jul 10) — briefing demands business name/logo front-and-
center as designed display ads; business brandingJson (logo first) is
auto-attached as Gemini references; 4 sizes per click via response_format
aspect_ratio (banner 21:9 / landscape 16:9 / square 1:1 / vertical 9:16,
defined in lib/creative-formats.ts). SVG concept-card fallback without a key
(fallback is 1200x628 only — not size-aware; fine since prod has a key).
Video generation deliberately skipped (cost/latency) — Owen agreed Jul 10.
**No actual ads run and no money moves.** Owen knows this.

Creative system (Jul 10 evening): Campaign.creativesJson [{url,format,
prompt?,createdAt}] with creativeUrl kept in sync as [0] (thumbnail);
Business.brandingJson [{url,label: Logo|Storefront|Product/Work|Other}].
CreativeManagerModal (campaign card thumbnail click + Edit Campaign button)
= view/remove/add/regenerate/download; regenerate re-runs stored prompt.
Validators in lib/creative-validate.ts + lib/business-patch.ts. FIXED
pre-existing bug: businesses POST silently dropped description/address/
phone/website (now applied via businessPatchFrom).

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

## Jul 10 late-night additions

- **Ad briefing v3** (imagegen.ts): translated Owen's ad-creative framework
  into still-image terms — 60-30-10 color rule, brand-derived palette from
  attached logo/brand refs, Inter/Montserrat-class type ≤20% of frame,
  exactly 3 text layers (name / support line / CTA chip in accent), product
  as hero IN USE with hands + macro detail, per-format platform-native
  composition (CREATIVE_FORMATS.style). Video-only parts of his framework
  (pacing/captions/audio) intentionally deferred until video gen exists.
- **Rate limiting** (lib/ratelimit.ts): in-memory sliding window, per-IP or
  per-user; applied to signup 5/10m, login 15/10m, forgot 3/10m,
  generate 12/m/user, creative 20/5m/user, upload 30/10m/user, monitor
  10/m/IP, verify-resend 3/10m/user. Honest caveat in file: per-instance
  memory; upgrade to Upstash if it must be airtight.
- **Email verification**: users.email_verified + email_verifications table
  (SOFT gate: login still works, dashboard shows amber banner + resend;
  hard gate deliberately deferred). Verify link rides a dedicated email at
  signup; /api/auth/verify consumes token → redirect /dashboard?verified=1.
  Existing users grandfathered as verified via migration default trick.
  File store keeps verify tokens in memory only (dev-only backend).
- **Error monitoring** (lib/monitor.ts): dependency-free Sentry via HTTP
  store API behind SENTRY_DSN (optional; always console.errors for Vercel
  logs). global-error.tsx client boundary reports via /api/monitor. Wired
  into creative, stripe webhook parse, cron digest per-business.
- **Env vars still pending**: CRON_SECRET (required for digests),
  STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (test mode), SENTRY_DSN
  (optional). Migration SQL for this batch at bottom of schema.sql.

## Jul 10 (later) — Stripe actually wired to the UI

- DISCOVERY: /api/billing/checkout existed but NOTHING called it — launches
  never touched Stripe. Fixed: lib/client.ts startCheckout() helper;
  CampaignModal launch and the new Rerun flow both call it after creating
  the campaign, redirect to Stripe's hosted page when configured, silently
  continue in preview mode on 501. Cancelled checkout leaves the campaign
  created (acceptable for demo phase; revisit when billing is real).
- "Rerun campaign" button in Past Ad Buys → POST /api/campaigns/[id]/rerun
  (clones completed campaign: copy/targeting/images/settings, fresh start
  date, name gets "(rerun)" suffix without snowballing) → Stripe checkout.
  Rate limited 10/10m/user.
- Stripe dashboard note for walkthroughs: new accounts start in a SANDBOX
  (test keys by default); mode toggle sits top-LEFT in current UI; webhooks
  live in Workbench (Developers button, bottom-left) → Webhooks →
  Create new destination.

## Jul 10 (final) — briefing v5 + settings verification

- Briefing v5 (imagegen.ts): Owen's three-filter framework encoded — Filter 1
  layout laws (left/right split 16:9+1:1+banner, upper/lower thirds 9:16 with
  10%/15% UI safe zones, text/subject never overlap, zero text FX, exactly two
  fonts: display + sans), Filter 2 translation matrix (premium/casual/B2B ×
  audience age × aspirational-vs-problem-solving), Filter 3 network standards
  (≤20% text, CTA footer zone). Target-customer text (industryText/intentText)
  now flows into /api/creative as `audience` and into the briefing.
- Settings → Account: Email-verification card (status + send button) and the
  password-reset button is DISABLED until verified. Enforcement design: a
  consumed reset link auto-verifies (possession of inbox proven) — airtight
  without locking out password recovery.

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
