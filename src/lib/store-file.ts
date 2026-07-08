/**
 * Local storage backend: an in-memory store flushed to `.data/store.json`.
 * Used automatically when Supabase isn't configured — zero setup for local dev.
 */
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { buildSampleCampaigns } from "./samples";
import type { Business, Campaign, User } from "./types";

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

export async function createBusiness(
  data: Pick<Business, "userId" | "name" | "category">
): Promise<Business> {
  const business: Business = {
    id: randomUUID(),
    userId: data.userId,
    name: data.name.trim() || "My Business",
    category: data.category,
    createdAt: new Date().toISOString(),
  };
  store.businesses.set(business.id, business);
  for (const sample of await buildSampleCampaigns(business)) {
    const campaign: Campaign = { ...sample, id: randomUUID() };
    store.campaigns.set(campaign.id, campaign);
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
