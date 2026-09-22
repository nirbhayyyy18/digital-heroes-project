import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

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

    const { amount, charity_id } = await request.json();

    const amountCents = Number(amount);

    if (!Number.isInteger(amountCents) || amountCents < 100) {
      return NextResponse.json(
        {
          error: "Minimum donation is ₹1.",
        },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        supabase_user_id: user.id,
        charity_id,
        donation: "true",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err.message || "Unable to create donation payment.",
      },
      { status: 500 }
    );
  }
}