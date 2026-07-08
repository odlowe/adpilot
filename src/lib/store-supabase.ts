/**
 * Supabase (Postgres) storage backend — used automatically when
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set. All queries run
 * server-side with the service-role key; row-level security stays enabled
 * so the database is closed to everyone else.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSampleCampaigns } from "./samples";
import type {
  AdCopy,
  Business,
  BusinessCategory,
  Campaign,
  CampaignStatus,
  Platform,
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
  created_at: string;
}

interface BusinessRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
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
  createdAt: r.created_at,
});

const toBusiness = (r: BusinessRow): Business => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  category: r.category as BusinessCategory,
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
