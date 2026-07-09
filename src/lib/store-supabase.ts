/**
 * Supabase (Postgres) storage backend — used automatically when
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set. All queries run
 * server-side with the service-role key; row-level security stays enabled
 * so the database is closed to everyone else.
 */
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSampleCampaigns } from "./samples";
import { DEFAULT_EMAIL_PREFS } from "./types";
import type {
  AdCopy,
  BillingInfo,
  Business,
  BusinessCategory,
  Campaign,
  CampaignStatus,
  EmailPrefs,
  Platform,
  PlatformSplit,
  PlatformStatus,
  Targeting,
  User,
} from "./types";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// ---- row shapes & mappers ---------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  birthdate: string | null;
  billing_json: BillingInfo | null;
  email_prefs: EmailPrefs | null;
  failed_logins: number | null;
  locked_until: string | null;
  created_at: string;
}

interface BusinessRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
}

interface CampaignRow {
  id: string;
  user_id: string;
  business_id: string;
  name: string;
  budget: number;
  zip: string;
  duration_months: number;
  continuous: boolean;
  manual_mode: boolean;
  platform_split: PlatformSplit;
  site_categories: string[];
  custom_sites: string[];
  creative_url: string | null;
  industry_text: string;
  targeting_json: Targeting;
  ad_copy_json: AdCopy;
  platform_statuses: Record<Platform, PlatformStatus>;
  status: CampaignStatus;
  start_date: string;
  end_date: string | null;
  is_sample: boolean;
  created_at: string;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  passwordHash: r.password_hash,
  fullName: r.full_name,
  birthdate: r.birthdate,
  billingJson: r.billing_json,
  emailPrefs: r.email_prefs ?? { ...DEFAULT_EMAIL_PREFS },
  failedLogins: r.failed_logins ?? 0,
  lockedUntil: r.locked_until,
  createdAt: r.created_at,
});

const toBusiness = (r: BusinessRow): Business => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  category: r.category as BusinessCategory,
  description: r.description ?? "",
  address: r.address ?? "",
  phone: r.phone ?? "",
  website: r.website ?? "",
  createdAt: r.created_at,
});

const toCampaign = (r: CampaignRow): Campaign => ({
  id: r.id,
  userId: r.user_id,
  businessId: r.business_id,
  name: r.name,
  budget: r.budget,
  zip: r.zip,
  durationMonths: r.duration_months,
  continuous: r.continuous,
  manualMode: r.manual_mode,
  platformSplit: r.platform_split,
  siteCategories: r.site_categories ?? [],
  customSites: r.custom_sites ?? [],
  creativeUrl: r.creative_url,
  industryText: r.industry_text,
  targetingJson: r.targeting_json,
  adCopyJson: r.ad_copy_json,
  platformStatuses: r.platform_statuses,
  status: r.status,
  startDate: r.start_date,
  endDate: r.end_date,
  isSample: r.is_sample,
  createdAt: r.created_at,
});

const campaignToRow = (c: Omit<Campaign, "id" | "createdAt"> & { createdAt?: string }) => ({
  user_id: c.userId,
  business_id: c.businessId,
  name: c.name,
  budget: c.budget,
  zip: c.zip,
  duration_months: c.durationMonths,
  continuous: c.continuous,
  manual_mode: c.manualMode,
  platform_split: c.platformSplit,
  site_categories: c.siteCategories,
  custom_sites: c.customSites,
  creative_url: c.creativeUrl,
  industry_text: c.industryText,
  targeting_json: c.targetingJson,
  ad_copy_json: c.adCopyJson,
  platform_statuses: c.platformStatuses,
  status: c.status,
  start_date: c.startDate,
  end_date: c.endDate,
  is_sample: c.isSample,
  ...(c.createdAt ? { created_at: c.createdAt } : {}),
});

function fail(context: string, message: string): never {
  throw new Error(`[db:${context}] ${message}`);
}

// ---- users ------------------------------------------------------------------

export async function createUser(
  data: Pick<User, "email" | "passwordHash" | "fullName">
): Promise<User> {
  const { data: row, error } = await db()
    .from("users")
    .insert({
      email: data.email.toLowerCase().trim(),
      password_hash: data.passwordHash,
      full_name: data.fullName.trim(),
    })
    .select("*")
    .single();
  if (error || !row) fail("createUser", error?.message ?? "no row returned");
  return toUser(row as UserRow);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data: row, error } = await db()
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) fail("findUserByEmail", error.message);
  return row ? toUser(row as UserRow) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data: row, error } = await db().from("users").select("*").eq("id", id).maybeSingle();
  if (error) fail("getUserById", error.message);
  return row ? toUser(row as UserRow) : null;
}

export async function listUsers(): Promise<User[]> {
  const { data: rows, error } = await db().from("users").select("*");
  if (error) fail("listUsers", error.message);
  return ((rows ?? []) as UserRow[]).map(toUser);
}

/** Records a wrong password; 3 in a row locks the account for 10 minutes. */
export async function recordLoginFailure(
  id: string
): Promise<{ locked: boolean; lockedUntil: string | null }> {
  const user = await getUserById(id);
  if (!user) return { locked: false, lockedUntil: null };
  const failures = (user.failedLogins ?? 0) + 1;
  if (failures >= 3) {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db().from("users").update({ failed_logins: 0, locked_until: lockedUntil }).eq("id", id);
    return { locked: true, lockedUntil };
  }
  await db().from("users").update({ failed_logins: failures }).eq("id", id);
  return { locked: false, lockedUntil: null };
}

export async function clearLoginFailures(id: string): Promise<void> {
  await db().from("users").update({ failed_logins: 0, locked_until: null }).eq("id", id);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "fullName" | "email" | "birthdate" | "billingJson" | "emailPrefs" | "passwordHash">>
): Promise<User | null> {
  const rowPatch: Record<string, unknown> = {};
  if (patch.fullName !== undefined) rowPatch.full_name = patch.fullName;
  if (patch.email !== undefined) rowPatch.email = patch.email.toLowerCase().trim();
  if (patch.birthdate !== undefined) rowPatch.birthdate = patch.birthdate;
  if (patch.billingJson !== undefined) rowPatch.billing_json = patch.billingJson;
  if (patch.emailPrefs !== undefined) rowPatch.email_prefs = patch.emailPrefs;
  if (patch.passwordHash !== undefined) rowPatch.password_hash = patch.passwordHash;

  const { data: row, error } = await db()
    .from("users")
    .update(rowPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) fail("updateUser", error.message);
  return row ? toUser(row as UserRow) : null;
}

// ---- businesses --------------------------------------------------------------

export async function createBusiness(
  data: Pick<Business, "userId" | "name" | "category">
): Promise<Business> {
  const { data: row, error } = await db()
    .from("businesses")
    .insert({
      user_id: data.userId,
      name: data.name.trim() || "My Business",
      category: data.category,
    })
    .select("*")
    .single();
  if (error || !row) fail("createBusiness", error?.message ?? "no row returned");
  const business = toBusiness(row as BusinessRow);

  const samples = await buildSampleCampaigns(business);
  const { error: seedError } = await db()
    .from("campaigns")
    .insert(samples.map((s) => campaignToRow(s)));
  if (seedError) fail("seedSampleCampaigns", seedError.message);

  return business;
}

export async function updateBusiness(
  id: string,
  userId: string,
  patch: Partial<Pick<Business, "name" | "category" | "description" | "address" | "phone" | "website">>
): Promise<Business | null> {
  const { data: row, error } = await db()
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) fail("updateBusiness", error.message);
  return row ? toBusiness(row as BusinessRow) : null;
}

export async function deleteBusiness(id: string, userId: string): Promise<boolean> {
  const { data: rows, error } = await db()
    .from("businesses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) fail("deleteBusiness", error.message);
  return (rows ?? []).length > 0;
}

export async function listBusinessesByUser(userId: string): Promise<Business[]> {
  const { data: rows, error } = await db()
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) fail("listBusinessesByUser", error.message);
  return ((rows ?? []) as BusinessRow[]).map(toBusiness);
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const { data: row, error } = await db().from("businesses").select("*").eq("id", id).maybeSingle();
  if (error) fail("getBusinessById", error.message);
  return row ? toBusiness(row as BusinessRow) : null;
}

// ---- campaigns ----------------------------------------------------------------

export async function createCampaign(
  data: Omit<Campaign, "id" | "createdAt">
): Promise<Campaign> {
  const { data: row, error } = await db()
    .from("campaigns")
    .insert(campaignToRow(data))
    .select("*")
    .single();
  if (error || !row) fail("createCampaign", error?.message ?? "no row returned");
  return toCampaign(row as CampaignRow);
}

export async function listCampaignsByUser(userId: string): Promise<Campaign[]> {
  const { data: rows, error } = await db()
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) fail("listCampaignsByUser", error.message);
  return ((rows ?? []) as CampaignRow[]).map(toCampaign);
}

export async function updateCampaign(
  id: string,
  userId: string,
  patch: Partial<Pick<Campaign, "name" | "budget" | "zip" | "durationMonths" | "continuous">>
): Promise<Campaign | null> {
  const rowPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) rowPatch.name = patch.name;
  if (patch.budget !== undefined) rowPatch.budget = patch.budget;
  if (patch.zip !== undefined) rowPatch.zip = patch.zip;
  if (patch.durationMonths !== undefined) rowPatch.duration_months = patch.durationMonths;
  if (patch.continuous !== undefined) rowPatch.continuous = patch.continuous;

  const { data: row, error } = await db()
    .from("campaigns")
    .update(rowPatch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) fail("updateCampaign", error.message);
  return row ? toCampaign(row as CampaignRow) : null;
}

export async function updateCampaignStatus(
  id: string,
  userId: string,
  status: CampaignStatus
): Promise<Campaign | null> {
  const platformStatuses =
    status === "active"
      ? { google: "live", meta: "live", reddit: "live" }
      : { google: "paused", meta: "paused", reddit: "paused" };
  const rowPatch: Record<string, unknown> = { status, platform_statuses: platformStatuses };
  if (status === "completed") rowPatch.end_date = new Date().toISOString();

  const { data: row, error } = await db()
    .from("campaigns")
    .update(rowPatch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) fail("updateCampaignStatus", error.message);
  return row ? toCampaign(row as CampaignRow) : null;
}

// ---- password reset ----------------------------------------------------------

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const token = randomUUID().replace(/-/g, "");
  const { error } = await db().from("password_resets").insert({
    token,
    user_id: user.id,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  if (error) fail("createPasswordResetToken", error.message);
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const { data: row, error } = await db()
    .from("password_resets")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) fail("consumePasswordResetToken", error.message);
  if (!row) return null;
  await db().from("password_resets").delete().eq("token", token);
  const entry = row as { user_id: string; expires_at: string };
  if (new Date(entry.expires_at).getTime() < Date.now()) return null;
  return entry.user_id;
}

// ---- account deletion ----------------------------------------------------------

export async function deleteUser(id: string): Promise<void> {
  // businesses, campaigns, and reset tokens cascade via foreign keys
  const { error } = await db().from("users").delete().eq("id", id);
  if (error) fail("deleteUser", error.message);
}
