import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import RealtimeRefresh from "@/components/RealtimeRefresh";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/scores", label: "Scores" },
  { href: "/dashboard/charity", label: "Charity" },
  { href: "/dashboard/winnings", label: "Winnings" },
  { href: "/dashboard/subscription", label: "Subscription" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen md:flex">
      <RealtimeRefresh tables={["winners", "draws", "profiles", "scores", "charities", "subscription_payments"]} />
      <aside className="md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-line px-5 py-7 md:sticky md:top-0 md:self-start bg-panel/30">
        <Link href="/" className="font-display text-2xl font-semibold block px-3 mb-2">
          digital<span className="text-mint">.</span>heroes
        </Link>
        <p className="label-tag px-3 mb-8">Member area</p>
        <nav className="flex md:flex-col gap-1.5 flex-wrap">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="px-3.5 py-3 rounded-xl text-sm text-mute hover:text-cloud hover:bg-panel border border-transparent hover:border-line transition-all">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 pt-5 border-t border-line px-3">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 py-7 md:py-10">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
