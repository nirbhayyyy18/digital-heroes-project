import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { calculateWinners } from "@/lib/draw-engine";

function drawPublishedEmail({
  name,
  month,
  year,
  winningNumbers,
}: {
  name: string;
  month: number;
  year: number;
  winningNumbers: number[];
}) {
  return {
    subject: `Your Digital Heroes draw result — ${month}/${year}`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Digital Heroes Draw Results</h2>

        <p>Hi ${name || "there"},</p>

        <p>
          The ${month}/${year} Digital Heroes draw has been published.
        </p>

        <p>
          <strong>Winning numbers:</strong>
          ${winningNumbers.join(", ")}
        </p>

        <p>
          Log in to your Digital Heroes dashboard to view your
          participation and any winnings.
        </p>

        <p>
          Thank you for participating and supporting charity.
        </p>
      </div>
    `,
  };
}

export async function POST(request: Request) {
  try {
    /*
     * ============================================================
     * 1. AUTHENTICATE USER
     * ============================================================
     */

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ============================================================
     * 2. VERIFY ADMIN
     * ============================================================
     */

    const { data: caller, error: callerError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      callerError ||
      caller?.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ============================================================
     * 3. READ REQUEST
     * ============================================================
     */

    const body = await request.json();

    const drawId = body?.draw_id;

    if (
      !drawId ||
      typeof drawId !== "string"
    ) {
      return NextResponse.json(
        {
          error: "draw_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    /*
     * ============================================================
     * 4. LOAD DRAW
     * ============================================================
     */

    const {
      data: draw,
      error: drawError,
    } = await admin
      .from("draws")
      .select(`
        id,
        status,
        period_month,
        period_year,
        winning_numbers,
        pool_5match_cents,
        pool_4match_cents,
        pool_3match_cents
      `)
      .eq("id", drawId)
      .single();

    if (
      drawError ||
      !draw
    ) {
      return NextResponse.json(
        {
          error: "Draw not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================================
     * 5. ONLY SIMULATED DRAWS CAN BE PUBLISHED
     * ============================================================
     */

    if (draw.status !== "simulated") {
      return NextResponse.json(
        {
          error:
            "This draw is not ready for publishing. Run a simulation first.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 6. LOAD DRAW ENTRIES
     * ============================================================
     */

    const {
      data: entries,
      error: entriesError,
    } = await admin
      .from("draw_entries")
      .select(
        "user_id, numbers"
      )
      .eq("draw_id", drawId);

    if (entriesError) {
      console.error(
        "Draw entries error:",
        entriesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load draw entries.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ============================================================
     * 7. NORMALIZE WINNING NUMBERS
     * ============================================================
     */

    const winningNumbers =
      Array.isArray(
        draw.winning_numbers
      )
        ? draw.winning_numbers
            .map(Number)
            .filter(
              (number) =>
                Number.isInteger(number)
            )
        : [];

    /*
     * ============================================================
     * 8. NORMALIZE DRAW ENTRIES
     *
     * Convert database shape:
     *
     * user_id
     * numbers
     *
     * into draw-engine shape:
     *
     * userId
     * numbers
     * ============================================================
     */

    const drawEntries = (
      entries ?? []
    ).map((entry) => ({
      userId: entry.user_id,

      numbers: Array.isArray(
        entry.numbers
      )
        ? entry.numbers
            .map(Number)
            .filter(
              (number) =>
                Number.isInteger(number)
            )
        : [],
    }));

    /*
     * ============================================================
     * 9. BUILD POOL BREAKDOWN
     * ============================================================
     */

    const pool = {
      totalPoolCents:
        Number(
          draw.pool_5match_cents ?? 0
        ) +
        Number(
          draw.pool_4match_cents ?? 0
        ) +
        Number(
          draw.pool_3match_cents ?? 0
        ),

      pool5MatchCents:
        Number(
          draw.pool_5match_cents ?? 0
        ),

      pool4MatchCents:
        Number(
          draw.pool_4match_cents ?? 0
        ),

      pool3MatchCents:
        Number(
          draw.pool_3match_cents ?? 0
        ),
    };

    /*
     * ============================================================
     * 10. SHARED WINNER CALCULATION
     *
     * IMPORTANT:
     * This uses the same business logic from draw-engine.ts.
     *
     * The publish route does NOT implement its own
     * 3/4/5 match calculation anymore.
     * ============================================================
     */

    const winnerCalculation =
      calculateWinners(
        drawEntries,
        winningNumbers,
        pool
      );

    /*
     * ============================================================
     * 11. CONVERT ENGINE RESULT TO DATABASE ROWS
     * ============================================================
     */

    const winnerRows = [
      /*
       * 5 MATCH WINNERS
       */
      ...winnerCalculation.winnersByTier[5].map(
        (winner) => ({
          user_id:
            winner.userId,

          match_tier: 5,

          amount_cents:
            winner.shareCents,
        })
      ),

      /*
       * 4 MATCH WINNERS
       */
      ...winnerCalculation.winnersByTier[4].map(
        (winner) => ({
          user_id:
            winner.userId,

          match_tier: 4,

          amount_cents:
            winner.shareCents,
        })
      ),

      /*
       * 3 MATCH WINNERS
       */
      ...winnerCalculation.winnersByTier[3].map(
        (winner) => ({
          user_id:
            winner.userId,

          match_tier: 3,

          amount_cents:
            winner.shareCents,
        })
      ),
    ];

    /*
     * ============================================================
     * 12. ATOMIC PUBLISH
     *
     * Database function:
     *
     * - locks draw
     * - verifies status = simulated
     * - inserts winners
     * - marks draw published
     *
     * If another admin tries to publish simultaneously,
     * the second request cannot publish the same draw.
     * ============================================================
     */

    const {
      error: publishError,
    } = await admin.rpc(
      "publish_draw_atomic",
      {
        p_draw_id: drawId,

        p_published_by:
          user.id,

        p_winners:
          winnerRows,
      }
    );

    if (publishError) {
      console.error(
        "Atomic draw publish error:",
        publishError
      );

      return NextResponse.json(
        {
          error:
            publishError.message ||
            "Unable to publish draw.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ============================================================
     * 13. REVALIDATE ADMIN PAGES
     * ============================================================
     */

    revalidatePath("/admin");

    revalidatePath(
      "/admin/draws"
    );

    revalidatePath(
      "/admin/winners"
    );

    revalidatePath(
      "/admin/reports"
    );

    /*
     * ============================================================
     * 14. GET UNIQUE PARTICIPANTS
     * ============================================================
     */

    const participantIds = [
      ...new Set(
        (entries ?? [])
          .map(
            (entry) =>
              entry.user_id
          )
          .filter(Boolean)
      ),
    ];

    /*
     * ============================================================
     * 15. SEND DRAW RESULT EMAILS
     *
     * Email failure does NOT undo an already successful
     * draw publication.
     * ============================================================
     */

    let emailsSent = 0;
    let emailsFailed = 0;

    if (
      participantIds.length > 0
    ) {
      const {
        data: participants,
        error:
          participantsError,
      } = await admin
        .from("profiles")
        .select(
          "id, full_name, email"
        )
        .in(
          "id",
          participantIds
        );

      if (
        participantsError
      ) {
        console.error(
          "Participant email lookup error:",
          participantsError
        );

        emailsFailed =
          participantIds.length;
      } else {
        const emailResults =
          await Promise.allSettled(
            (participants ?? [])
              .filter(
                (participant) =>
                  Boolean(
                    participant.email
                  )
              )
              .map(
                async (
                  participant
                ) => {
                  const email =
                    drawPublishedEmail(
                      {
                        name:
                          participant.full_name ??
                          "",

                        month:
                          draw.period_month,

                        year:
                          draw.period_year,

                        winningNumbers,
                      }
                    );

                  return sendEmail({
                    to: participant.email,

                    subject:
                      email.subject,

                    html:
                      email.html,
                  });
                }
              )
          );

        for (
          const result of
          emailResults
        ) {
          if (
            result.status ===
            "fulfilled"
          ) {
            /*
             * sendEmail() returns an object,
             * so only count successful email
             * responses as sent.
             */
            if (
              result.value?.success
            ) {
              emailsSent++;
            } else {
              emailsFailed++;

              console.error(
                "Draw result email failed:",
                result.value?.error
              );
            }
          } else {
            emailsFailed++;

            console.error(
              "Draw result email failed:",
              result.reason
            );
          }
        }
      }
    }

    /*
     * ============================================================
     * 16. RETURN RESULT
     * ============================================================
     */

    return NextResponse.json({
      ok: true,

      drawId,

      winnersCreated:
        winnerRows.length,

      winnersByTier: {
        5: winnerCalculation
          .winnersByTier[5]
          .length,

        4: winnerCalculation
          .winnersByTier[4]
          .length,

        3: winnerCalculation
          .winnersByTier[3]
          .length,
      },

      rolloverOutCents:
        winnerCalculation
          .rolloverOutCents,

      emailsSent,

      emailsFailed,
    });
  } catch (error: any) {
    console.error(
      "Publish draw error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to publish draw.",
      },
      {
        status: 500,
      }
    );
  }
}