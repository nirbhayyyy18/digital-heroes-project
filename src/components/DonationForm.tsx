"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeElements,
} from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PRESET_AMOUNTS = [100, 250, 500, 1000];

export default function DonationForm({
  charityId,
  charityName,
}: {
  charityId: string | null;
  charityName: string | null;
}) {
  const paymentElementRef = useRef<HTMLDivElement | null>(null);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const mountedElementRef = useRef<any>(null);

  const [amount, setAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const numericCustomAmount = Number(customAmount);

  const selectedAmount =
    customAmount.trim() !== ""
      ? Math.round(numericCustomAmount * 100)
      : amount * 100;

  async function startDonation() {
    if (!charityId) {
      setError("Please select a charity first.");
      return;
    }

    if (
      !Number.isFinite(selectedAmount) ||
      selectedAmount < 100
    ) {
      setError("Minimum donation amount is ₹1.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/stripe/donate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: selectedAmount,
          charity_id: charityId,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Unable to start donation.");
        return;
      }

      if (!body.clientSecret) {
        setError("Payment session could not be created.");
        return;
      }

      setClientSecret(body.clientSecret);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clientSecret || !paymentElementRef.current) {
      return;
    }

    // At this point clientSecret has been narrowed to string.
    const secret = clientSecret;

    let cancelled = false;

    async function mountPaymentElement() {
      const stripe = await stripePromise;

      if (
        !stripe ||
        cancelled ||
        !paymentElementRef.current
      ) {
        return;
      }

      stripeRef.current = stripe;

      const elements = stripe.elements({
        clientSecret: secret,
      });

      elementsRef.current = elements;

      const paymentElement = elements.create("payment", {
        layout: "tabs",
      });

      paymentElement.mount(paymentElementRef.current);

      mountedElementRef.current = paymentElement;
    }

    mountPaymentElement();

    return () => {
      cancelled = true;

      if (mountedElementRef.current) {
        mountedElementRef.current.destroy();
        mountedElementRef.current = null;
      }

      elementsRef.current = null;
    };
  }, [clientSecret]);

  async function handlePayment() {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;

    if (!stripe || !elements) {
      setError("Payment form is not ready yet.");
      return;
    }

    setPaymentLoading(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          `${window.location.origin}/dashboard/charity?donation=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setError(error.message || "Payment failed.");
      setPaymentLoading(false);
      return;
    }

    setSuccess(true);
    setClientSecret(null);
    setPaymentLoading(false);
  }

  if (!charityId) {
    return (
      <div className="card">
        <p className="label-tag mb-2">
          Independent donation
        </p>

        <p className="text-mute text-sm">
          Select a charity above before making an independent
          donation.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card border-mint">
        <p className="label-tag mb-2 text-mint">
          Donation successful
        </p>

        <h2 className="font-display text-2xl">
          Thank you for supporting{" "}
          {charityName ?? "your charity"}.
        </h2>

        <p className="text-mute text-sm mt-2">
          Your donation has been submitted successfully.
        </p>

        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            setCustomAmount("");
            setAmount(500);
            setError(null);
          }}
          className="btn-ghost mt-5"
        >
          Make another donation
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div>
        <p className="label-tag mb-2 text-mint">
          Independent donation
        </p>

        <h2 className="font-display text-2xl">
          Give a little extra
        </h2>

        <p className="text-mute text-sm mt-2">
          Make a one-time donation directly to{" "}
          <span className="text-cloud">
            {charityName ?? "your selected charity"}
          </span>
          .
        </p>
      </div>

      {!clientSecret && (
        <>
          <div>
            <p className="text-sm mb-3">
              Choose an amount
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(preset);
                    setCustomAmount("");
                    setError(null);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm transition ${
                    amount === preset &&
                    customAmount === ""
                      ? "border-mint text-mint"
                      : "border-line text-mute hover:text-cloud"
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-donation"
              className="text-sm"
            >
              Or enter another amount
            </label>

            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mute">
                ₹
              </span>

              <input
                id="custom-donation"
                type="number"
                min="1"
                step="1"
                value={customAmount}
                onChange={(event) => {
                  setCustomAmount(event.target.value);
                  setError(null);
                }}
                placeholder="Enter amount"
                className="input-field w-full pl-9"
              />
            </div>
          </div>

          {error && (
            <p className="text-amber text-sm">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={startDonation}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? "Preparing payment…"
              : `Continue with ₹${
                  customAmount
                    ? numericCustomAmount || 0
                    : amount
                }`}
          </button>
        </>
      )}

      {clientSecret && (
        <>
          <div>
            <p className="text-sm mb-3">
              Payment details
            </p>

            <div
              ref={paymentElementRef}
              className="rounded-xl"
            />
          </div>

          {error && (
            <p className="text-amber text-sm">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setClientSecret(null);
                setError(null);
              }}
              disabled={paymentLoading}
              className="btn-ghost flex-1"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handlePayment}
              disabled={paymentLoading}
              className="btn-primary flex-1"
            >
              {paymentLoading
                ? "Processing…"
                : `Donate ₹${
                    customAmount
                      ? numericCustomAmount || 0
                      : amount
                  }`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}