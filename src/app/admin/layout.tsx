import Link from "next/link";
import RealtimeRefresh from "@/components/RealtimeRefresh";

const NAV = [
  { href: "/admin", label: "Overview", icon: "⌂" },
  { href: "/admin/users", label: "Users", icon: "◉" },
  { href: "/admin/draws", label: "Draws", icon: "◎" },
  { href: "/admin/charities", label: "Charities", icon: "♡" },
  { href: "/admin/winners", label: "Winners", icon: "★" },
  { href: "/admin/reports", label: "Reports", icon: "▥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex bg-ink">
      <RealtimeRefresh tables={["winners", "draws", "profiles", "charities", "subscription_payments"]} />
      <aside className="md:w-72 md:min-h-screen border-b md:border-b-0 md:border-r border-line bg-panel/40 px-5 py-6 md:sticky md:top-0 md:self-start">
        <Link href="/" className="font-display text-2xl font-semibold block px-3">
          digital<span className="text-mint">.</span>heroes
        </Link>
        <div className="flex items-center justify-between px-3 mt-2 mb-8">
          <p className="label-tag text-amber">Admin Console</p>
          <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_12px_rgba(62,207,142,.7)]" title="Live updates enabled" />
        </div>

        <nav className="flex md:flex-col gap-1.5 flex-wrap">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-mute hover:text-cloud hover:bg-panel border border-transparent hover:border-line transition-all"
            >
              <span className="w-6 text-center text-base text-mute group-hover:text-mint">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden md:block mt-10 px-3">
          <div className="rounded-xl border border-line bg-ink/50 p-4">
            <p className="text-xs font-medium text-cloud">Live data</p>
            <p className="text-xs text-mute mt-1">Winner, draw and platform changes update automatically.</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 py-7 md:py-10">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
