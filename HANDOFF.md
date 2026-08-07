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

**Campaign Strike** (chosen Jul 10; was AdPilot — brand.ts holds the name, campaignstrike.com was TAKEN at decision time, alt TLD/domain still needed) is an
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

## Jul 10 (v2 final) — gate switch, digest windows, checkout notices

- lib/verification-gate.ts: REQUIRE_EMAIL_VERIFICATION=true (Vercel env, OFF
  by default) blocks campaigns POST, rerun, generate, creative for unverified
  users. Owen flips it when demos are done.
- Cron digests now use windowed metrics matching frequency (daily=1d,
  weekly=7d, monthly=30d) so numbers match the subject line.
- Dashboard one-time notice banner via URL params: billing=success/cancelled
  (Stripe redirect) and verified=1/0 (email link) → DashboardShell notice prop.

## Jul 10 — briefing v6 (quality control pass)
Owen reviewed generated ads: v5 had vertical dead-space in text columns and
one ad rendered fake phone UI (battery/clock/signal). Added two CRITICAL
QUALITY CONTROL blocks to the briefing: (1) text group vertically centered as
one unit, even padding, scale-to-fit, ≤45% width text columns, flat clean
text-zone backgrounds; (2) absolute ban on device UI elements and mockup
frames — raw ad-manager-ready asset only. The 9:16 vertical format style
mentions native story energy — watch whether that keeps tempting the model
toward phone chrome; if UI artifacts persist, soften that line next.

## Jul 10 (night) — wordmark, hero blank, WAITLIST MODE

- Name is now "CampaignStrike" (no space); brandNameParts() splits camelCase
  for the two-tone logo. Domain campaignstrike.com PURCHASED by Owen.
- HeroVideo.tsx = blank navy aspect-video panel until Owen records the new
  video (old <video> impl in git history).
- WAITLIST MODE (lib/waitlist.ts, ON by default): only odlowe@gmail.com (+
  WAITLIST_ALLOWED_EMAILS csv env) get sessions. Everyone else: account IS
  created+stored, sendWaitlistEmail goes out, signup/login return
  {waitlisted:true}, AuthForm routes to /waitlist page, dashboard bounces
  stale waitlisted sessions. Open the doors later with WAITLIST_MODE=off.

## Aug 7 — GOOGLE ADS WIZARD BUILT (data + UI + AI; API publish still pending)

The 9-page blueprint below is now IMPLEMENTED product-side. What exists:

- **Types** (types.ts): CampaignGoal + CAMPAIGN_GOAL_KEYS, LinkedAccounts,
  PmaxAssets (the AI asset group), GoogleAdsCampaignPlan (moved here from
  google-ads.ts, which re-exports it). Business.linkedAccountsJson;
  Campaign.googleAdsJson / googleCampaignId / googleStatus (null until the
  real API publish exists). CampaignPlan.pmax?: PmaxAssets.
- **google-ads.ts**: clipAsset (word-boundary clip, drops dangling stopwords),
  sanitizePmax (enforces Google's char limits IN CODE: 30/90/90/25 — never
  trust prompt-side limits), buildPmaxFromBasics (fallback asset group from
  classic adCopy/targeting), ensurePaidForBy, buildGoogleAdsPlan (assembles
  the full PMax plan: goal→CTA map, images by creative format
  [landscape+banner+custom→landscape, square→square], logo from brandingJson,
  YouTube from linkedAccountsJson, sitelinks auto-named from enhance-page URL
  slugs, dailyBudget = monthly/30.4, locations from zip+radius).
- **ai.ts**: generateCampaignPlan(intent, budget, radius, opts?) — opts =
  {businessName, goal, paidForBy}. Prompt requests the pmax block; coercePlan
  parses it LENIENTLY (bad pmax never sinks a plan — backfilled from basics).
  Goal steers copy + CTA in both engines. paidForBy guaranteed in adCopy AND
  pmax descriptions code-side (withDisclaimer/ensurePaidForBy).
- **Wizard** (CampaignModal): goal radio cards (P3, first question, default
  purchases), "Where clicks should land" card (P5: landing URL prefilled from
  business website + enhance-pages chips), bid card (P7: two plain-English
  buttons + optional $ target cost), political compliance card (amber, only
  for Political Campaign category: required Paid-for-by input — generate
  button disabled without it — + Google verification lead-time warning).
  New props businessWebsite/businessCategory passed from DashboardShell.
- **GoogleAssetEditor.tsx** (new): collapsible "Your Google ad assets" panel
  under the campaign preview — headlines/long headlines/descriptions/USPs as
  editable lines with live char counters, themes/product terms as chip
  editors. Edits flow into plan.pmax; server re-sanitizes at launch.
- **BusinessModal**: Linked accounts section (P2: GBP, YouTube, ads phone,
  app URL) → linkedAccountsJson via cleanLinkedAccounts (empty save clears).
- **Routes**: /api/generate accepts goal+paidForBy, passes businessName.
  /api/campaigns POST validates wizard fields, 400s political launches
  missing paidForBy, builds + stores googleAdsJson. /api/campaigns/[id]
  PATCH: when the planner re-runs, googleAdsJson is REBUILT with fresh
  assets but the owner's original wizard choices (goal/landing/bid/
  disclaimer) preserved. Rerun clones googleAdsJson, nulls google ids.
- **schema.sql**: columns in main tables + Aug 7 ALTER block at the bottom
  (linked_accounts_json, google_ads_json, google_campaign_id, google_status).
  Owen must run the ALTERs BEFORE uploading the code (launches 500 otherwise).
- **Verified**: sandbox had npm access this time — `tsc --noEmit` (strict)
  clean AND full `next build` compiled + linted (only Google-Fonts fetch is
  sandbox-blocked; stubbed for the test and reverted, file byte-identical).
  Smoke-tested: mock+political plans, char limits, disclaimer, CTA map,
  buildGoogleAdsPlan assembly (sitelinks, logo, youtube, dailyBudget).

### Aug 7 (round 2) — Owen's polish batch
- Political card: "start it early" now LINKS to Google's election-ads
  verification page (support.google.com/adspolicy/answer/9002729, new tab).
- Upload section shows recommended sizes line (1200×628 / 1200×1200 /
  1080×1920 / 1200×514, JPG/PNG).
- **Campaign names**: Targeting gained optional audienceLabel (3-5 word
  demographic, AI-written; mock derives from AUDIENCE_HINTS/vertical).
  campaigns POST names campaigns `Business — <label>` (falls back to the old
  clipped-summary), and Stripe checkout line items use it too.
- **DURATION IS NOW WEEKS (1–26, default 4)** — durationMonths is GONE from
  the codebase: Campaign.durationWeeks + CampaignDraft.durationWeeks; all
  three dials (wizard, edit modal, landing configurator) say weeks like
  Google does; metrics cycleDays = weeks*7; receipt email says weeks;
  HistoryTable total = budget × weeks/4.345; ActiveCampaigns "N week run";
  samples 8/4/4 weeks. DB: campaigns.duration_weeks column with a
  months×4 backfill migration at the bottom of schema.sql — old
  duration_months column stays behind ignored (it has a NOT NULL default,
  so inserts without it are fine). Old landing-page localStorage drafts
  (durationMonths shape) just fall back to the 4-week default.

### Aug 7 (round 3) — GOOGLE PUBLISH ENGINE + OAUTH CONNECT BUILT

- **google-ads.ts**: buildConsentUrl / exchangeCodeForRefreshToken /
  listAccessibleCustomers; publishGaps() (plain-English pre-flight);
  publishCampaignToGoogle() — ONE atomic googleAds:mutate with temp resource
  ids: budget → PMax campaign (created PAUSED, always) → proximity(zip+radius,
  US)+English criteria → text/image/logo/CTA/YouTube assets → asset group +
  assetGroupAssets → search-theme signals → campaign-level sitelinks. Images
  fetched from https OR data: URLs → base64 (5MB cap); channel-URL YouTube
  links skipped with warning (only real video URLs attach).
  setGoogleCampaignStatus() ready for pause/resume wiring later.
- **Routes**: /api/google/connect (login-required; state cookie; consent
  redirect — redirect_uri derived via lib/request-origin.ts, proxy-aware),
  /api/google/callback (exchanges code, SHOWS refresh token on a branded HTML
  page with paste-into-Vercel steps — never stored), /api/google/status
  (JSON checklist of all six env vars + live listAccessibleCustomers probe
  with plain-English hints), /api/google/publish/[id] (POST, owner's
  campaigns only, rate-limited 5/10m, REFUSES to run without
  GOOGLE_ADS_TEST_CUSTOMER_ID — cannot touch real accounts; maxDuration 60;
  stores googleCampaignId + googleStatus "PAUSED").
- **UI**: ActiveCampaigns cards get "Push to Google (test)" (blue, only when
  googleAdsJson && !googleCampaignId && !isSample) + an "On Google (test)"
  badge; success/warning notices surface above the card list.
- **Env vars for this feature** (developer token already set):
  GOOGLE_ADS_OAUTH_CLIENT_ID, GOOGLE_ADS_OAUTH_CLIENT_SECRET,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID (test manager, digits only),
  GOOGLE_ADS_TEST_CUSTOMER_ID (test client, digits only),
  GOOGLE_ADS_REFRESH_TOKEN (minted via /api/google/connect AFTER the client
  id/secret are set — must consent with the Google account that owns the
  test manager). OAuth consent screen must be pushed to "In production"
  (External) or the refresh token dies every 7 days. Redirect URIs to
  register: https://campaignstrike.com/api/google/callback + the
  .vercel.app equivalent. Owen was given click-by-click instructions.
- Verified: tsc strict + full next build clean; consent-URL and
  publishGaps logic smoke-tested. Real publish untested until Owen's
  credentials exist — FIRST ACTION NEXT SESSION: /api/google/status, then
  push a test campaign and fix whatever Google complains about (field-name
  or enum mismatches in the mutate payload are the likely failure mode;
  API version pinned v20 via GOOGLE_ADS_API_VERSION).

### Aug 7 (round 4) — live-fire fixes during Owen's credential walkthrough
- Owen COMPLETED the walkthrough: /api/google/status returns connected:true.
  Accounts: test manager 8502715176 (login-customer-id), test client
  7347346250 (publish target), original Jul manager 1809623886 (owns the
  dev token). Client secret was rotated (first one leaked into chat).
  OAuth consent published to production ("Audience" tab in new console UI).
- **v20 SUNSET**: Google killed API v20 Jun 10 2026 → every call 400'd.
  Fixed via GOOGLE_ADS_API_VERSION=v23 env var (set in Vercel) + code
  default now v23. Versions sunset yearly — check skuanalyzer.com/guides/
  google-ads-api/version-updates or Google's blog when calls suddenly 400.
- **Business creation timeout**: seeding 3 sample campaigns × real Claude
  calls blew Vercel's function limit → "stuck loading". samples.ts now uses
  exported generateBuiltInPlan (the deterministic mock — samples are
  decoration) + maxDuration 30 on businesses/onboarding POST routes.
- Error truncation in google-ads.ts widened 300→1200 chars (a 400's
  errorCode got cut off mid-diagnosis).
- NEXT: Owen pushes first test campaign via the card button; expect to
  debug v23 payload nits from Google's (now fuller) error messages.

### Aug 7 (round 5) — Owen's quality batch (pre-first-push)
- **Audience-profile-first planning**: PLAN_SYSTEM_PROMPT now demands an
  "audienceProfile" field WRITTEN FIRST (who/needs/Google-moments/their
  words); keywords must mix local-intent + problem-phrases + comparison
  phrases with generic filler explicitly BANNED; searchThemes must cover
  urgent/research/local/outcome angles; ≥4 pmax headlines speak to the
  desire not the name. CampaignPlan.audienceProfile?: string (transient,
  not stored on Campaign); shown in CampaignPreview under "Who it will
  reach" as "How your agent sees them". max_tokens 2000→2800.
- **ImageCropModal** (components/ui): reusable drag+zoom cropper, exports
  at EXACT preset px (canvas scales small images up, big ones down).
  BusinessModal: all brand images forced through it → 1200×1200 JPEG
  (Google's square-logo rule); files queue one at a time.
  CreativeUploader: photos (when storing) must pick a Google shape —
  landscape 1200×628 / square 1200×1200 / story 1080×1920 / banner
  1200×514 — before upload; videos skip the crop; landing-page
  preview-only mode unchanged. onUploaded now passes (url, format) and
  CampaignModal records the real format instead of "custom" (feeds
  straight into googleAdsJson.imageUrls mapping).
- v4 (business-creation timeout fix) was never uploaded — v5 zip is
  cumulative; Owen uploads v5 only.

### Aug 7 (round 13) — Claude-or-nothing (v15)
- OWEN'S RULE: with ANTHROPIC_API_KEY set, the backup writer NEVER runs.
  generateCampaignPlan retries Claude twice (25s timeout each, fits the
  60s route ceiling) and THROWS on total failure; /api/generate returns a
  clean 502 ("try again"), campaigns/[id] PATCH fails the save rather than
  rewriting with backup copy. Mock remains only for keyless dev (samples
  use generateBuiltInPlan directly). plan.engine + the amber notice remain
  as the dev-mode tell. Loading copy now says 10-30 seconds.

### Aug 7 (round 12) — headline formula system (v14)
- Owen saw MOCK output in Google's UI ("People within 5 miles who match...",
  clipped sentences) — his live campaign was written by the BACKUP writer,
  meaning the Claude call silently failed on that generation. Three fixes:
  (1) plan.engine "claude"|"builtin" + amber "backup writer used" notice in
  the preview (silent fallback is now visible); (2) ANTHROPIC_TIMEOUT_MS
  25s→50s, generate + campaigns/[id] maxDuration 30→60; (3) backup writer's
  longHeadlines rebuilt from templates (audienceSummary blurb BANNED from
  long headlines/descriptions).
- PLAN_SYSTEM_PROMPT now carries explicit FORMULAS: headline portfolio
  (2 brand / 3 benefit / 2 problem / 2 local-trust / 2 action / 2 proof /
  2 wildcards, varied first words + lengths), long-headline recipes (5
  complete-sentence patterns, "write a shorter complete sentence" rule),
  tiered search terms (urgent/service+place/comparison/outcome/brand), and
  a HARD no-invented-facts rule (no fake discounts/years/awards/licensed).
- POLITICAL: prompt rules + withPoliticalTerms() code guarantee — candidate
  name always in keywords+themes, plus "name district N"/"name ward N"
  parsed from the input. PlanOptions.category flows from both routes.

### Aug 7 (round 11) — 🎉 FIRST CAMPAIGN ON GOOGLE + account-tree diagnostic (v12)
- **PUBLISH SUCCEEDED**: campaign 24110026254 ("Campaign Strike — Deal
  seekers nearby") created PAUSED in test client 6768358139. The entire
  pipeline works end to end. (One warning: no ZIP set → nationwide default.)
- Owen couldn't FIND it in the UI (four lookalike accounts now exist: old
  non-test manager 8502715176 + its draft child 7347346250 = decoys; real
  test manager (id in Vercel LOGIN_CUSTOMER_ID) + API child 6768358139 =
  the real ones). Added googleAdsSearch() (GAQL) + listClientAccounts() +
  GET /api/google/accounts — prints the true account tree AND the campaigns
  inside the publish target straight from the API.
- NEXT SESSION: metrics/status sync via GAQL (googleAdsSearch is ready for
  it), pause/resume wiring, Basic-access application walkthrough.

### Aug 7 (round 10) — ASPECT_RATIO_NOT_ALLOWED → sharp normalizer (v11)
- Google enforces image ratios exactly: MARKETING_IMAGE must be 1.91:1 but
  Gemini generates 16:9 (and banner is 21:9). Fix: **first real dependency
  added — sharp** (breaks the "raw fetch only" convention deliberately;
  pixel work is impossible dependency-free, and sharp is Vercel-native).
  imageAsBase64(url,w,h) now center-crops + scales EVERY image to Google's
  exact spec at publish time (IMAGE_SPECS: 1200×628 / 1200×1200 / 1200×1200
  logo), jpeg q88, dynamic import so sharp loads only during publish.
  Handles data: URLs and https, legacy stored images included.
- REMINDER: package.json + package-lock.json changed — Owen MUST upload
  both or Vercel's build won't install sharp.

### Aug 7 (round 9) — first POLICY_FINDING (v10)
- Publish reached Google's POLICY review (deepest layer yet): one text
  asset disapproved as PROHIBITED, evidence = a quotation-mark character.
  Fix: policySafe() strips quote chars + collapses !!/??/.... chains;
  wired into clipAsset (prevention at plan time) AND textAsset() in
  publishCampaignToGoogle (cures plans stored before the fix, no relaunch
  needed). Prompt now bans quotes/repeated punctuation in pmax fields.
- LESSON for future publish errors: mutate_operations index in Google's
  error locates the exact op; policy findings list the offending text in
  policyFindingDetails.evidences.

### Aug 7 (round 8) — v23 payload fixes from Google's real feedback (v9)
- PLOT TWIST: manager 8502715176 was NOT a test account (the missing red
  badge was the tell; DEVELOPER_TOKEN_NOT_APPROVED proved it). Owen created
  a REAL test manager via ads.google.com/nav/selectaccount?sf=mt, then
  /api/google/create-test-client minted ENABLED client 6768358139 — the
  API's first successful write. LOGIN_CUSTOMER_ID + TEST_CUSTOMER_ID both
  updated in Vercel. (First attempt hit CUSTOMER_NOT_FOUND — typo'd id.)
- First campaign publish → two v23-era requirements, both fixed in
  publishCampaignToGoogle: (1) campaign.containsEuPoliticalAdvertising is
  REQUIRED now — set DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING always (US
  local product; US politics ≠ EU political advertising). (2) Brand
  Guidelines is default-on for new PMax: BUSINESS_NAME + LOGO must link as
  CampaignAssets, not assetGroupAssets — links split into group vs campaign
  targets accordingly.

### Aug 7 (round 7) — CUSTOMER_NOT_ENABLED fix (v8)
- First real publish attempt reached Google → 403 CUSTOMER_NOT_ENABLED: the
  UI-created test client (7347346250) is stuck in Draft (Owen couldn't
  finish/skip the signup wizard). Fix: createClientAccountUnderManager()
  (customers/{mgr}:createCustomerClient, USD, America/Chicago) + GET
  /api/google/create-test-client (login + rate-limited 3/10m) — API-born
  accounts arrive ENABLED. Owen visits it, swaps the returned id into
  GOOGLE_ADS_TEST_CUSTOMER_ID, redeploys, re-pushes. The old draft account
  can be ignored forever.

### Aug 7 (round 6) — publish backfill + split upload doors (v6/v7)
- Owen's first push attempt failed on "needs a square logo": the plan is a
  LAUNCH-TIME SNAPSHOT and his logo was added after (or labeled "Other").
  /api/google/publish now backfills squareLogoUrl + videoUrls from the
  CURRENT business profile before the gap check, and persists the patched
  googleAdsJson on success (v6).
- BusinessModal (v7): single "Add" tile replaced by two side-by-side doors —
  "Upload logo" (forced Logo label, amber until a Logo exists, then green
  "Logo added ✓") and "Upload other images" (label Other, adjustable via
  each thumbnail's dropdown as before). cropQueue entries now carry
  {file, label}; filename-regex label guessing is gone.

**NOT built yet**: status/metrics sync via searchStream GAQL (dashboard still
shows fake numbers), pause/resume wiring to Google, per-customer production
accounts + Basic-access application (Owen applies after test publishing
works). Validation demo kit (playbook/one-pager/scorecard/tracker) was
delivered Aug 7 — Owen is booking ~20 demos in parallel.

## GOOGLE ADS BUILD — Owen's 9-page blueprint (Jul 10, reference)

Owen has a TEST-access developer token (in Vercel as
GOOGLE_ADS_DEVELOPER_TOKEN — never in code). lib/google-ads.ts holds the
adapter skeleton + full credential list. "Political Campaign" category added
everywhere (see compliance note below).

Owen documented Google's real PMax flow as 9 pages. Agreed mapping — each
field lives in ONE of: [PROFILE] business profile, [WIZARD] campaign
creation flow, [AI] auto-generated (reviewable), [AUTO] handled silently:

P1 Business name/website/phone → [PROFILE] all exist already.
P2 Linked accounts (Google Business Profile, YouTube, phone, mobile app) →
   [PROFILE] add linkedAccountsJson {gbp?, youtube?, phone?, appUrl?} to
   Business + UI section in BusinessModal. Optional fields.
P3 Goal (purchases/lead form/phone calls/page views/brand awareness) →
   [WIZARD] new first question, radio cards. Maps to plan.goal.
P4 Search themes → [AI] from industryText + keywords (editable chips);
   Locations → [WIZARD] existing zip+radius dials; Language → [AUTO] "en"
   (env-able later).
P5 Landing URL → [WIZARD] input, default business website; product terms +
   USPs → [AI] Claude extracts from description/industryText, editable;
   enhance-pages URLs → [WIZARD] optional multi-input.
P6 ENTIRE asset group → [AI]: 15×30ch headlines, 5×90ch long headlines,
   5×90ch descriptions (extend generateCampaignPlan schema), images from
   creativesJson (landscape+square exist!), square logo from brandingJson
   Logo, businessNameShort (25ch, AI truncates), videos (YouTube link from
   P2), sitelinks from enhance-pages, CTA already in adCopy. Preview step
   shows all with edit.
P7 Bid strategy → [WIZARD] one friendly toggle: "most customers"
   (maximize_conversions) vs "most value" (maximize_conversion_value) +
   optional target cost input. Plain-English copy essential.
P8 Budget → [WIZARD] existing budget dial. dailyBudget = monthly/30.4.
P9 Pay → [AUTO] existing Stripe checkout. Google's "strategist call" upsell
   → drop (not our product).

Data model deltas needed: Business.linkedAccountsJson; Campaign.googleAdsJson
(GoogleAdsCampaignPlan from lib/google-ads.ts) + google_campaign_id/
google_status for sync. Schema ALTERs as usual.

WHAT OWEN MUST CREATE (only he can — walk him through):
1. Google Cloud project → OAuth client (Web) → CLIENT_ID/SECRET env vars.
2. Google Ads TEST MANAGER account (ads.google.com/home/tools/manager-accounts
   in test mode) + a test client account under it → LOGIN_CUSTOMER_ID.
3. One-time OAuth consent → REFRESH_TOKEN (build a /api/google/connect route
   or use OAuth playground).
4. Later, for production: apply for Basic access on the developer token.

POLITICAL CAMPAIGN COMPLIANCE (added category): Google requires election-ad
advertiser VERIFICATION before political ads serve, restricts targeting, and
US law requires "Paid for by ..." disclaimers. When the wizard sees category
Political Campaign it must (a) collect a "Paid for by" line, (b) warn about
Google verification lead time, (c) keep the disclaimer in generated copy.
NOT built yet — do with the wizard. Gemini may also refuse politician
likenesses in images; expect concept-card-style fallbacks for this category.

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
