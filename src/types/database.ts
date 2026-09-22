export type UserRole = "subscriber" | "admin";
export type SubscriptionStatus = "inactive" | "active" | "cancelled" | "lapsed";
export type SubscriptionPlan = "monthly" | "yearly";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan | null;
  subscription_renews_at: string | null;
  charity_id: string | null;
  charity_contribution_pct: number;
  created_at: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  is_spotlight: boolean;
  is_active: boolean;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;
  played_on: string;
  created_at: string;
}

export interface Draw {
  id: string;
  period_month: number;
  period_year: number;
  draw_type: "random" | "algorithmic";
  status: "draft" | "simulated" | "published";
  active_subscriber_count: number;
  total_pool_cents: number;
  pool_5match_cents: number;
  pool_4match_cents: number;
  pool_3match_cents: number;
  rollover_in_cents: number;
  rollover_out_cents: number;
  winning_numbers: number[];
  published_at: string | null;
}

export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  match_tier: 3 | 4 | 5;
  amount_cents: number;
  review_state: "awaiting_proof" | "submitted" | "approved" | "rejected";
  proof_url: string | null;
  payment_state: "pending" | "paid";
  created_at: string;
}
