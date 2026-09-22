import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/stripe/cancel
// Schedules the user's Stripe subscription to cancel at the end
// of the current billing period.
export async function POST() {
  try {
    const supabase = createClient();

    // 1. Check logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get the user's Stripe subscription
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "stripe_subscription_id, subscription_status, subscription_cancel_at_period_end"
      )
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active Stripe subscription found." },
        { status: 400 }
      );
    }

    // 3. Check if subscription is already cancelled
    if (
      profile.subscription_status === "cancelled" ||
      profile.subscription_status === "lapsed"
    ) {
      return NextResponse.json(
        { error: "Your subscription is no longer active." },
        { status: 400 }
      );
    }

    // 4. If cancellation is already scheduled, don't send another request
    if (profile.subscription_cancel_at_period_end) {
      return NextResponse.json(
        {
          message: "Your subscription is already scheduled for cancellation.",
        },
        { status: 200 }
      );
    }

    // 5. Tell Stripe to cancel at the END of the current billing period
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // 6. Reflect the scheduled cancellation in Supabase
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_cancel_at_period_end: true,
        subscription_renews_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : undefined,
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Your subscription has been scheduled for cancellation at the end of the current billing period.",
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to cancel subscription.",
      },
      { status: 500 }
    );
  }
}