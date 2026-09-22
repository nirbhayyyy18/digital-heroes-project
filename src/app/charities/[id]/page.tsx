import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CharityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // ---------------------------------------------------------
  // Load only active charities
  // ---------------------------------------------------------

  const { data: charity, error: charityError } = await supabase
    .from("charities")
    .select(`
      id,
      name,
      slug,
      description,
      category,
      logo_url,
      cover_image_url,
      is_active,
      is_spotlight
    `)
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  // ---------------------------------------------------------
  // If charity doesn't exist OR is inactive,
  // show the normal 404 page.
  // ---------------------------------------------------------

  if (charityError || !charity) {
    notFound();
  }

  // ---------------------------------------------------------
  // Load events belonging to this active charity
  // ---------------------------------------------------------

  const { data: events } = await supabase
    .from("charity_events")
    .select(`
      id,
      title,
      description,
      event_date
    `)
    .eq("charity_id", charity.id)
    .order("event_date", { ascending: true });

  return (
    <main>
      <Navbar />

      <section className="max-w-4xl mx-auto px-6 py-16">
        {/* Cover Image */}
        {charity.cover_image_url && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-line">
            <img
              src={charity.cover_image_url}
              alt={`${charity.name} cover`}
              className="w-full h-56 md:h-72 object-cover"
            />
          </div>
        )}

        {/* Charity Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Logo */}
          {charity.logo_url && (
            <div className="shrink-0">
              <img
                src={charity.logo_url}
                alt={`${charity.name} logo`}
                className="h-24 w-24 rounded-2xl object-cover border border-line"
              />
            </div>
          )}

          <div>
            {charity.is_spotlight && (
              <span className="label-tag text-mint mb-3 block">
                Spotlight charity
              </span>
            )}

            <h1 className="font-serifItalic italic text-4xl mb-3">
              {charity.name}
            </h1>

            {charity.category && (
              <p className="label-tag">
                {charity.category}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-8">
          <p className="text-mute leading-relaxed text-lg">
            {charity.description}
          </p>
        </div>

        {/* Upcoming Events */}
        <div className="mt-10">
          <h2 className="font-display text-2xl mb-4">
            Upcoming events
          </h2>

          {events && events.length > 0 ? (
            <ul className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="card">
                  <p className="label-tag mb-1">
                    {new Date(
                      event.event_date
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>

                  <h3 className="font-display text-xl mb-1">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-mute text-sm">
                      {event.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-mute text-sm">
              No events scheduled right now.
            </p>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/signup"
          className="btn-primary mt-10 inline-flex"
        >
          Subscribe &amp; support {charity.name}
        </Link>
      </section>
    </main>
  );
}