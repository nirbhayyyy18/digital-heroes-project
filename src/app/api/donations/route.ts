import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // ---------------------------------------------------------
    // 1. Authenticate user
    // ---------------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. Read request body
    // ---------------------------------------------------------

    const body = await request.json();

    const amount = Number(body?.amount);
    const charityId = body?.charity_id;

    // ---------------------------------------------------------
    // 3. Validate charity ID
    // ---------------------------------------------------------

    if (
      !charityId ||
      typeof charityId !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid charity is required." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 4. Validate donation amount
    // ---------------------------------------------------------
    //
    // Stripe expects the smallest currency unit.
    //
    // For INR:
    // ₹1 = 100 paise
    // ₹500 = 50000 paise
    //
    // The frontend should therefore send amount in paise.
    // ---------------------------------------------------------

    if (
      !Number.isInteger(amount) ||
      amount < 100
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum donation amount is ₹1.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 5. Verify charity exists and is active
    // ---------------------------------------------------------

    const { data: charity, error: charityError } =
      await supabase
        .from("charities")
        .select("id, name, is_active")
        .eq("id", charityId)
        .eq("is_active", true)
        .single();

    if (
      charityError ||
      !charity
    ) {
      return NextResponse.json(
        {
          error:
            "The selected charity is not available.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 6. Create Stripe PaymentIntent
    // ---------------------------------------------------------

    const paymentIntent =
      await stripe.paymentIntents.create({
        amount,
        currency: "inr",

        automatic_payment_methods: {
          enabled: true,
        },

        metadata: {
          supabase_user_id: user.id,
          charity_id: charity.id,
          charity_name: charity.name,
          donation: "true",
        },

        description: `Donation to ${charity.name}`,
      });

    // ---------------------------------------------------------
    // 7. Validate Stripe response
    // ---------------------------------------------------------

    if (!paymentIntent.client_secret) {
      console.error(
        "Stripe PaymentIntent missing client_secret:",
        paymentIntent.id
      );

      return NextResponse.json(
        {
          error:
            "Unable to initialize donation payment.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 8. Return client secret
    // ---------------------------------------------------------

    return NextResponse.json({
      clientSecret:
        paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error(
      "Donation payment error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to create donation payment.",
      },
      { status: 500 }
    );
  }
}