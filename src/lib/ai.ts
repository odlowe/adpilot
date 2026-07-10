/**
 * The campaign planner ("your agent").
 *
 * Two engines share the same contract (`CampaignPlan`):
 *   1. Claude (real AI) — used automatically when ANTHROPIC_API_KEY is set.
 *   2. A deterministic built-in planner (regex vertical matching) — used with
 *      no key, and as the safety net if the API call ever fails mid-demo,
 *      so campaign creation can never break.
 */
import type { CampaignPlan } from "./types";

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

async function generateMockPlan(
  intentText: string,
  budget: number,
  radiusMiles: number
): Promise<CampaignPlan> {
  const vertical = VERTICALS.find((v) => v.match.test(intentText)) ?? GENERIC;
  const name = pickBusinessName(intentText);

  const metaInterests = [...vertical.metaInterests];
  const redditInterests = [...vertical.redditInterests];
  for (const hint of AUDIENCE_HINTS) {
    if (hint.match.test(intentText)) {
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

  return {
    adCopy: {
      headlines,
      descriptions,
      callToAction: "Learn More",
    },
    targeting: {
      radiusMiles,
      audienceSummary: summary,
      googleKeywords: vertical.keywords,
      metaInterests: metaInterests.slice(0, 6),
      redditInterests: redditInterests.slice(0, 6),
    },
    estMonthlyReach,
  };
}

// ---------------------------------------------------------------------------
// Real AI (Anthropic Claude)
// ---------------------------------------------------------------------------

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const ANTHROPIC_TIMEOUT_MS = 25_000;

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

Respond with ONLY a valid JSON object — no markdown fences, no commentary — in exactly this shape:
{
  "adCopy": {
    "headlines": [4 short ad headlines, each under 60 characters, warm and specific to THIS business — never generic filler],
    "descriptions": [3 ad descriptions, each 1-2 sentences, plain neighborly English, no hype words],
    "callToAction": one of "Learn More" | "Get Offer" | "Book Now" | "Call Now" | "Visit Us" | "Order Online"
  },
  "targeting": {
    "radiusMiles": the radius you were given (number),
    "audienceSummary": one sentence describing exactly who the ads will reach and why,
    "googleKeywords": [4-6 search phrases real locals would type, mostly "... near me" style],
    "metaInterests": [4-6 real Facebook/Instagram interest categories],
    "redditInterests": [3-5 subreddits formatted like "r/Coffee"; include "Local city subreddit" as one entry]
  },
  "estMonthlyReach": [low, high] — estimated monthly ad impressions for this budget, assuming roughly 35-60 impressions per dollar in local markets
}

Ground everything in the actual business described. If a business name appears, weave it into headlines naturally.`;

/** Validates and tidies whatever the model returned into a strict CampaignPlan. */
function coercePlan(raw: unknown, budget: number, radiusMiles: number): CampaignPlan {
  const obj = raw as {
    adCopy?: { headlines?: unknown; descriptions?: unknown; callToAction?: unknown };
    targeting?: {
      audienceSummary?: unknown;
      googleKeywords?: unknown;
      metaInterests?: unknown;
      redditInterests?: unknown;
    };
    estMonthlyReach?: unknown;
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
    adCopy: { headlines, descriptions, callToAction },
    targeting: {
      radiusMiles,
      audienceSummary,
      googleKeywords: stringList(obj.targeting?.googleKeywords, 3, 8, "googleKeywords"),
      metaInterests: stringList(obj.targeting?.metaInterests, 3, 8, "metaInterests"),
      redditInterests: stringList(obj.targeting?.redditInterests, 2, 8, "redditInterests"),
    },
    estMonthlyReach,
  };
}

/**
 * The public planner. Claude when configured; the built-in planner otherwise
 * — and as the safety net on any API hiccup, so launch day can't break.
 */
export async function generateCampaignPlan(
  intentText: string,
  budget: number,
  radiusMiles: number
): Promise<CampaignPlan> {
  if (!isAiConfigured()) {
    return generateMockPlan(intentText, budget, radiusMiles);
  }
  try {
    const reply = await askClaude(
      PLAN_SYSTEM_PROMPT,
      `Business & customers: ${intentText}\nMonthly budget: $${budget}\nRadius: ${radiusMiles} miles`,
      1200
    );
    return coercePlan(parseJsonBlock(reply), budget, radiusMiles);
  } catch (err) {
    console.warn(
      "[ai] Claude call failed — using built-in planner:",
      err instanceof Error ? err.message : err
    );
    return generateMockPlan(intentText, budget, radiusMiles);
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
