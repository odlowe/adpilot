/**
 * Data layer.
 *
 * This is an in-memory Postgres-shaped store so the app runs with zero setup.
 * Every function mirrors a single query against the schema in
 * `supabase/schema.sql` — to go to production, swap the bodies for
 * Supabase client calls (or any Postgres driver). Nothing outside this
 * file needs to change.
 */
import { randomUUID } from "crypto";
import type { Campaign, User } from "./types";

interface Store {
  users: Map<string, User>;
  campaigns: Map<string, Campaign>;
}

// Cached on globalThis so data survives hot-reloads in dev.
const globalForDb = globalThis as unknown as { __adpilotStore?: Store };

const store: Store =
  globalForDb.__adpilotStore ??
  (globalForDb.__adpilotStore = {
    users: new Map<string, User>(),
    campaigns: new Map<string, Campaign>(),
  });

// ---- users ----------------------------------------------------------------

export async function createUser(
  data: Pick<User, "email" | "passwordHash">
): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    businessName: null,
    industry: null,
    createdAt: new Date().toISOString(),
  };
  store.users.set(user.id, user);
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

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "businessName" | "industry">>
): Promise<User | null> {
  const user = store.users.get(id);
  if (!user) return null;
  const updated = { ...user, ...patch };
  store.users.set(id, updated);
  return updated;
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
  return campaign;
}

export async function listCampaignsByUser(userId: string): Promise<Campaign[]> {
  return [...store.campaigns.values()]
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
