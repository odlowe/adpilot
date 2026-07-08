/**
 * The "Smart Helper" — a deterministic mock of the AI campaign planner.
 * Given a plain-English description of the business + customer, a budget,
 * and a radius, it produces the same structured plan a real model would:
 * ad copy, Google keywords, and Meta/Reddit interest buckets.
 *
 * Swap `generateCampaignPlan` for a real model call when ready — the
 * return shape (`CampaignPlan`) is the contract the UI renders.
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

export async function generateCampaignPlan(
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
