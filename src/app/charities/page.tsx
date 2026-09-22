import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const supabase = createClient();

  // Get all active charities for the directory
  const { data: allCharities } = await supabase
    .from("charities")
    .select("*")
    .eq("is_active", true)
    .order("is_spotlight", { ascending: false });

  // Get unique categories for the filter
  const categories = Array.from(
    new Set(
      (allCharities ?? [])
        .map((charity) => charity.category)
        .filter(
          (category): category is string =>
            Boolean(category && category.trim())
        )
    )
  ).sort();

  // Apply search + category filters
  let filteredCharities = allCharities ?? [];

  if (searchParams.q?.trim()) {
    const search = searchParams.q.trim().toLowerCase();

    filteredCharities = filteredCharities.filter((charity) =>
      charity.name.toLowerCase().includes(search)
    );
  }

  if (searchParams.category) {
    filteredCharities = filteredCharities.filter(
      (charity) => charity.category === searchParams.category
    );
  }

  return (
    <main>
      <Navbar />

      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="label-tag mb-4">Directory</p>

        <h1 className="font-display text-4xl font-semibold mb-8">
          Charities on the platform
        </h1>

        {/* Search + Category Filter */}
        <form
          className="grid md:grid-cols-[1fr_220px_auto] gap-3 mb-10"
          method="get"
        >
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search charities…"
            className="bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />

          <select
            name="category"
            defaultValue={searchParams.category ?? ""}
            className="bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          >
            <option value="">All categories</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button className="btn-ghost" type="submit">
            Filter
          </button>
        </form>

        {/* Active filters */}
        {(searchParams.q || searchParams.category) && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <p className="text-mute text-sm">
              Showing {filteredCharities.length} result
              {filteredCharities.length !== 1 ? "s" : ""}
            </p>

            <Link
              href="/charities"
              className="text-sm text-mint hover:underline"
            >
              Clear filters
            </Link>
          </div>
        )}

        {/* Charity Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredCharities.map((c) => (
            <Link
              href={`/charities/${c.id}`}
              key={c.id}
              className="card block hover:border-mint transition-colors"
            >
              {c.is_spotlight && (
                <span className="label-tag text-mint mb-2 block">
                  Spotlight
                </span>
              )}

              <h3 className="font-display text-2xl mb-2">
                {c.name}
              </h3>

              <p className="text-mute text-sm line-clamp-3">
                {c.description}
              </p>

              {c.category && (
                <span className="label-tag mt-4 block">
                  {c.category}
                </span>
              )}
            </Link>
          ))}

          {filteredCharities.length === 0 && (
            <div className="card">
              <p className="text-mute">
                No charities match your search or selected category.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}