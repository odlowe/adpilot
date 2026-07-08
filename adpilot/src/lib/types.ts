export type Platform = "google" | "meta" | "reddit";

export type PlatformStatus = "draft" | "in_review" | "live" | "paused";

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

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  businessName: string | null;
  industry: string | null;
  createdAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface Campaign {
  id: string;
  userId: string;
  budget: number;
  industryText: string;
  targetingJson: Targeting;
  adCopyJson: AdCopy;
  platformStatuses: Record<Platform, PlatformStatus>;
  createdAt: string;
}
