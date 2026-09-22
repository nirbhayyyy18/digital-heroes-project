import { createClient } from "@/lib/supabase/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/stripe/checkout  { plan: "monthly" | "yearly" }
// Creates a Stripe Checkout session for the requested plan and returns
// the redirect URL. Webhook (below) is what actually flips the user's
// subscription_status to "active" once payment succeeds.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await request.json();
  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, email").eq("id", user.id).single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRICE_IDS[plan as "monthly" | "yearly"], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?cancelled=1`,
    metadata: { supabase_user_id: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
