import Link from "next/link";

export default function Navbar() {
  return (
    <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
      <Link href="/" className="font-display text-xl font-semibold tracking-tight">
        digital<span className="text-mint">.</span>heroes
      </Link>
      <nav className="hidden sm:flex items-center gap-8 text-sm text-mute">
        <Link href="/charities" className="hover:text-cloud transition-colors">
          Charities
        </Link>
        <Link href="/login" className="hover:text-cloud transition-colors">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary !px-5 !py-2 text-sm">
          Subscribe
        </Link>
      </nav>
    </header>
  );
}
