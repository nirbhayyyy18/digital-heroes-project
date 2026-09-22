import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = [
  "subscriber",
  "admin",
] as const;

const SUBSCRIPTION_STATUSES = [
  "inactive",
  "active",
  "cancelled",
  "lapsed",
] as const;

const SUBSCRIPTION_PLANS = [
  "monthly",
  "yearly",
] as const;

async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Unauthorized",
      status: 401 as const,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      error: "Forbidden",
      status: 403 as const,
    };
  }

  return { user };
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { id: string };
  }
) {
  const auth = await requireAdmin();

  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const userId = params.id;
  const body = await request.json();

  const admin = createAdminClient();

  /* --------------------------------
     PROFILE + SUBSCRIPTION
  -------------------------------- */

  if (body.action === "profile") {
    const fullName = String(
      body.full_name ?? ""
    ).trim();

    const role = String(
      body.role ?? "subscriber"
    );

    const subscriptionStatus = String(
      body.subscription_status ??
        "inactive"
    );

    const subscriptionPlan =
      body.subscription_plan
        ? String(body.subscription_plan)
        : null;

    const renewalInput =
      body.subscription_renews_at
        ? String(
            body.subscription_renews_at
          )
        : null;

    if (
      !ROLES.includes(
        role as (typeof ROLES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }

    if (
      !SUBSCRIPTION_STATUSES.includes(
        subscriptionStatus as (typeof SUBSCRIPTION_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subscription status.",
        },
        { status: 400 }
      );
    }

    if (
      subscriptionPlan !== null &&
      !SUBSCRIPTION_PLANS.includes(
        subscriptionPlan as (typeof SUBSCRIPTION_PLANS)[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subscription plan.",
        },
        { status: 400 }
      );
    }

    let renewalDate: string | null =
      null;

    if (renewalInput) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          renewalInput
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid renewal date.",
          },
          { status: 400 }
        );
      }

      renewalDate =
        `${renewalInput}T00:00:00.000Z`;
    }

    const { error } = await admin
      .from("profiles")
      .update({
        full_name:
          fullName || null,

        role,

        subscription_status:
          subscriptionStatus,

        subscription_plan:
          subscriptionPlan,

        subscription_renews_at:
          renewalDate,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath("/admin/users");
    revalidatePath("/dashboard");
    revalidatePath(
      "/dashboard/subscription"
    );

    return NextResponse.json({
      ok: true,
    });
  }

  /* --------------------------------
     EDIT SCORE
  -------------------------------- */

  if (body.action === "score") {
    const scoreId = String(
      body.score_id ?? ""
    );

    const score = Number(
      body.score
    );

    const playedOn = String(
      body.played_on ?? ""
    );

    if (!scoreId) {
      return NextResponse.json(
        {
          error:
            "Missing score id.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(score) ||
      score < 1 ||
      score > 45
    ) {
      return NextResponse.json(
        {
          error:
            "Score must be an integer between 1 and 45.",
        },
        { status: 400 }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        playedOn
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid score date.",
        },
        { status: 400 }
      );
    }

    const {
      data: scoreRow,
      error: scoreLookupError,
    } = await admin
      .from("scores")
      .select("id, user_id")
      .eq("id", scoreId)
      .eq("user_id", userId)
      .single();

    if (
      scoreLookupError ||
      !scoreRow
    ) {
      return NextResponse.json(
        {
          error:
            "Score not found.",
        },
        { status: 404 }
      );
    }

    const { data: duplicate } =
      await admin
        .from("scores")
        .select("id")
        .eq("user_id", userId)
        .eq("played_on", playedOn)
        .neq("id", scoreId)
        .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "This user already has a score for that date.",
        },
        { status: 409 }
      );
    }

    const { error } =
      await admin
        .from("scores")
        .update({
          score,
          played_on: playedOn,
        })
        .eq("id", scoreId)
        .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath("/admin/users");
    revalidatePath(
      "/dashboard/scores"
    );
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
    });
  }

  return NextResponse.json(
    {
      error:
        "Unknown admin user action.",
    },
    { status: 400 }
  );
}

/* --------------------------------
   DELETE USER SCORE
-------------------------------- */

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: { id: string };
  }
) {
  const auth = await requireAdmin();

  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const scoreId =
    new URL(request.url)
      .searchParams
      .get("score_id");

  if (!scoreId) {
    return NextResponse.json(
      {
        error:
          "Missing score id.",
      },
      { status: 400 }
    );
  }

  const admin =
    createAdminClient();

  const { error } =
    await admin
      .from("scores")
      .delete()
      .eq("id", scoreId)
      .eq("user_id", params.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  revalidatePath("/admin/users");
  revalidatePath(
    "/dashboard/scores"
  );
  revalidatePath("/dashboard");

  return NextResponse.json({
    ok: true,
  });
}