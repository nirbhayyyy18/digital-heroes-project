import { createAdminClient } from "@/lib/supabase/admin";
import { currentPeriod, centsToDisplay } from "@/lib/utils";
import DrawControls from "@/components/DrawControls";

export const dynamic = "force-dynamic";

export default async function AdminDrawsPage() {
  const supabase = createAdminClient();
  const { month, year } = currentPeriod();

  const { data: draws } = await supabase
    .from("draws")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(12);

  return (
    <div className="space-y-8">
      <div>
        <p className="label-tag mb-2">Draws</p>
        <h1 className="font-display text-3xl font-semibold">Draw management</h1>
        <p className="text-mute text-sm mt-2">
          Configure this month&rsquo;s draw type, run a simulation as many times as you like, then publish
          when you&rsquo;re happy with the result.
        </p>
      </div>

      <DrawControls defaultMonth={month} defaultYear={year} />

      <div>
        <p className="label-tag mb-4">Recent draws</p>
        <div className="space-y-3">
          {(draws ?? []).map((d) => (
            <div key={d.id} className="card flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-display text-xl">
                  {d.period_month}/{d.period_year} — <span className="capitalize">{d.draw_type}</span>
                </p>
                <p className="text-mute text-sm">
                  Pool: {centsToDisplay(d.total_pool_cents)} · {d.active_subscriber_count} subscribers
                </p>
              </div>
              <span
                className={`label-tag ${
                  d.status === "published" ? "text-mint" : d.status === "simulated" ? "text-amber" : ""
                }`}
              >
                {d.status}
              </span>
            </div>
          ))}
          {(!draws || draws.length === 0) && <p className="text-mute text-sm">No draws yet.</p>}
        </div>
      </div>
    </div>
  );
}
