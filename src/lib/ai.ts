/**
 * The campaign planner ("your agent").
 *
 * Two engines share the same contract (`CampaignPlan`):
 *   1. Claude (real AI) — used automatically when ANTHROPIC_API_KEY is set.
 *   2. A deterministic built-in planner (regex vertical matching) — used with
 *      no key, and as the safety net if the API call ever fails mid-demo,
 *      so campaign creation can never break.
 */
import { buildPmaxFromBasics, ensurePaidForBy, sanitizePmax } from "./google-ads";
import type { CampaignGoal, CampaignPlan } from "./types";

/** Extra context the wizard can hand the planner (all optional). */
export interface PlanOptions {
  /** Real business name — anchors headlines + the 25-char short name. */
  businessName?: string;
  /** Google wizard page-3 goal — steers copy and the call to action. */
  goal?: CampaignGoal;
  /** Political Campaign category: the legally required disclaimer line. */
  paidForBy?: string;
  /** Business category — "Political Campaign" activates candidate rules. */
  category?: string;
}

const GOAL_DESCRIPTIONS: Record<CampaignGoal, string> = {
  purchases: "drive purchases (in store or online)",
  leads_form: "get people to send their contact info through a form",
  leads_calls: "get people to call the business",
  page_views: "get more people visiting the website",
  brand_awareness: "make locals recognize and remember the business",
};

const GOAL_MOCK_CTA: Record<CampaignGoal, string> = {
  purchases: "Order Online",
  leads_form: "Get Offer",
  leads_calls: "Call Now",
  page_views: "Learn More",
  brand_awareness: "Visit Us",
};

interface Vertical {
  match: RegExp;
  noun: string;
  keywords: string[];
  metaInterests: string[];
  redditInterests: string[];
}

const VERTICALS: Vertical[] = [
  {
    match: /baker|pastr|sourdough|cafe|coffee|espresso|donut|dessert/i,
    noun: "bakery & café",
    keywords: ["bakery near me", "best coffee shop near me", "fresh bread near me", "pastries open now"],
    metaInterests: ["Baking", "Coffee culture", "Foodies", "Local food"],
    redditInterests: ["r/Breadit", "r/Coffee", "Local city subreddit", "r/food"],
  },
  {
    match: /restaurant|pizza|taco|sushi|burger|dinner|catering|food truck/i,
    noun: "restaurant",
    keywords: ["restaurants near me", "best dinner near me", "food delivery near me", "lunch specials"],
    metaInterests: ["Dining out", "Foodies", "Date night", "Family activities"],
    redditInterests: ["Local city subreddit", "r/food", "r/FoodPorn", "r/AskCulinary"],
  },
  {
    match: /boutique|dress|cloth|apparel|fashion|shoe|jewel/i,
    noun: "boutique",
    keywords: ["boutique near me", "sustainable clothing store", "women's dress shop near me", "local fashion"],
    metaInterests: ["Sustainable fashion", "Boutique shopping", "Eco-friendly products", "Style & trends"],
    redditInterests: ["r/femalefashionadvice", "r/sustainability", "Local city subreddit", "r/frugalfemalefashion"],
  },
  {
    match: /salon|spa|barber|nail|lash|hair|massage|beauty/i,
    noun: "salon & spa",
    keywords: ["hair salon near me", "spa day near me", "best barber near me", "nail salon open now"],
    metaInterests: ["Beauty & self-care", "Wellness", "Haircare", "Spa days"],
    redditInterests: ["r/Hair", "r/SkincareAddiction", "Local city subreddit", "r/malegrooming"],
  },
  {
    match: /gym|fitness|yoga|pilates|crossfit|trainer|martial/i,
    noun: "fitness studio",
    keywords: ["gym membership near me", "yoga classes near me", "personal trainer near me", "fitness classes"],
    metaInterests: ["Fitness & wellness", "Yoga", "Healthy lifestyle", "New year goals"],
    redditInterests: ["r/Fitness", "r/yoga", "Local city subreddit", "r/xxfitness"],
  },
  {
    match: /plumb|hvac|electric|roof|landscap|contractor|handyman|clean|pest/i,
    noun: "home services company",
    keywords: ["plumber near me", "emergency repair near me", "licensed contractor near me", "free estimate home repair"],
    metaInterests: ["Homeowners", "Home improvement", "DIY & renovation", "New movers"],
    redditInterests: ["r/HomeImprovement", "Local city subreddit", "r/Plumbing", "r/DIY"],
  },
  {
    match: /dental|dentist|chiro|clinic|therapy|vet|pediatric|optom/i,
    noun: "local practice",
    keywords: ["dentist near me accepting patients", "clinic near me", "best rated practice near me", "same week appointment"],
    metaInterests: ["Family health", "Parents", "Health & wellness", "Local community"],
    redditInterests: ["Local city subreddit", "r/AskDocs", "r/Parenting", "r/personalfinance"],
  },
  {
    match: /pet|dog|cat|groom/i,
    noun: "pet business",
    keywords: ["dog groomer near me", "pet store near me", "dog daycare near me", "puppy training classes"],
    metaInterests: ["Dog lovers", "Pet parents", "Animal welfare", "Local community"],
    redditInterests: ["r/dogs", "r/Pets", "Local city subreddit", "r/puppy101"],
  },
];

const GENERIC: Vertical = {
  match: /.*/,
  noun: "local business",
  keywords: ["shops near me", "best local business near me", "open now near me", "locally owned"],
  metaInterests: ["Shop local", "Small business supporters", "Local community", "Deals & offers"],
  redditInterests: ["Local city subreddit", "r/smallbusiness", "r/BuyItForLife", "r/deals"],
};

/** Extra interest buckets pulled from how the owner describes their customer. */
const AUDIENCE_HINTS: Array<{ match: RegExp; meta: string; reddit: string }> = [
  { match: /mom|mother|parent|famil/i, meta: "Parents with young children", reddit: "r/Parenting" },
  { match: /sustain|eco|green|organic|environment/i, meta: "Sustainable living", reddit: "r/ZeroWaste" },
  { match: /student|college|campus/i, meta: "College students", reddit: "r/college" },
  { match: /young professional|commuter|remote work/i, meta: "Young professionals", reddit: "r/careerguidance" },
  { match: /senior|retire/i, meta: "Adults 55+", reddit: "r/retirement" },
  { match: /wedding|bride|engag/i, meta: "Recently engaged", reddit: "r/weddingplanning" },
  { match: /luxur|premium|high[- ]end/i, meta: "Luxury shoppers", reddit: "r/BuyItForLife" },
  { match: /budget|afford|deal|discount/i, meta: "Deal seekers", reddit: "r/Frugal" },
];

function pickBusinessName(intent: string): string {
  // Grab a capitalized run of words if the owner typed their business name.
  const match = intent.match(/([A-Z][\w'&]+(?:\s+[A-Z][\w'&.]+){0,3})/);
  return match ? match[1] : "Your Business";
}

/**
 * The instant, deterministic planner. Exported for sample/demo campaign
 * seeding — decorative data must NEVER wait on (or pay for) real AI calls;
 * three of them in one request was timing out business creation on Vercel.
 */
export async function generateBuiltInPlan(
  intentText: string,
  budget: number,
  radiusMiles: number,
  opts: PlanOptions = {}
): Promise<CampaignPlan> {
  return generateMockPlan(intentText, budget, radiusMiles, opts);
}

async function generateMockPlan(
  intentText: string,
  budget: number,
  radiusMiles: number,
  opts: PlanOptions = {}
): Promise<CampaignPlan> {
  const vertical = VERTICALS.find((v) => v.match.test(intentText)) ?? GENERIC;
  const name = opts.businessName?.trim() || pickBusinessName(intentText);

  const metaInterests = [...vertical.metaInterests];
  const redditInterests = [...vertical.redditInterests];
  let matchedHint: (typeof AUDIENCE_HINTS)[number] | null = null;
  for (const hint of AUDIENCE_HINTS) {
    if (hint.match.test(intentText)) {
      matchedHint = matchedHint ?? hint;
      metaInterests.unshift(hint.meta);
      redditInterests.unshift(hint.reddit);
    }
  }

  const headlines = [
    `${name}: The ${vertical.noun} your neighbors keep recommending`,
    `Looking for a great ${vertical.noun} within ${radiusMiles} miles? Found it.`,
    `Locally owned. Loved by locals. Come see why.`,
    `Your new favorite ${vertical.noun} is closer than you think`,
  ];

  const descriptions = [
    `Proudly serving the neighborhood. Stop in this week and see what everyone's talking about — no appointment needed.`,
    `Real people, real service, right around the corner. Visit ${name} today or reach out for details.`,
    `Support local and get treated like a regular from day one. We're ${radiusMiles <= 5 ? "just minutes" : "a short drive"} away.`,
  ];

  const summary =
    `People within ${radiusMiles} miles who match: ` +
    `"${intentText.trim().slice(0, 160)}${intentText.trim().length > 160 ? "…" : ""}"`;

  // Rough, honest range: local CPMs put ~35–60 impressions per dollar.
  const estMonthlyReach: [number, number] = [budget * 35, budget * 60];

  const adCopy = {
    headlines,
    descriptions,
    callToAction: opts.goal ? GOAL_MOCK_CTA[opts.goal] : "Learn More",
  };
  const targeting = {
    radiusMiles,
    audienceSummary: summary,
    // e.g. "Parents with young children nearby" / "Nearby bakery & café customers"
    audienceLabel: matchedHint
      ? `${matchedHint.meta} nearby`.slice(0, 48)
      : `Nearby ${vertical.noun} customers`.slice(0, 48),
    googleKeywords: vertical.keywords,
    metaInterests: metaInterests.slice(0, 6),
    redditInterests: redditInterests.slice(0, 6),
  };

  let pmax = buildPmaxFromBasics(adCopy, targeting, name);
  if (opts.paidForBy?.trim()) pmax = ensurePaidForBy(pmax, opts.paidForBy.trim());

  return withPoliticalTerms(
    {
      engine: "builtin",
      adCopy: withDisclaimer(adCopy, opts.paidForBy),
      targeting,
      estMonthlyReach,
      pmax,
    },
    intentText,
    opts
  );
}

/**
 * Owen's rule, guaranteed in code: political campaigns always get the
 * candidate/committee name as a search term, plus name + district when a
 * district number appears anywhere in the input. The prompt asks the AI to
 * do this too — this makes it a certainty, whichever engine wrote the plan.
 */
function withPoliticalTerms(
  plan: CampaignPlan,
  intentText: string,
  opts: PlanOptions
): CampaignPlan {
  const political = opts.category === "Political Campaign" || Boolean(opts.paidForBy?.trim());
  const name = opts.businessName?.trim();
  if (!political || !name || !plan.pmax) return plan;

  const districtMatch = intentText.match(/district\s*#?\s*(\d+)/i);
  const wardMatch = intentText.match(/ward\s*#?\s*(\d+)/i);
  const extras = [
    name,
    ...(districtMatch ? [`${name} district ${districtMatch[1]}`] : []),
    ...(wardMatch ? [`${name} ward ${wardMatch[1]}`] : []),
  ];

  const addMissing = (list: string[], additions: string[], max: number): string[] => {
    const out = [...list];
    for (const term of additions) {
      if (!out.some((t) => t.toLowerCase() === term.toLowerCase())) {
        if (out.length >= max) out.pop(); // make room — these terms are non-negotiable
        out.unshift(term);
      }
    }
    return out;
  };

  return {
    ...plan,
    targeting: {
      ...plan.targeting,
      googleKeywords: addMissing(plan.targeting.googleKeywords, extras, 8),
    },
    pmax: {
      ...plan.pmax,
      searchThemes: addMissing(plan.pmax.searchThemes, extras, 12),
    },
  };
}

/** Appends the political "Paid for by" line to the ad copy when it's missing. */
function withDisclaimer(
  adCopy: CampaignPlan["adCopy"],
  paidForBy?: string
): CampaignPlan["adCopy"] {
  const line = paidForBy?.trim();
  if (!line) return adCopy;
  if (adCopy.descriptions.some((d) => /paid for by/i.test(d))) return adCopy;
  return {
    ...adCopy,
    descriptions: [
      ...adCopy.descriptions,
      `Paid for by ${line.replace(/^paid for by\s*/i, "")}`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Real AI (Anthropic Claude)
// ---------------------------------------------------------------------------

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
// Generous on purpose: a slow reply that arrives beats a silent fallback to
// the backup writer. Routes that call this run with maxDuration 60.
const ANTHROPIC_TIMEOUT_MS = 50_000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** One message to Claude, plain text back. Throws on any failure. */
async function askClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Empty model reply");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Pulls the first {...} JSON object out of a model reply (fences tolerated). */
function parseJsonBlock(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model reply");
  return JSON.parse(text.slice(start, end + 1));
}

function stringList(value: unknown, min: number, max: number, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} missing`);
  const out = value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
  if (out.length < min) throw new Error(`${label} has too few entries`);
  return out;
}

const PLAN_SYSTEM_PROMPT = `You are the campaign planner inside a local-advertising product for small business owners.
Given a plain-English description of a business and its customers, a monthly budget (USD), and a radius (miles), design one hyper-local ad campaign.

Respond with ONLY a valid JSON object — no markdown fences, no commentary — in exactly this shape, writing the fields IN THIS ORDER:
{
  "audienceProfile": "WRITE THIS FIRST — 4-6 sentences expanding the owner's short description into a vivid, specific picture of the target customer: who they are (age range, life situation, values), what problem or desire pushes them to act, the exact MOMENTS they would turn to Google (what just happened in their life or day), and the natural words they'd use. Every keyword, theme, and line of copy below must be derived from this profile.",
  "adCopy": {
    "headlines": [4 short ad headlines, each under 60 characters, warm and specific to THIS business — never generic filler],
    "descriptions": [3 ad descriptions, each 1-2 sentences, plain neighborly English, no hype words],
    "callToAction": one of "Learn More" | "Get Offer" | "Book Now" | "Call Now" | "Visit Us" | "Order Online"
  },
  "targeting": {
    "radiusMiles": the radius you were given (number),
    "audienceSummary": one sentence describing exactly who the ads will reach and why,
    "audienceLabel": 3-5 plain words naming the target demographic (e.g. "eco-minded local moms") — becomes the campaign's short name,
    "googleKeywords": [6-8 searches THIS audience would actually type in the moments described in the profile. Mix three kinds: local intent ("emergency plumber springfield", "... near me"), problem phrases in the customer's own words ("water heater making noise", "dress for outdoor wedding"), and comparison/decision phrases ("best rated ...", "... prices"). BANNED: generic filler like "shops near me", "local business", "stores open now"],
    "metaInterests": [4-6 real Facebook/Instagram interest categories],
    "redditInterests": [3-5 subreddits formatted like "r/Coffee"; include "Local city subreddit" as one entry]
  },
  "estMonthlyReach": [low, high] — estimated monthly ad impressions for this budget, assuming roughly 35-60 impressions per dollar in local markets,
  "pmax": {
    "searchThemes": [10-12 themes built with the SEARCH TERM FORMULA below],
    "productTerms": [4-8 short terms for exactly what is being sold or offered],
    "uniqueSellingPoints": [3-5 selling points, each under 60 characters, drawn from what makes THIS business special],
    "headlines": [13-15 headlines built with the HEADLINE FORMULA below, EACH 30 CHARACTERS OR FEWER — count characters carefully, this is a hard platform limit],
    "longHeadlines": [5 long headlines built with the LONG HEADLINE FORMULA below, each a COMPLETE sentence under 90 characters],
    "descriptions": [5 ad descriptions, each under 90 characters],
    "businessNameShort": the business name in 25 characters or fewer
  }
}

HEADLINE FORMULA — build the 13-15 headlines as a deliberate portfolio, roughly:
- 2 brand: the business name, and name + what it is ("Hartley Plumbing Co", "Hartley — Local Plumbers")
- 3 benefit: the outcome the profile says they want, stated plainly ("Hot Water Back By Tonight")
- 2 problem callouts in the customer's own words ("Drain Backing Up Again?")
- 2 local trust: place + credibility ("Springfield's Go-To Plumber")
- 2 action/next-step tied to the campaign goal ("Call For Same-Day Help")
- 2 proof/identity pulled from real facts in the input ("Family-Run Since 2009")
- 2 wildcards that only make sense for THIS business — the ones a template could never write
Vary first words (no two headlines start with the same word), vary lengths (some 15-20 chars, some 26-30), and write like a sharp local — not like ad-speak.

LONG HEADLINE FORMULA — 5 complete sentences, one each:
1. Benefit + what makes them different: "Get X without Y, from the only Z in town that ..."
2. Local trust: who in the area already relies on them and why
3. Problem → relief: name the frustration, then the fix
4. What actually happens when you click/visit/call — set the expectation
5. Identity: "For people who ..." — let the right customer recognize themselves
NEVER truncate a sentence to fit — write a SHORTER complete sentence instead. Never start with "People within X miles".

SEARCH TERM FORMULA — for googleKeywords AND searchThemes, build tiers:
- urgent/problem tier: what they type when it's going wrong right now
- service+place tier: the service with the town/neighborhood/zip area from the input
- comparison tier: "best", "reviews", "cost/prices" versions
- outcome tier: the thing they really want, not the product name
- brand tier: the business name itself (people who heard of them will search it)
POLITICAL CAMPAIGNS (category or disclaimer says so): the candidate's NAME is always one search term and one theme; the name + district/office ("jane smith district 7", "jane smith city council") is always another; add issue-based terms voters in that race would search.

HARD RULES:
- NEVER invent facts: no discounts, prices, years in business, awards, "licensed", "#1", or claims that are not in the input. If the input gives none, lean on location, service, and tone instead.
- The "pmax" block is the Google Performance Max asset group — respect every character limit exactly; assets over the limit get truncated and read badly.
- Google's ad policy REJECTS assets containing quotation marks, repeated punctuation (!!, ??, ...), or gimmicky symbols — never use them in any pmax field.
- A keyword or theme is only good if you can point at the sentence in audienceProfile that produced it. Never pad lists with generic terms to hit a count.
- Ground everything in the actual business described. If a business name appears, weave it into headlines naturally.
- If the request mentions a required "Paid for by ..." political disclaimer, one pmax description and one adCopy description must end with that exact line.`;

/** Validates and tidies whatever the model returned into a strict CampaignPlan. */
function coercePlan(raw: unknown, budget: number, radiusMiles: number): CampaignPlan {
  const obj = raw as {
    audienceProfile?: unknown;
    adCopy?: { headlines?: unknown; descriptions?: unknown; callToAction?: unknown };
    targeting?: {
      audienceSummary?: unknown;
      audienceLabel?: unknown;
      googleKeywords?: unknown;
      metaInterests?: unknown;
      redditInterests?: unknown;
    };
    estMonthlyReach?: unknown;
    pmax?: unknown;
  };

  const headlines = stringList(obj.adCopy?.headlines, 2, 5, "headlines").map((h) => h.slice(0, 90));
  const descriptions = stringList(obj.adCopy?.descriptions, 2, 4, "descriptions").map((d) => d.slice(0, 300));
  const callToAction =
    typeof obj.adCopy?.callToAction === "string" && obj.adCopy.callToAction.trim()
      ? obj.adCopy.callToAction.trim().slice(0, 30)
      : "Learn More";

  const audienceSummary =
    typeof obj.targeting?.audienceSummary === "string" && obj.targeting.audienceSummary.trim()
      ? obj.targeting.audienceSummary.trim().slice(0, 300)
      : (() => {
          throw new Error("audienceSummary missing");
        })();

  let estMonthlyReach: [number, number] = [budget * 35, budget * 60];
  if (
    Array.isArray(obj.estMonthlyReach) &&
    obj.estMonthlyReach.length === 2 &&
    obj.estMonthlyReach.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
  ) {
    const [a, b] = obj.estMonthlyReach as [number, number];
    estMonthlyReach = [Math.round(Math.min(a, b)), Math.round(Math.max(a, b))];
  }

  return {
    ...(typeof obj.audienceProfile === "string" && obj.audienceProfile.trim()
      ? { audienceProfile: obj.audienceProfile.trim().slice(0, 1500) }
      : {}),
    adCopy: { headlines, descriptions, callToAction },
    targeting: {
      radiusMiles,
      audienceSummary,
      ...(typeof obj.targeting?.audienceLabel === "string" && obj.targeting.audienceLabel.trim()
        ? { audienceLabel: obj.targeting.audienceLabel.trim().slice(0, 48) }
        : {}),
      googleKeywords: stringList(obj.targeting?.googleKeywords, 3, 8, "googleKeywords"),
      metaInterests: stringList(obj.targeting?.metaInterests, 3, 8, "metaInterests"),
      redditInterests: stringList(obj.targeting?.redditInterests, 2, 8, "redditInterests"),
    },
    estMonthlyReach,
    // Lenient on purpose: a malformed pmax block never sinks the whole plan —
    // generateCampaignPlan backfills it from the classic copy below.
    pmax: sanitizePmax(obj.pmax) ?? undefined,
  };
}

/**
 * The public planner. Claude when configured; the built-in planner otherwise
 * — and as the safety net on any API hiccup, so launch day can't break.
 */
export async function generateCampaignPlan(
  intentText: string,
  budget: number,
  radiusMiles: number,
  opts: PlanOptions = {}
): Promise<CampaignPlan> {
  if (!isAiConfigured()) {
    return generateMockPlan(intentText, budget, radiusMiles, opts);
  }
  try {
    const contextLines = [
      `Business & customers: ${intentText}`,
      `Monthly budget: $${budget}`,
      `Radius: ${radiusMiles} miles`,
      ...(opts.businessName ? [`Business name: ${opts.businessName}`] : []),
      ...(opts.category ? [`Business category: ${opts.category}`] : []),
      ...(opts.goal ? [`Campaign goal: ${GOAL_DESCRIPTIONS[opts.goal]}`] : []),
      ...(opts.paidForBy?.trim()
        ? [
            `This is a POLITICAL campaign. Required disclaimer that must appear: "Paid for by ${opts.paidForBy.trim()}". Apply the political search-term rules.`,
          ]
        : []),
    ];
    const plan = coercePlan(
      parseJsonBlock(await askClaude(PLAN_SYSTEM_PROMPT, contextLines.join("\n"), 2800)),
      budget,
      radiusMiles
    );
    // The pmax asset group must always exist and always carry the disclaimer.
    let pmax =
      plan.pmax ??
      buildPmaxFromBasics(
        plan.adCopy,
        plan.targeting,
        opts.businessName?.trim() || pickBusinessName(intentText)
      );
    if (opts.paidForBy?.trim()) pmax = ensurePaidForBy(pmax, opts.paidForBy.trim());
    return withPoliticalTerms(
      { ...plan, engine: "claude", adCopy: withDisclaimer(plan.adCopy, opts.paidForBy), pmax },
      intentText,
      opts
    );
  } catch (err) {
    console.warn(
      "[ai] Claude call failed — using built-in planner:",
      err instanceof Error ? err.message : err
    );
    return generateMockPlan(intentText, budget, radiusMiles, opts);
  }
}

// ---------------------------------------------------------------------------
// Tagline writer for the AI visual generator (/api/creative)
// ---------------------------------------------------------------------------

function promptAsHeadline(prompt: string): string {
  const s = prompt.trim().replace(/\s+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Short headline + subline for a generated ad graphic. Never throws. */
export async function generateAdTagline(
  prompt: string,
  businessName?: string
): Promise<{ headline: string; subline: string }> {
  const fallback = {
    headline: (businessName?.trim() || promptAsHeadline(prompt)).slice(0, 48),
    subline: businessName
      ? promptAsHeadline(prompt).slice(0, 90)
      : "Locally owned — right around the corner",
  };
  if (!isAiConfigured()) return fallback;
  try {
    const reply = await askClaude(
      `You write on-image ad text for local businesses. Respond with ONLY valid JSON: {"headline": string (max 40 chars, punchy, no quotes inside), "subline": string (max 80 chars, warm and concrete)}. No markdown.`,
      `Business: ${businessName ?? "a local business"}\nAd visual concept: ${prompt}`,
      200
    );
    const raw = parseJsonBlock(reply) as { headline?: unknown; subline?: unknown };
    const headline = typeof raw.headline === "string" && raw.headline.trim() ? raw.headline.trim().slice(0, 48) : fallback.headline;
    const subline = typeof raw.subline === "string" && raw.subline.trim() ? raw.subline.trim().slice(0, 90) : fallback.subline;
    return { headline, subline };
  } catch {
    return fallback;
  }
}
