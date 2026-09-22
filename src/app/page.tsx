import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";

export default async function HomePage() {
  const supabase = createClient();
  const { data: spotlight } = await supabase
    .from("charities")
    .select("*")
    .eq("is_spotlight", true)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { count: charityCount } = await supabase
    .from("charities")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return (
    <main>
      <Navbar />

      {/* HERO — what the user does + primary CTA */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <p className="label-tag mb-6">Performance · Prizes · Purpose</p>
        <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] max-w-4xl">
          Every round you play
          <span className="block text-mint">funds a draw. And a cause.</span>
        </h1>
        <p className="mt-6 text-lg text-mute max-w-xl">
          Log your last five scores, get entered into this month&rsquo;s prize draw, and route
          part of your subscription straight to a charity you pick. No plaid. No fairways. Just
          your numbers, your odds, and your impact.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/signup" className="btn-primary">
            Subscribe &amp; start playing
          </Link>
          <Link href="/charities" className="btn-ghost">
            Browse charities
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS — three-step, no golf iconography */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-line">
        <p className="label-tag mb-8">How it works</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              title: "Subscribe",
              body: "Monthly or yearly. A fixed share of every payment feeds this month's prize pool automatically.",
            },
            {
              n: "02",
              title: "Log your scores",
              body: "Enter your last five rounds (Stableford, 1–45). Your most recent five always stay on file.",
            },
            {
              n: "03",
              title: "Win or give",
              body: "Match 3, 4 or 5 numbers drawn from real scoring data to win a share of the pool — or increase your charity cut any time.",
            },
          ].map((s) => (
            <div key={s.n} className="card fade-in">
              <span className="font-mono text-mint text-sm">{s.n}</span>
              <h3 className="font-display text-2xl mt-3 mb-2">{s.title}</h3>
              <p className="text-mute text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRIZE STRUCTURE */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-line">
        <p className="label-tag mb-8">This month&rsquo;s pool splits</p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="card">
            <div className="stat-number text-mint">40%</div>
            <p className="text-mute text-sm mt-2">5-number match — jackpot, rolls over if unclaimed</p>
          </div>
          <div className="card">
            <div className="stat-number">35%</div>
            <p className="text-mute text-sm mt-2">4-number match, split evenly among winners</p>
          </div>
          <div className="card">
            <div className="stat-number">25%</div>
            <p className="text-mute text-sm mt-2">3-number match, split evenly among winners</p>
          </div>
        </div>
      </section>

      {/* CHARITY SPOTLIGHT */}
      {spotlight && (
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-line">
          <p className="label-tag mb-8">Charity spotlight</p>
          <div className="card md:flex items-center gap-8">
            <div className="flex-1">
              <h3 className="font-serifItalic italic text-3xl mb-3">{spotlight.name}</h3>
              <p className="text-mute leading-relaxed">{spotlight.description}</p>
              <Link href={`/charities/${spotlight.id}`} className="btn-ghost mt-6">
                View profile
              </Link>
            </div>
          </div>
          <p className="text-mute text-sm mt-6">
            {charityCount ?? 0} charities are currently active on the platform — every subscriber
            picks one at signup.
          </p>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-line text-center">
        <h2 className="font-display text-4xl md:text-5xl font-semibold max-w-2xl mx-auto">
          Your scorecard is a lottery ticket. Your subscription is a donation.
        </h2>
        <Link href="/signup" className="btn-primary mt-8 inline-flex">
          Get started
        </Link>
      </section>

      <footer className="border-t border-line py-10 text-center text-mute text-sm">
        Digital Heroes — built for the 2026 trainee selection process.
      </footer>
    </main>
  );
}
