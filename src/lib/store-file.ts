/**
 * Local storage backend: an in-memory store flushed to `.data/store.json`.
 * Used automatically when Supabase isn't configured — zero setup for local dev.
 */
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { buildSampleCampaigns } from "./samples";
import { DEFAULT_EMAIL_PREFS } from "./types";
import type { Business, Campaign, CampaignStatus, User } from "./types";

interface ResetToken {
  token: string;
  userId: string;
  expiresAt: string;
}

interface Store {
  users: Map<string, User>;
  businesses: Map<string, Business>;
  campaigns: Map<string, Campaign>;
  resetTokens: Map<string, ResetToken>;
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
        resetTokens: new Map(),
      };
    }
  } catch {
    // Corrupt or unreadable file — start fresh rather than crash.
  }
  return {
    users: new Map(),
    businesses: new Map(),
    campaigns: new Map(),
    resetTokens: new Map(),
  };
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
    birthdate: null,
    billingJson: null,
    stripeCustomerId: null,
    billingActive: false,
    emailPrefs: { ...DEFAULT_EMAIL_PREFS },
    failedLogins: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
  };
  store.users.set(user.id, user);
  persist();
  return user;
}

export async function listUsers(): Promise<User[]> {
  return [...store.users.values()];
}

/** Records a wrong password; 3 in a row locks the account for 10 minutes. */
export async function recordLoginFailure(
  id: string
): Promise<{ locked: boolean; lockedUntil: string | null }> {
  const user = store.users.get(id);
  if (!user) return { locked: false, lockedUntil: null };
  const failures = (user.failedLogins ?? 0) + 1;
  if (failures >= 3) {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    store.users.set(id, { ...user, failedLogins: 0, lockedUntil });
    persist();
    return { locked: true, lockedUntil };
  }
  store.users.set(id, { ...user, failedLogins: failures });
  persist();
  return { locked: false, lockedUntil: null };
}

export async function clearLoginFailures(id: string): Promise<void> {
  const user = store.users.get(id);
  if (!user) return;
  store.users.set(id, { ...user, failedLogins: 0, lockedUntil: null });
  persist();
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "fullName" | "email" | "birthdate" | "billingJson" | "emailPrefs" | "passwordHash" | "stripeCustomerId" | "billingActive">>
): Promise<User | null> {
  const user = store.users.get(id);
  if (!user) return null;
  const updated: User = {
    ...user,
    ...patch,
    email: patch.email ? patch.email.toLowerCase().trim() : user.email,
  };
  store.users.set(id, updated);
  persist();
  return updated;
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
    description: "",
    address: "",
    phone: "",
    website: "",
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

export async function updateBusiness(
  id: string,
  userId: string,
  patch: Partial<Pick<Business, "name" | "category" | "description" | "address" | "phone" | "website">>
): Promise<Business | null> {
  const business = store.businesses.get(id);
  if (!business || business.userId !== userId) return null;
  const updated = { ...business, ...patch };
  store.businesses.set(id, updated);
  persist();
  return updated;
}

export async function deleteBusiness(id: string, userId: string): Promise<boolean> {
  const business = store.businesses.get(id);
  if (!business || business.userId !== userId) return false;
  store.businesses.delete(id);
  for (const [campaignId, campaign] of store.campaigns) {
    if (campaign.businessId === id) store.campaigns.delete(campaignId);
  }
  persist();
  return true;
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

export async function updateCampaign(
  id: string,
  userId: string,
  patch: Partial<
    Pick<
      Campaign,
      | "name"
      | "budget"
      | "zip"
      | "durationMonths"
      | "continuous"
      | "manualMode"
      | "platformSplit"
      | "siteCategories"
      | "customSites"
      | "targetingJson"
    >
  >
): Promise<Campaign | null> {
  const campaign = store.campaigns.get(id);
  if (!campaign || campaign.userId !== userId) return null;
  const updated = { ...campaign, ...patch };
  store.campaigns.set(id, updated);
  persist();
  return updated;
}

export async function updateCampaignStatus(
  id: string,
  userId: string,
  status: CampaignStatus
): Promise<Campaign | null> {
  const campaign = store.campaigns.get(id);
  if (!campaign || campaign.userId !== userId) return null;
  const updated: Campaign = {
    ...campaign,
    status,
    endDate: status === "completed" ? new Date().toISOString() : campaign.endDate,
    platformStatuses:
      status === "active"
        ? { google: "live", meta: "live", reddit: "live" }
        : { google: "paused", meta: "paused", reddit: "paused" },
  };
  store.campaigns.set(id, updated);
  persist();
  return updated;
}

// ---- password reset ---------------------------------------------------------

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const token = randomUUID().replace(/-/g, "");
  store.resetTokens.set(token, {
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
  });
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const entry = store.resetTokens.get(token);
  if (!entry) return null;
  store.resetTokens.delete(token);
  if (new Date(entry.expiresAt).getTime() < Date.now()) return null;
  return entry.userId;
}

// ---- account deletion ---------------------------------------------------------

export async function deleteUser(id: string): Promise<void> {
  store.users.delete(id);
  for (const [bizId, biz] of store.businesses) {
    if (biz.userId === id) store.businesses.delete(bizId);
  }
  for (const [campaignId, campaign] of store.campaigns) {
    if (campaign.userId === id) store.campaigns.delete(campaignId);
  }
  for (const [token, entry] of store.resetTokens) {
    if (entry.userId === id) store.resetTokens.delete(token);
  }
  persist();
}
