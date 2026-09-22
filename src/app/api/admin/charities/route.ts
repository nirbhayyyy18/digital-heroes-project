import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return caller?.role === "admin";
}

// POST — Add charity
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim();
    const logoUrl = String(body.logo_url || "").trim();
    const coverImageUrl = String(body.cover_image_url || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Charity name is required." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Charity description is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data, error } = await admin
      .from("charities")
      .insert({
        name,
        slug,
        description,
        category: category || null,
        logo_url: logoUrl || null,
        cover_image_url: coverImageUrl || null,
        is_spotlight: Boolean(body.is_spotlight),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath("/admin/charities");
    revalidatePath("/charities");
    revalidatePath("/");

    return NextResponse.json({
      charity: data,
    });
  } catch (error: any) {
    console.error("Add charity error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to add charity.",
      },
      { status: 500 }
    );
  }
}

// PATCH — Edit charity or deactivate
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Charity id is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Deactivate charity
    if (body._action === "delete") {
      const { error } = await admin
        .from("charities")
        .update({
          is_active: false,
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      revalidatePath("/admin/charities");
      revalidatePath("/charities");
      revalidatePath("/");
      
      return NextResponse.json({
        ok: true,
      });
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          { error: "Charity name cannot be empty." },
          { status: 400 }
        );
      }

      updates.name = name;
    }

    if (body.description !== undefined) {
      const description = String(body.description).trim();

      if (!description) {
        return NextResponse.json(
          { error: "Charity description cannot be empty." },
          { status: 400 }
        );
      }

      updates.description = description;
    }

    if (body.category !== undefined) {
      const category = String(body.category).trim();
      updates.category = category || null;
    }

    if (body.logo_url !== undefined) {
      const logoUrl = String(body.logo_url).trim();
      updates.logo_url = logoUrl || null;
    }

    if (body.cover_image_url !== undefined) {
      const coverImageUrl = String(body.cover_image_url).trim();
      updates.cover_image_url = coverImageUrl || null;
    }

    if (body.is_spotlight !== undefined) {
      updates.is_spotlight = Boolean(body.is_spotlight);
    }

    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No changes supplied." },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("charities")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath("/admin/charities");
    revalidatePath("/charities");
    revalidatePath(`/charities/${id}`);
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("Update charity error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to update charity.",
      },
      { status: 500 }
    );
  }
}