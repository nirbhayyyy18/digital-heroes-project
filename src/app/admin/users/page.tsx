import { createAdminClient } from "@/lib/supabase/admin";
import AdminUserManager, {
  type AdminUser,
} from "@/components/AdminUserManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = createAdminClient();

  /*
   * Fetch users and their latest scores together.
   *
   * The score relation is limited to the latest 5 scores per user,
   * which matches the application's rolling-score requirement.
   *
   * This avoids:
   *   1. A separate scores query.
   *   2. Loading historical scores that the admin UI does not need.
   *   3. Building a potentially large scoresByUser map on the server.
   */
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      subscription_status,
      subscription_plan,
      subscription_renews_at,
      charity_id,
      charities (
        name
      ),
      scores (
        id,
        score,
        played_on
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <p className="label-tag mb-2">
            Users
          </p>

          <h1 className="font-display text-3xl font-semibold">
            User management
          </h1>
        </div>

        <div className="card">
          <p className="font-medium text-amber">
            Could not load users
          </p>

          <p className="text-mute text-sm mt-2">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  /*
   * Convert the Supabase response into the exact shape
   * expected by AdminUserManager.
   */
  const users: AdminUser[] = (profiles ?? []).map(
    (profile) => {
      const profileScores = Array.isArray(
        profile.scores
      )
        ? [...profile.scores]
            .sort(
              (a, b) =>
                new Date(b.played_on).getTime() -
                new Date(a.played_on).getTime()
            )
            .slice(0, 5)
        : [];

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        subscription_status:
          profile.subscription_status,
        subscription_plan:
          profile.subscription_plan,
        subscription_renews_at:
          profile.subscription_renews_at,
        charity_name:
          Array.isArray(profile.charities)
            ? profile.charities[0]?.name ?? null
            : null,
        scores: profileScores.map(
          (score) => ({
            id: score.id,
            score: score.score,
            played_on: score.played_on,
          })
        ),
      };
    }
  );

  return (
    <div className="space-y-8 fade-in">
      {/* HEADER */}
      <div>
        <p className="label-tag mb-2">
          Users
        </p>

        <h1 className="font-display text-4xl font-semibold tracking-tight">
          User management
        </h1>

        <p className="text-mute text-sm mt-2">
          View and edit user profiles, correct golf
          scores and manage subscription state.
        </p>
      </div>

      {/* USER MANAGEMENT */}
      <AdminUserManager users={users} />
    </div>
  );
}