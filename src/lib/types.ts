export type Platform = "google" | "meta" | "reddit";

export type PlatformStatus = "draft" | "in_review" | "live" | "paused";

export type CampaignStatus = "active" | "completed";

export type BusinessCategory =
  | "Home Services"
  | "Retail/Boutique"
  | "Fitness/Gym"
  | "Professional Services"
  | "Other";

export interface AdCopy {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
}

export interface Targeting {
  radiusMiles: number;
  audienceSummary: string;
  googleKeywords: string[];
  metaInterests: string[];
  redditInterests: string[];
}

export interface CampaignPlan {
  adCopy: AdCopy;
  targeting: Targeting;
  estMonthlyReach: [number, number];
}

export interface BillingInfo {
  nameOnCard: string;
  cardLast4: string;
  expMonth: number;
  expYear: number;
  billingZip: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  birthdate: string | null; // yyyy-mm-dd
  billingJson: BillingInfo | null;
  createdAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface Business {
  id: string;
  userId: string;
  name: string;
  category: BusinessCategory;
  createdAt: string;
}

/** Percentage of budget per platform; always sums to 100. */
export type PlatformSplit = Record<Platform, number>;

export interface Campaign {
  id: string;
  userId: string;
  businessId: string;
  name: string;
  budget: number;
  zip: string;
  durationMonths: number;
  continuous: boolean;
  /** true when the owner used Manual Mode instead of letting the agent decide */
  manualMode: boolean;
  platformSplit: PlatformSplit;
  siteCategories: string[];
  customSites: string[];
  industryText: string;
  targetingJson: Targeting;
  adCopyJson: AdCopy;
  platformStatuses: Record<Platform, PlatformStatus>;
  status: CampaignStatus;
  startDate: string;
  endDate: string | null;
  isSample: boolean;
  createdAt: string;
}

/** Serializable draft handed from the landing-page configurator to the dashboard. */
export interface CampaignDraft {
  intentText: string;
  budget: number;
  radiusMiles: number;
  zip: string;
  durationMonths: number;
  continuous: boolean;
}
