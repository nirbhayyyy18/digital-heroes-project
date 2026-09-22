import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  subscriptionActivatedEmail,
  subscriptionRenewedEmail,
  paymentFailedEmail,
  subscriptionCancelledEmail,
} from "@/lib/email-templates/subscription";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Stripe webhook
// Handles subscription activation, renewals, cancellation,
// failed payments, donation payments and scheduled cancellation updates.

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // ---------------------------------------------------------
  // 1. Verify Stripe signature
  // ---------------------------------------------------------

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(
      "Stripe webhook signature verification failed:",
      err
    );

    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${
          err?.message || "Invalid signature"
        }`,
      },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      /*
       * ------------------------------------------------------------
       * CHECKOUT COMPLETED
       * ------------------------------------------------------------
       *
       * Fires after the user successfully completes Stripe Checkout.
       *
       * Sends the initial subscription activation email.
       */

      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId) {
          console.error(
            "checkout.session.completed: Missing supabase_user_id metadata."
          );
          break;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
          console.error(
            "checkout.session.completed: Could not find profile.",
            profileError
          );
          break;
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_plan: plan ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            subscription_cancel_at_period_end: false,
            subscription_cancelled_at: null,
          })
          .eq("id", userId);

        if (updateError) {
          console.error(
            "checkout.session.completed: Failed to update profile.",
            updateError
          );
          break;
        }

        const email = subscriptionActivatedEmail({
          name: profile.full_name || "there",
          plan: plan === "yearly" ? "Yearly" : "Monthly",
        });

        const emailResult = await sendEmail({
          to: profile.email,
          subject: email.subject,
          html: email.html,
        });

        if (!emailResult.success) {
          console.error(
            "checkout.session.completed: Failed to send activation email.",
            emailResult.error
          );
        }

        break;
      }

      /*
       * ------------------------------------------------------------
       * SUBSCRIPTION UPDATED
       * ------------------------------------------------------------
       *
       * Handles:
       * - Normal subscription updates
       * - Scheduled cancellation
       * - Cancellation reversal
       * - Stripe status changes
       */

      case "customer.subscription.updated": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const subscriptionId = subscription.id;

        let subscriptionStatus:
          | "active"
          | "cancelled"
          | "lapsed";

        switch (subscription.status) {
          case "active":
          case "trialing":
            subscriptionStatus = "active";
            break;

          case "canceled":
            subscriptionStatus = "cancelled";
            break;

          case "past_due":
          case "unpaid":
          case "incomplete":
          case "incomplete_expired":
          default:
            subscriptionStatus = "lapsed";
            break;
        }

        const cancelAtPeriodEnd = Boolean(
          subscription.cancel_at_period_end
        );

        const updateData: Record<string, any> = {
          subscription_status: subscriptionStatus,
          subscription_cancel_at_period_end:
            cancelAtPeriodEnd,
        };

        /*
         * Scheduled cancellation:
         * Subscription remains active until the billing period ends.
         */

        if (
          cancelAtPeriodEnd &&
          subscriptionStatus === "active"
        ) {
          updateData.subscription_status = "active";

          if (subscription.cancel_at) {
            updateData.subscription_renews_at = new Date(
              subscription.cancel_at * 1000
            ).toISOString();
          }
        }

        /*
         * Actual cancellation.
         */

        if (subscriptionStatus === "cancelled") {
          updateData.subscription_status = "cancelled";
          updateData.subscription_cancel_at_period_end = false;
          updateData.subscription_cancelled_at =
            new Date().toISOString();
        }

        /*
         * Subscription becomes active again.
         */

        if (
          subscriptionStatus === "active" &&
          !cancelAtPeriodEnd
        ) {
          updateData.subscription_cancelled_at = null;

          if (subscription.current_period_end) {
            updateData.subscription_renews_at = new Date(
              subscription.current_period_end * 1000
            ).toISOString();
          }
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error(
            "customer.subscription.updated: Failed to update profile.",
            updateError
          );

          throw updateError;
        }

        break;
      }

      /*
       * ------------------------------------------------------------
       * INVOICE PAID
       * ------------------------------------------------------------
       *
       * Handles:
       * - Initial subscription payment
       * - Monthly renewal
       * - Yearly renewal
       *
       * Also creates the subscription payment ledger entry.
       */

      case "invoice.paid": {
        const invoice =
          event.data.object as Stripe.Invoice;

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) {
          console.error("invoice.paid: Missing customer ID.");
          break;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select(
              "id, email, full_name, charity_contribution_pct, subscription_cancel_at_period_end, subscription_plan"
            )
            .eq("stripe_customer_id", customerId)
            .single();

        if (profileError || !profile) {
          console.error(
            "invoice.paid: Could not find profile.",
            profileError
          );
          break;
        }

        /*
         * Prevent duplicate payment ledger entries.
         */

        const { data: existingPayment, error: existingPaymentError } =
          await supabase
            .from("subscription_payments")
            .select("id")
            .eq("stripe_invoice_id", invoice.id)
            .maybeSingle();

        if (existingPaymentError) {
          console.error(
            "invoice.paid: Failed to check existing payment.",
            existingPaymentError
          );

          throw existingPaymentError;
        }

        const isNewPayment = !existingPayment;

        if (isNewPayment) {
          const amount = invoice.amount_paid;

          const charityPercentage = Math.min(
            100,
            Math.max(
              0,
              Number(profile.charity_contribution_pct ?? 0)
            )
          );

          const charityCents = Math.round(
            amount * (charityPercentage / 100)
          );

          const poolCents = amount - charityCents;

          const { error: paymentInsertError } =
            await supabase
              .from("subscription_payments")
              .insert({
                user_id: profile.id,
                stripe_invoice_id: invoice.id,
                amount_cents: amount,
                charity_cut_cents: charityCents,
                prize_pool_cut_cents: poolCents,
                billing_period_start: invoice.period_start
                  ? new Date(
                      invoice.period_start * 1000
                    )
                      .toISOString()
                      .slice(0, 10)
                  : null,
                billing_period_end: invoice.period_end
                  ? new Date(
                      invoice.period_end * 1000
                    )
                      .toISOString()
                      .slice(0, 10)
                  : null,
              });

          if (paymentInsertError) {
            console.error(
              "invoice.paid: Failed to insert subscription payment.",
              paymentInsertError
            );

            throw paymentInsertError;
          }
        }

        /*
         * Successful payment means subscription is active.
         */

        const profileUpdate: Record<string, any> = {
          subscription_status: "active",
        };

        if (invoice.period_end) {
          profileUpdate.subscription_renews_at =
            new Date(
              invoice.period_end * 1000
            ).toISOString();
        }

        const { error: profileUpdateError } =
          await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("id", profile.id);

        if (profileUpdateError) {
          console.error(
            "invoice.paid: Failed to update subscription profile.",
            profileUpdateError
          );

          throw profileUpdateError;
        }

        /*
         * Send renewal email only for recurring subscription
         * payments.
         */

        if (
          isNewPayment &&
          invoice.billing_reason === "subscription_cycle"
        ) {
          const plan =
            profile.subscription_plan === "yearly"
              ? "Yearly"
              : "Monthly";

          const amount = `₹${(
            invoice.amount_paid / 100
          ).toLocaleString("en-IN")}`;

          const email = subscriptionRenewedEmail({
            name: profile.full_name || "there",
            plan,
            amount,
          });

          const emailResult = await sendEmail({
            to: profile.email,
            subject: email.subject,
            html: email.html,
          });

          if (!emailResult.success) {
            console.error(
              "invoice.paid: Failed to send renewal email.",
              emailResult.error
            );
          }
        }

        break;
      }

      /*
       * ------------------------------------------------------------
       * SUBSCRIPTION DELETED
       * ------------------------------------------------------------
       *
       * Fires when the subscription actually ends.
       *
       * Sends cancellation email.
       */

      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select(
              "email, full_name, subscription_renews_at"
            )
            .eq(
              "stripe_subscription_id",
              subscription.id
            )
            .single();

        /*
         * Always update subscription status even if the
         * email lookup fails.
         */

        const { error: updateError } =
          await supabase
            .from("profiles")
            .update({
              subscription_status: "cancelled",
              subscription_cancel_at_period_end: false,
              subscription_cancelled_at:
                new Date().toISOString(),
            })
            .eq(
              "stripe_subscription_id",
              subscription.id
            );

        if (updateError) {
          console.error(
            "customer.subscription.deleted: Failed to update profile.",
            updateError
          );

          throw updateError;
        }

        /*
         * Send cancellation email if profile was found.
         */

        if (!profileError && profile) {
          const endDate = profile.subscription_renews_at
            ? new Date(
                profile.subscription_renews_at
              ).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : undefined;

          const email = subscriptionCancelledEmail({
            name: profile.full_name || "there",
            endDate,
          });

          const emailResult = await sendEmail({
            to: profile.email,
            subject: email.subject,
            html: email.html,
          });

          if (!emailResult.success) {
            console.error(
              "customer.subscription.deleted: Failed to send cancellation email.",
              emailResult.error
            );
          }
        } else {
          console.error(
            "customer.subscription.deleted: Could not find profile.",
            profileError
          );
        }

        break;
      }

      /*
       * ------------------------------------------------------------
       * DONATION PAYMENT SUCCEEDED
       * ------------------------------------------------------------
       *
       * Creates a donation record after Stripe confirms
       * successful payment.
       *
       * Important protections:
       * - Stripe signature already verified above.
       * - Donation metadata is validated.
       * - User is verified.
       * - Charity is verified.
       * - Payment currency is verified.
       * - Payment amount is verified.
       * - Database UNIQUE constraint prevents duplicate
       *   PaymentIntent records.
       */

      case "payment_intent.succeeded": {
        const paymentIntent =
          event.data.object as Stripe.PaymentIntent;

        /*
         * Ignore normal subscription/payment intents.
         */

        if (
          paymentIntent.metadata?.donation !== "true"
        ) {
          break;
        }

        const userId =
          paymentIntent.metadata.supabase_user_id;

        const charityId =
          paymentIntent.metadata.charity_id;

        /*
         * ---------------------------------------------------------
         * Validate metadata
         * ---------------------------------------------------------
         */

        if (!userId || !charityId) {
          console.error(
            "payment_intent.succeeded: Missing donation metadata.",
            {
              paymentIntentId: paymentIntent.id,
              userId,
              charityId,
            }
          );

          break;
        }

        /*
         * ---------------------------------------------------------
         * Validate currency
         * ---------------------------------------------------------
         */

        if (
          paymentIntent.currency.toLowerCase() !== "inr"
        ) {
          console.error(
            "payment_intent.succeeded: Invalid donation currency.",
            {
              paymentIntentId: paymentIntent.id,
              currency: paymentIntent.currency,
            }
          );

          break;
        }

        /*
         * ---------------------------------------------------------
         * Validate amount
         * ---------------------------------------------------------
         */

        const amountCents =
          Number(paymentIntent.amount_received);

        if (
          !Number.isInteger(amountCents) ||
          amountCents < 100
        ) {
          console.error(
            "payment_intent.succeeded: Invalid donation amount.",
            {
              paymentIntentId: paymentIntent.id,
              amountReceived: paymentIntent.amount_received,
            }
          );

          break;
        }

        /*
         * ---------------------------------------------------------
         * Verify user/profile exists
         * ---------------------------------------------------------
         */

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

        if (profileError) {
          console.error(
            "payment_intent.succeeded: Failed to verify user.",
            profileError
          );

          throw profileError;
        }

        if (!profile) {
          console.error(
            "payment_intent.succeeded: User does not exist.",
            {
              paymentIntentId: paymentIntent.id,
              userId,
            }
          );

          break;
        }

        /*
         * ---------------------------------------------------------
         * Verify charity exists
         * ---------------------------------------------------------
         *
         * We verify existence rather than requiring the charity
         * to still be active. This prevents a successfully paid
         * donation from being lost merely because an admin later
         * deactivated the charity.
         */

        const { data: charity, error: charityError } =
          await supabase
            .from("charities")
            .select("id")
            .eq("id", charityId)
            .maybeSingle();

        if (charityError) {
          console.error(
            "payment_intent.succeeded: Failed to verify charity.",
            charityError
          );

          throw charityError;
        }

        if (!charity) {
          console.error(
            "payment_intent.succeeded: Charity does not exist.",
            {
              paymentIntentId: paymentIntent.id,
              charityId,
            }
          );

          break;
        }

        /*
         * ---------------------------------------------------------
         * Idempotent donation insert
         * ---------------------------------------------------------
         *
         * The donations table has:
         *
         * UNIQUE (stripe_payment_intent_id)
         *
         * Therefore the same successful Stripe PaymentIntent
         * cannot create multiple donation records.
         *
         * ignoreDuplicates prevents a replayed Stripe event
         * from generating an error.
         */

        const { error: donationInsertError } =
          await supabase
            .from("donations")
            .upsert(
              {
                user_id: profile.id,
                charity_id: charity.id,
                amount_cents: amountCents,
                stripe_payment_intent_id:
                  paymentIntent.id,
              },
              {
                onConflict:
                  "stripe_payment_intent_id",
                ignoreDuplicates: true,
              }
            );

        if (donationInsertError) {
          console.error(
            "payment_intent.succeeded: Failed to record donation.",
            donationInsertError
          );

          throw donationInsertError;
        }

        console.log(
          "Donation recorded successfully:",
          {
            paymentIntentId: paymentIntent.id,
            userId: profile.id,
            charityId: charity.id,
            amountCents,
          }
        );

        break;
      }

      /*
       * ------------------------------------------------------------
       * PAYMENT FAILED
       * ------------------------------------------------------------
       *
       * Marks the subscription as lapsed and sends a
       * payment-failed notification.
       */

      case "invoice.payment_failed": {
        const invoice =
          event.data.object as Stripe.Invoice;

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) {
          console.error(
            "invoice.payment_failed: Missing customer ID."
          );
          break;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("stripe_customer_id", customerId)
            .single();

        /*
         * Update subscription status.
         */

        const { error: updateError } =
          await supabase
            .from("profiles")
            .update({
              subscription_status: "lapsed",
            })
            .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error(
            "invoice.payment_failed: Failed to update subscription status.",
            updateError
          );

          throw updateError;
        }

        /*
         * Send payment failed email.
         */

        if (!profileError && profile) {
          const email = paymentFailedEmail({
            name: profile.full_name || "there",
          });

          const emailResult = await sendEmail({
            to: profile.email,
            subject: email.subject,
            html: email.html,
          });

          if (!emailResult.success) {
            console.error(
              "invoice.payment_failed: Failed to send payment failure email.",
              emailResult.error
            );
          }
        } else {
          console.error(
            "invoice.payment_failed: Could not find profile.",
            profileError
          );
        }

        break;
      }

      /*
       * ------------------------------------------------------------
       * DEFAULT
       * ------------------------------------------------------------
       */

      default:
        // Ignore unrelated Stripe events.
        break;
    }
  } catch (error: any) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}