/**
 * Data layer — a Postgres-shaped store with zero external dependencies.
 *
 * Persistence: every mutation is flushed to `.data/store.json`, so accounts,
 * businesses, and campaigns survive server restarts in local development.
 * (On serverless hosts the filesystem is ephemeral; swap the bodies of these
 * functions for Supabase calls — see supabase/schema.sql — and nothing
 * outside this file changes.)
 */
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { generateCampaignPlan } from "./ai";
import type { Business, BusinessCategory, Campaign, User } from "./types";

interface Store {
  users: Map<string, User>;
  businesses: Map<string, Business>;
  campaigns: Map<string, Campaign>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const globalForDb = globalThis as unknown as { __adpilotStore?: Store };

function loadStore(): Store {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as {
        users?: User[];
        businesses?: Business[];
        campaigns?: Campaign[];
      };
      return {
        users: new Map((raw.users ?? []).map((u) => [u.id, u])),
        businesses: new Map((raw.businesses ?? []).map((b) => [b.id, b])),
        campaigns: new Map((raw.campaigns ?? []).map((c) => [c.id, c])),
      };
    }
  } catch {
    // Corrupt or unreadable file — start fresh rather than crash.
  }
  return { users: new Map(), businesses: new Map(), campaigns: new Map() };
}

const store: Store = globalForDb.__adpilotStore ?? (globalForDb.__adpilotStore = loadStore());

function persist(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          users: [...store.users.values()],
          businesses: [...store.businesses.values()],
          campaigns: [...store.campaigns.values()],
        },
        null,
        2
      )
    );
  } catch {
    // Read-only filesystem (e.g. serverless) — keep working in memory.
  }
}

// ---- users ----------------------------------------------------------------

export async function createUser(
  data: Pick<User, "email" | "passwordHash" | "fullName">
): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    fullName: data.fullName.trim(),
    createdAt: new Date().toISOString(),
  };
  store.users.set(user.id, user);
  persist();
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const needle = email.toLowerCase().trim();
  for (const user of store.users.values()) {
    if (user.email === needle) return user;
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  return store.users.get(id) ?? null;
}

// ---- businesses -----------------------------------------------------------

export async function createBusiness(
  data: Pick<Business, "userId" | "name" | "category">,
  options: { seedSampleData?: boolean } = {}
): Promise<Business> {
  const business: Business = {
    id: randomUUID(),
    userId: data.userId,
    name: data.name.trim() || "My Business",
    category: data.category,
    createdAt: new Date().toISOString(),
  };
  store.businesses.set(business.id, business);
  if (options.seedSampleData !== false) {
    await seedSampleCampaigns(business);
  }
  persist();
  return business;
}

export async function listBusinessesByUser(userId: string): Promise<Business[]> {
  return [...store.businesses.values()]
    .filter((b) => b.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getBusinessById(id: string): Promise<Business | null> {
  return store.businesses.get(id) ?? null;
}

// ---- campaigns ------------------------------------------------------------

export async function createCampaign(
  data: Omit<Campaign, "id" | "createdAt">
): Promise<Campaign> {
  const campaign: Campaign = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.campaigns.set(campaign.id, campaign);
  persist();
  return campaign;
}

export async function listCampaignsByUser(userId: string): Promise<Campaign[]> {
  return [...store.campaigns.values()]
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---- sample data ------------------------------------------------------------

/**
 * Every new business gets believable history — one live sample campaign and
 * two completed ones — so the dashboard demonstrates itself. They're flagged
 * `isSample` and labeled in the UI.
 */
const SAMPLE_INTENTS: Record<BusinessCategory, string> = {
  "Home Services":
    "We do plumbing and small home repairs, want homeowners nearby who need fast, reliable help",
  "Retail/Boutique":
    "A local boutique shop, want to reach shoppers nearby who love unique, quality finds",
  "Fitness/Gym":
    "A neighborhood fitness studio, want to reach locals who want to get in shape with classes",
  "Professional Services":
    "A trusted local firm, want small business owners and families nearby who need expert help",
  Other:
    "A locally owned business, want to reach neighbors nearby who prefer to shop local",
};

async function seedSampleCampaigns(business: Business): Promise<void> {
  const intent = SAMPLE_INTENTS[business.category];
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  const specs = [
    {
      name: `${business.name} — Neighborhood awareness`,
      budget: 600,
      radius: 10,
      durationMonths: 2,
      continuous: false,
      status: "completed" as const,
      start: daysAgo(150),
      end: daysAgo(90),
    },
    {
      name: `${business.name} — Spring promotion`,
      budget: 900,
      radius: 15,
      durationMonths: 1,
      continuous: false,
      status: "completed" as const,
      start: daysAgo(75),
      end: daysAgo(45),
    },
    {
      name: `${business.name} — Always-on local reach`,
      budget: 750,
      radius: 12,
      durationMonths: 1,
      continuous: true,
      status: "active" as const,
      start: daysAgo(12),
      end: null,
    },
  ];

  for (const spec of specs) {
    const plan = await generateCampaignPlan(intent, spec.budget, spec.radius);
    const campaign: Campaign = {
      id: randomUUID(),
      userId: business.userId,
      businessId: business.id,
      name: spec.name,
      budget: spec.budget,
      zip: "",
      durationMonths: spec.durationMonths,
      continuous: spec.continuous,
      industryText: intent,
      targetingJson: plan.targeting,
      adCopyJson: plan.adCopy,
      platformStatuses:
        spec.status === "active"
          ? { google: "live", meta: "live", reddit: "live" }
          : { google: "paused", meta: "paused", reddit: "paused" },
      status: spec.status,
      startDate: spec.start,
      endDate: spec.end,
      isSample: true,
      createdAt: spec.start,
    };
    store.campaigns.set(campaign.id, campaign);
  }
}
