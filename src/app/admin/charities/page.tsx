import { createAdminClient } from "@/lib/supabase/admin";
import CharityAdminForm from "@/components/CharityAdminForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCharitiesPage() {
  const supabase = createAdminClient();

  const { data: charities, error } = await supabase
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
      is_spotlight,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <p className="label-tag mb-2">Charities</p>

          <h1 className="font-display text-3xl font-semibold">
            Charity management
          </h1>
        </div>

        <div className="card border-amber/40">
          <p className="font-medium text-amber">
            Could not load charities
          </p>

          <p className="text-sm text-mute mt-2">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-tag mb-2">
          Charities
        </p>

        <h1 className="font-display text-3xl font-semibold">
          Charity management
        </h1>
      </div>

      <CharityAdminForm
        charities={charities ?? []}
      />
    </div>
  );
}