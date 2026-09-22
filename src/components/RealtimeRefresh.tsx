"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Table =
  | "winners"
  | "draws"
  | "profiles"
  | "charities"
  | "charity_events"
  | "subscription_payments"
  | "scores"
  | "draw_entries"
  | "donations";

export default function RealtimeRefresh({
  tables,
}: {
  tables: Table[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(
      `live-refresh-${tables.join("-")}`
    );

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          router.refresh();
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `Realtime connected: ${tables.join(", ")}`
        );
      }

      if (status === "CHANNEL_ERROR") {
        console.error(
          `Realtime channel error: ${tables.join(", ")}`
        );
      }

      if (status === "TIMED_OUT") {
        console.error(
          `Realtime connection timed out: ${tables.join(", ")}`
        );
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, tables]);

  return null;
}