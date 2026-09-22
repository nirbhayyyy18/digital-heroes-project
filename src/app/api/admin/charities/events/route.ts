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

// GET — Get events for a charity
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const charityId = new URL(request.url).searchParams.get(
      "charity_id"
    );

    if (!charityId) {
      return NextResponse.json(
        { error: "charity_id is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: charity } = await admin
      .from("charities")
      .select("id")
      .eq("id", charityId)
      .maybeSingle();

    if (!charity) {
      return NextResponse.json(
        { error: "Charity not found." },
        { status: 404 }
      );
    }

    const { data: events, error } = await admin
      .from("charity_events")
      .select("*")
      .eq("charity_id", charityId)
      .order("event_date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events ?? [],
    });
  } catch (error: any) {
    console.error("Get charity events error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to load events.",
      },
      { status: 500 }
    );
  }
}

// POST — Add event
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const charityId = String(body.charity_id || "").trim();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const eventDate = String(body.event_date || "").trim();

    if (!charityId) {
      return NextResponse.json(
        { error: "Charity is required." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Event title is required." },
        { status: 400 }
      );
    }

    if (!eventDate || Number.isNaN(Date.parse(eventDate))) {
      return NextResponse.json(
        { error: "A valid event date is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: charity } = await admin
      .from("charities")
      .select("id")
      .eq("id", charityId)
      .maybeSingle();

    if (!charity) {
      return NextResponse.json(
        { error: "Charity not found." },
        { status: 404 }
      );
    }

    const { data, error } = await admin
      .from("charity_events")
      .insert({
        charity_id: charityId,
        title,
        description: description || null,
        event_date: eventDate,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath(`/charities/${charityId}`);
    revalidatePath("/admin/charities");

    return NextResponse.json({
      event: data,
    });
  } catch (error: any) {
    console.error("Add charity event error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to add event.",
      },
      { status: 500 }
    );
  }
}

// PATCH — Edit event
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
        { error: "Event id is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("charity_events")
      .select("charity_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();

      if (!title) {
        return NextResponse.json(
          { error: "Event title cannot be empty." },
          { status: 400 }
        );
      }

      updates.title = title;
    }

    if (body.description !== undefined) {
      const description = String(body.description).trim();
      updates.description = description || null;
    }

    if (body.event_date !== undefined) {
      const eventDate = String(body.event_date).trim();

      if (!eventDate || Number.isNaN(Date.parse(eventDate))) {
        return NextResponse.json(
          { error: "A valid event date is required." },
          { status: 400 }
        );
      }

      updates.event_date = eventDate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No changes supplied." },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("charity_events")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath(`/charities/${existing.charity_id}`);
    revalidatePath("/admin/charities");

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("Edit charity event error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to update event.",
      },
      { status: 500 }
    );
  }
}

// DELETE — Delete event
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Event id is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("charity_events")
      .select("charity_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const { error } = await admin
      .from("charity_events")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    revalidatePath(`/charities/${existing.charity_id}`);
    revalidatePath("/admin/charities");

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("Delete charity event error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to delete event.",
      },
      { status: 500 }
    );
  }
}