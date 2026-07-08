# AdPilot

**Get Local Customers on Autopilot. No Tech Skills Required.**

An automated AI marketing platform for non-technical small business owners.
Instead of complex dashboards: three dials (budget, radius, duration), one
plain-English text box, one Launch button. The agent writes the ads, maps the
targeting, and runs the campaign on Google, Instagram (Meta), and Reddit
simultaneously — with a multi-business dashboard, plain-English analytics,
30-day performance charts, and a campaign history archive.

**Hero video:** drop an `hero-video.mp4` into `/public` to show a product
video in the hero. Until then, the built-in animated "Ad Journey" scene
renders automatically as the fallback.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Launch Your First Ad Free**, create an
account (any email + 8-char password), and you'll land in onboarding → the
dashboard.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — corporate heritage palette (navy / slate / emerald)
- **Lucide React** icons
- Hero animation is pure CSS keyframes (transform/opacity only — smooth on
  mobile, loops cleanly, respects `prefers-reduced-motion`)

## Architecture

```
src/
├── app/
│   ├── page.tsx              Landing (hero animation, how-it-works, live pricing calc)
│   ├── signup/ login/        Friction-free email/password auth
│   ├── onboarding/           Post-signup: business name + industry chips
│   ├── dashboard/            The slider UI + campaign generator
│   └── api/
│       ├── auth/…            signup / login / logout (signed HttpOnly cookie)
│       ├── onboarding/       save business profile
│       ├── generate/         the "agent" produces a CampaignPlan
│       └── campaigns/        launch (persist) + list campaigns
├── components/
│   ├── landing/              Navbar, Hero, HeroAnimation, HowItWorks, Pricing, Footer
│   ├── dashboard/            CampaignBuilder, CampaignPreview, CreativeUploader, CampaignList
│   ├── auth/AuthForm.tsx
│   └── ui/Slider.tsx         The signature slider control
├── lib/
│   ├── db.ts                 Data layer (see below)
│   ├── auth.ts               scrypt password hashing + HMAC-signed sessions
│   ├── ai.ts                 Mock AI planner (deterministic, swappable for a real model)
│   └── types.ts              Shared contracts (Campaign, CampaignPlan, …)
└── middleware.ts             Gates /dashboard and /onboarding
```

## Database

The app ships with a **zero-setup store** (`src/lib/db.ts`) shaped exactly
like the production schema. Every change is persisted to `.data/store.json`,
so accounts, businesses, and campaigns survive dev-server restarts. (On
serverless hosts like Vercel the filesystem is ephemeral — data persists per
warm instance only; move to Supabase for true production persistence.)

Every new business is seeded with three flagged sample campaigns (one live,
two completed) so the analytics and history views demonstrate themselves.
Metrics are generated deterministically per campaign (`src/lib/metrics.ts`) —
stable numbers, not random on each reload.

To go to production with **Supabase**:

1. Run `supabase/schema.sql` in the Supabase SQL editor (creates `profiles` +
   `campaigns` with row-level security).
2. Replace the function bodies in `src/lib/db.ts` with Supabase client calls —
   each function maps to a single query, and nothing outside that file needs
   to change.
3. Optionally swap the cookie sessions in `src/lib/auth.ts` for Supabase Auth.

Campaigns table (per spec): `id, user_id, budget, industry_text,
targeting_json, ad_copy_json, platform_statuses, created_at`.

## The AI layer

`src/lib/ai.ts` is a deterministic mock of the campaign planner. It reads the
owner's plain-English description, detects the business vertical and audience
hints (moms, eco-friendly, students, …), and returns the structured
`CampaignPlan` the UI renders: headlines, descriptions, Google keywords, and
Meta/Reddit interest buckets. Replace `generateCampaignPlan` with a real model
call — the return type is the contract.

## Environment

- `SESSION_SECRET` — set in production (dev fallback included).
