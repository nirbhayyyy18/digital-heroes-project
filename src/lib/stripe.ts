import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY!,
};
