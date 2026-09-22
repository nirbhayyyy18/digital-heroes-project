import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { calculatePoolBreakdown } from "@/lib/draw-engine";
import { numbersFromScores } from "@/lib/utils";

// POST /api/draws/run
//
// Admin-only.
//
// Creates or refreshes a non-published draw for a period:
// 1. Calculates the prize pool from subscription payments.
// 2. Pulls the previous period's 5-match jackpot rollover.
// 3. Builds draw entries for active subscribers from their latest 5 scores.
//
// IMPORTANT:
// A published draw can never be reset back to draft.
export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: caller, error: callerError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerError || caller?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const month = Number(body.month);
    const year = Number(body.year);
    const drawType = body.draw_type;

    /*
     * Validate period.
     */
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "Invalid month." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2100
    ) {
      return NextResponse.json(
        { error: "Invalid year." },
        { status: 400 }
      );
    }

    /*
     * Only supported draw types are allowed.
     *
     * Keep these values aligned with the draw UI / draw engine.
     */
    if (
      drawType !== "random" &&
      drawType !== "algorithmic"
    ) {
      return NextResponse.json(
        { error: "Invalid draw type." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    /*
     * ---------------------------------------------------------
     * CHECK EXISTING DRAW FIRST
     * ---------------------------------------------------------
     *
     * This is the important protection.
     *
     * A published draw is final and must not be reset to draft.
     */
    const { data: existingDraw, error: existingDrawError } =
      await admin
        .from("draws")
        .select("id, status")
        .eq("period_month", month)
        .eq("period_year", year)
        .maybeSingle();

    if (existingDrawError) {
      return NextResponse.json(
        {
          error: existingDrawError.message,
        },
        { status: 500 }
      );
    }

    if (existingDraw?.status === "published") {
      return NextResponse.json(
        {
          error:
            "This draw has already been published and cannot be reset or regenerated.",
        },
        { status: 409 }
      );
    }

    /*
     * ---------------------------------------------------------
     * PERIOD
     * ---------------------------------------------------------
     */

    const periodStart =
      `${year}-${String(month).padStart(2, "0")}-01`;

    /*
     * Last day of selected month.
     */
    const periodEndDate = new Date(
      year,
      month,
      0
    )
      .toISOString()
      .slice(0, 10);

    /*
     * ---------------------------------------------------------
     * PRIZE POOL
     * ---------------------------------------------------------
     */

    const { data: payments, error: paymentsError } =
      await admin
        .from("subscription_payments")
        .select("prize_pool_cut_cents")
        .gte("billing_period_start", periodStart)
        .lte("billing_period_start", periodEndDate);

    if (paymentsError) {
      return NextResponse.json(
        {
          error: paymentsError.message,
        },
        { status: 500 }
      );
    }

    const contributed = (payments ?? []).reduce(
      (sum, payment) =>
        sum + Number(payment.prize_pool_cut_cents ?? 0),
      0
    );

    /*
     * ---------------------------------------------------------
     * PREVIOUS MONTH JACKPOT ROLLOVER
     * ---------------------------------------------------------
     */

    const prevMonth =
      month === 1 ? 12 : month - 1;

    const prevYear =
      month === 1 ? year - 1 : year;

    const { data: prevDraw, error: prevDrawError } =
      await admin
        .from("draws")
        .select("rollover_out_cents")
        .eq("period_month", prevMonth)
        .eq("period_year", prevYear)
        .maybeSingle();

    if (prevDrawError) {
      return NextResponse.json(
        {
          error: prevDrawError.message,
        },
        { status: 500 }
      );
    }

    const rolloverIn =
      Number(prevDraw?.rollover_out_cents ?? 0);

    const pool = calculatePoolBreakdown(
      contributed,
      rolloverIn
    );

    /*
     * ---------------------------------------------------------
     * ACTIVE SUBSCRIBERS
     * ---------------------------------------------------------
     *
     * We need the actual IDs later for draw_entries,
     * so there is no need for a separate count query.
     */
    const { data: activeUsers, error: activeUsersError } =
      await admin
        .from("profiles")
        .select("id")
        .eq("subscription_status", "active");

    if (activeUsersError) {
      return NextResponse.json(
        {
          error: activeUsersError.message,
        },
        { status: 500 }
      );
    }

    const activeIds = (activeUsers ?? []).map(
      (user) => user.id
    );

    const activeCount = activeIds.length;

    /*
     * ---------------------------------------------------------
     * CREATE / UPDATE DRAW
     * ---------------------------------------------------------
     *
     * Existing non-published draws can be refreshed.
     * Published draws were blocked above.
     */
    const { data: draw, error: drawError } =
      await admin
        .from("draws")
        .upsert(
          {
            period_month: month,
            period_year: year,
            draw_type: drawType,
            status: "draft",
            active_subscriber_count: activeCount,
            total_pool_cents: pool.totalPoolCents,
            pool_5match_cents: pool.pool5MatchCents,
            pool_4match_cents: pool.pool4MatchCents,
            pool_3match_cents: pool.pool3MatchCents,
            rollover_in_cents: rolloverIn,
          },
          {
            onConflict:
              "period_month,period_year",
          }
        )
        .select()
        .single();

    if (drawError || !draw) {
      return NextResponse.json(
        {
          error:
            drawError?.message ||
            "Unable to create draw.",
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * FETCH ACTIVE USERS' LATEST 5 SCORES
     * ---------------------------------------------------------
     *
     * One query instead of one query per user.
     */
    const {
      data: allScores,
      error: scoresError,
    } = activeIds.length
      ? await admin
          .from("scores")
          .select(
            "user_id, score, played_on"
          )
          .in("user_id", activeIds)
          .order("played_on", {
            ascending: false,
          })
      : {
          data: [] as {
            user_id: string;
            score: number;
            played_on: string;
          }[],
          error: null,
        };

    if (scoresError) {
      return NextResponse.json(
        {
          error: scoresError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Keep only the latest 5 scores per user.
     */
    const byUser = new Map<
      string,
      number[]
    >();

    for (const row of allScores ?? []) {
      const list =
        byUser.get(row.user_id) ?? [];

      if (list.length < 5) {
        list.push(row.score);
        byUser.set(row.user_id, list);
      }
    }

    /*
     * ---------------------------------------------------------
     * BUILD DRAW ENTRIES
     * ---------------------------------------------------------
     */
    const entries = activeIds.map(
      (userId) => ({
        draw_id: draw.id,
        user_id: userId,
        numbers: numbersFromScores(
          byUser.get(userId) ?? []
        ),
      })
    );

    /*
     * Upsert entries so rerunning a draft/simulation
     * doesn't create duplicate draw entries.
     */
    if (entries.length) {
      const {
        error: entryError,
      } = await admin
        .from("draw_entries")
        .upsert(entries, {
          onConflict: "draw_id,user_id",
        });

      if (entryError) {
        return NextResponse.json(
          {
            error: entryError.message,
          },
          { status: 500 }
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * CACHE / PAGE REFRESH
     * ---------------------------------------------------------
     */
    revalidatePath("/admin/draws");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");

    return NextResponse.json({
      draw,
    });
  } catch (error: any) {
    console.error(
      "Draw run error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to run draw.",
      },
      { status: 500 }
    );
  }
}