"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Charity } from "@/types/database";

type CharityEvent = {
  id: string;
  charity_id: string;
  title: string;
  description: string | null;
  event_date: string;
};

export default function CharityAdminForm({
  charities,
}: {
  charities: Charity[];
}) {
  const router = useRouter();

  // =========================================================
  // ADD CHARITY STATE
  // =========================================================
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // =========================================================
  // EDIT CHARITY STATE
  // =========================================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editCoverImageUrl, setEditCoverImageUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // =========================================================
  // EVENTS STATE
  // =========================================================
  const [expandedEvents, setExpandedEvents] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, CharityEvent[]>>({});
  const [eventsLoading, setEventsLoading] = useState<string | null>(null);

  // =========================================================
  // ADD EVENT STATE
  // =========================================================
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [eventCharityId, setEventCharityId] = useState<string | null>(null);

  // =========================================================
  // EDIT EVENT STATE
  // =========================================================
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventDescription, setEditEventDescription] = useState("");
  const [editEventSaving, setEditEventSaving] = useState(false);

  // =========================================================
  // ADD CHARITY
  // =========================================================
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/charities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          logo_url: logoUrl.trim(),
          cover_image_url: coverImageUrl.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));

        alert(body.error || "Failed to add charity.");
        return;
      }

      setName("");
      setDescription("");
      setCategory("");
      setLogoUrl("");
      setCoverImageUrl("");

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // START EDITING CHARITY
  // =========================================================
  function startEditing(charity: Charity) {
    setEditingId(charity.id);
    setEditName(charity.name);
    setEditDescription(charity.description ?? "");
    setEditCategory(charity.category ?? "");
    setEditLogoUrl(charity.logo_url ?? "");
    setEditCoverImageUrl(charity.cover_image_url ?? "");
  }

  // =========================================================
  // CANCEL EDITING CHARITY
  // =========================================================
  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditCategory("");
    setEditLogoUrl("");
    setEditCoverImageUrl("");
  }

  // =========================================================
  // EDIT CHARITY
  // =========================================================
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId || !editName.trim() || !editDescription.trim()) {
      return;
    }

    setEditSaving(true);

    try {
      const res = await fetch("/api/admin/charities", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          name: editName.trim(),
          description: editDescription.trim(),
          category: editCategory.trim(),
          logo_url: editLogoUrl.trim(),
          cover_image_url: editCoverImageUrl.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));

        alert(body.error || "Failed to update charity.");
        return;
      }

      cancelEditing();
      router.refresh();
    } finally {
      setEditSaving(false);
    }
  }

  // =========================================================
  // TOGGLE SPOTLIGHT
  // =========================================================
  async function toggleSpotlight(id: string, current: boolean) {
    const res = await fetch("/api/admin/charities", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        is_spotlight: !current,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));

      alert(body.error || "Failed to update spotlight.");
      return;
    }

    router.refresh();
  }

  // =========================================================
  // DEACTIVATE CHARITY
  // =========================================================
  async function remove(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this charity?"
    );

    if (!confirmed) {
      return;
    }

    const res = await fetch("/api/admin/charities", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        _action: "delete",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));

      alert(body.error || "Failed to deactivate charity.");
      return;
    }

    router.refresh();
  }

  // =========================================================
  // LOAD EVENTS
  // =========================================================
  async function loadEvents(charityId: string) {
    if (expandedEvents === charityId) {
      setExpandedEvents(null);
      return;
    }

    setExpandedEvents(charityId);
    setEventsLoading(charityId);

    try {
      const res = await fetch(
        `/api/admin/charities/events?charity_id=${encodeURIComponent(
          charityId
        )}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));

        alert(body.error || "Failed to load events.");
        return;
      }

      const body = await res.json();

      setEvents((current) => ({
        ...current,
        [charityId]: body.events ?? [],
      }));
    } finally {
      setEventsLoading(null);
    }
  }

  // =========================================================
  // OPEN ADD EVENT
  // =========================================================
  function openAddEvent(charityId: string) {
    setEventCharityId(charityId);

    setEventTitle("");
    setEventDate("");
    setEventDescription("");

    setEditingEventId(null);
  }

  // =========================================================
  // CANCEL ADD EVENT
  // =========================================================
  function cancelAddEvent() {
    setEventCharityId(null);

    setEventTitle("");
    setEventDate("");
    setEventDescription("");
  }

  // =========================================================
  // ADD EVENT
  // =========================================================
  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();

    if (!eventCharityId || !eventTitle.trim() || !eventDate) {
      return;
    }

    setEventSaving(true);

    try {
      const res = await fetch("/api/admin/charities/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          charity_id: eventCharityId,
          title: eventTitle.trim(),
          event_date: eventDate,
          description: eventDescription.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));

        alert(body.error || "Failed to add event.");
        return;
      }

      const body = await res.json();

      setEvents((current) => ({
        ...current,
        [eventCharityId]: [
          ...(current[eventCharityId] ?? []),
          body.event,
        ].sort(
          (a: CharityEvent, b: CharityEvent) =>
            new Date(a.event_date).getTime() -
            new Date(b.event_date).getTime()
        ),
      }));

      cancelAddEvent();

      router.refresh();
    } finally {
      setEventSaving(false);
    }
  }

  // =========================================================
  // START EDITING EVENT
  // =========================================================
  function startEditingEvent(event: CharityEvent) {
    setEditingEventId(event.id);
    setEditEventTitle(event.title);
    setEditEventDate(event.event_date.slice(0, 10));
    setEditEventDescription(event.description ?? "");
  }

  // =========================================================
  // CANCEL EDITING EVENT
  // =========================================================
  function cancelEditingEvent() {
    setEditingEventId(null);
    setEditEventTitle("");
    setEditEventDate("");
    setEditEventDescription("");
  }

  // =========================================================
  // EDIT EVENT
  // =========================================================
  async function handleEditEvent(
    e: React.FormEvent,
    charityId: string
  ) {
    e.preventDefault();

    if (
      !editingEventId ||
      !editEventTitle.trim() ||
      !editEventDate
    ) {
      return;
    }

    setEditEventSaving(true);

    try {
      const res = await fetch("/api/admin/charities/events", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingEventId,
          title: editEventTitle.trim(),
          event_date: editEventDate,
          description: editEventDescription.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));

        alert(body.error || "Failed to update event.");
        return;
      }

      setEvents((current) => ({
        ...current,
        [charityId]: (current[charityId] ?? [])
          .map((event) =>
            event.id === editingEventId
              ? {
                  ...event,
                  title: editEventTitle.trim(),
                  event_date: editEventDate,
                  description:
                    editEventDescription.trim() || null,
                }
              : event
          )
          .sort(
            (a, b) =>
              new Date(a.event_date).getTime() -
              new Date(b.event_date).getTime()
          ),
      }));

      cancelEditingEvent();

      router.refresh();
    } finally {
      setEditEventSaving(false);
    }
  }

  // =========================================================
  // DELETE EVENT
  // =========================================================
  async function deleteEvent(
    eventId: string,
    charityId: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmed) {
      return;
    }

    const res = await fetch(
      `/api/admin/charities/events?id=${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));

      alert(body.error || "Failed to delete event.");
      return;
    }

    setEvents((current) => ({
      ...current,
      [charityId]: (current[charityId] ?? []).filter(
        (event) => event.id !== eventId
      ),
    }));

    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* =====================================================
          ADD CHARITY
      ====================================================== */}
      <form
        onSubmit={handleAdd}
        className="card space-y-4"
      >
        <div>
          <p className="label-tag">Add a charity</p>

          <p className="text-mute text-sm mt-1">
            Add the charity information and optional media.
          </p>
        </div>

        {/* Name */}
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-ink border border-line rounded-lg px-4 py-3"
        />

        {/* Category */}
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-ink border border-line rounded-lg px-4 py-3"
        />

        {/* Description */}
        <textarea
          required
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-ink border border-line rounded-lg px-4 py-3 min-h-[100px]"
        />

        {/* Logo URL */}
        <input
          type="url"
          placeholder="Logo image URL (optional)"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className="w-full bg-ink border border-line rounded-lg px-4 py-3"
        />

        {/* Cover Image URL */}
        <input
          type="url"
          placeholder="Cover image URL (optional)"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="w-full bg-ink border border-line rounded-lg px-4 py-3"
        />

        {/* Logo Preview */}
        {logoUrl.trim() && (
          <div>
            <p className="label-tag mb-2">
              Logo preview
            </p>

            <img
              src={logoUrl}
              alt="Charity logo preview"
              className="h-20 w-20 rounded-lg object-cover border border-line"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Cover Preview */}
        {coverImageUrl.trim() && (
          <div>
            <p className="label-tag mb-2">
              Cover preview
            </p>

            <img
              src={coverImageUrl}
              alt="Charity cover preview"
              className="w-full max-h-48 rounded-lg object-cover border border-line"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        <button
          disabled={saving}
          className="btn-primary"
          type="submit"
        >
          {saving ? "Saving…" : "Add charity"}
        </button>
      </form>

      {/* =====================================================
          CHARITY LIST
      ====================================================== */}
      <div className="space-y-3">
        {charities.map((c) => {
          const isEditing = editingId === c.id;
          const charityEvents = events[c.id] ?? [];
          const isEventsOpen = expandedEvents === c.id;
          const isAddingEvent = eventCharityId === c.id;

          return (
            <div
              key={c.id}
              className="card space-y-5"
            >
              {isEditing ? (
                /* =================================================
                   EDIT CHARITY
                ================================================== */
                <form
                  onSubmit={handleEdit}
                  className="space-y-4"
                >
                  <div>
                    <p className="label-tag mb-2">
                      Edit charity
                    </p>

                    <h3 className="font-display text-xl">
                      {c.name}
                    </h3>
                  </div>

                  {/* Name */}
                  <input
                    required
                    placeholder="Name"
                    value={editName}
                    onChange={(e) =>
                      setEditName(e.target.value)
                    }
                    className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                  />

                  {/* Category */}
                  <input
                    placeholder="Category"
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value)
                    }
                    className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                  />

                  {/* Description */}
                  <textarea
                    required
                    placeholder="Description"
                    value={editDescription}
                    onChange={(e) =>
                      setEditDescription(e.target.value)
                    }
                    className="w-full bg-ink border border-line rounded-lg px-4 py-3 min-h-[120px]"
                  />

                  {/* Logo URL */}
                  <input
                    type="url"
                    placeholder="Logo image URL (optional)"
                    value={editLogoUrl}
                    onChange={(e) =>
                      setEditLogoUrl(e.target.value)
                    }
                    className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                  />

                  {/* Cover Image URL */}
                  <input
                    type="url"
                    placeholder="Cover image URL (optional)"
                    value={editCoverImageUrl}
                    onChange={(e) =>
                      setEditCoverImageUrl(e.target.value)
                    }
                    className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                  />

                  {/* Existing Logo Preview */}
                  {editLogoUrl.trim() && (
                    <div>
                      <p className="label-tag mb-2">
                        Logo preview
                      </p>

                      <img
                        src={editLogoUrl}
                        alt="Charity logo preview"
                        className="h-20 w-20 rounded-lg object-cover border border-line"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Existing Cover Preview */}
                  {editCoverImageUrl.trim() && (
                    <div>
                      <p className="label-tag mb-2">
                        Cover preview
                      </p>

                      <img
                        src={editCoverImageUrl}
                        alt="Charity cover preview"
                        className="w-full max-h-48 rounded-lg object-cover border border-line"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="btn-primary"
                    >
                      {editSaving
                        ? "Saving…"
                        : "Save changes"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* =================================================
                      CHARITY INFORMATION
                  ================================================== */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={`${c.name} logo`}
                          className="h-16 w-16 rounded-lg object-cover border border-line shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display =
                              "none";
                          }}
                        />
                      ) : null}

                      <div>
                        <p className="font-display text-xl">
                          {c.name}
                        </p>

                        <p className="text-mute text-sm">
                          {c.category ?? "Uncategorised"}

                          {!c.is_active &&
                            " · inactive"}
                        </p>

                        {c.description && (
                          <p className="text-mute text-sm mt-2 max-w-2xl">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() =>
                          startEditing(c)
                        }
                        className="btn-ghost !px-4 !py-2 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          toggleSpotlight(
                            c.id,
                            c.is_spotlight
                          )
                        }
                        className="btn-ghost !px-4 !py-2 text-sm"
                      >
                        {c.is_spotlight
                          ? "Unspotlight"
                          : "Spotlight"}
                      </button>

                      <button
                        onClick={() =>
                          loadEvents(c.id)
                        }
                        className="btn-ghost !px-4 !py-2 text-sm"
                      >
                        {isEventsOpen
                          ? "Hide events"
                          : "Manage events"}
                      </button>

                      {c.is_active && (
                        <button
                          onClick={() =>
                            remove(c.id)
                          }
                          className="text-mute hover:text-amber text-sm"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      COVER IMAGE PREVIEW
                  ================================================== */}
                  {c.cover_image_url && (
                    <div>
                      <p className="label-tag mb-2">
                        Cover image
                      </p>

                      <img
                        src={c.cover_image_url}
                        alt={`${c.name} cover`}
                        className="w-full max-h-56 rounded-lg object-cover border border-line"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>
                  )}

                  {/* =================================================
                      EVENTS MANAGEMENT
                  ================================================== */}
                  {isEventsOpen && (
                    <div className="border-t border-line pt-5 space-y-5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="label-tag mb-1">
                            Events
                          </p>

                          <h4 className="font-display text-lg">
                            Charity events
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openAddEvent(c.id)
                          }
                          className="btn-primary !px-4 !py-2 text-sm"
                        >
                          + Add event
                        </button>
                      </div>

                      {/* Add Event Form */}
                      {isAddingEvent && (
                        <form
                          onSubmit={handleAddEvent}
                          className="bg-panel border border-line rounded-lg p-4 space-y-4"
                        >
                          <p className="label-tag">
                            New event
                          </p>

                          <input
                            required
                            placeholder="Event title"
                            value={eventTitle}
                            onChange={(e) =>
                              setEventTitle(
                                e.target.value
                              )
                            }
                            className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                          />

                          <input
                            required
                            type="date"
                            value={eventDate}
                            onChange={(e) =>
                              setEventDate(
                                e.target.value
                              )
                            }
                            className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                          />

                          <textarea
                            placeholder="Event description"
                            value={eventDescription}
                            onChange={(e) =>
                              setEventDescription(
                                e.target.value
                              )
                            }
                            className="w-full bg-ink border border-line rounded-lg px-4 py-3 min-h-[100px]"
                          />

                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={eventSaving}
                              className="btn-primary"
                            >
                              {eventSaving
                                ? "Saving…"
                                : "Add event"}
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelAddEvent
                              }
                              className="btn-ghost"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Loading */}
                      {eventsLoading === c.id && (
                        <p className="text-mute text-sm">
                          Loading events…
                        </p>
                      )}

                      {/* Empty Events */}
                      {eventsLoading !== c.id &&
                        charityEvents.length === 0 && (
                          <div className="border border-line rounded-lg p-4">
                            <p className="text-mute text-sm">
                              No events added for this
                              charity yet.
                            </p>
                          </div>
                        )}

                      {/* Event List */}
                      {eventsLoading !== c.id &&
                        charityEvents.length > 0 && (
                          <div className="space-y-3">
                            {charityEvents.map(
                              (event) => (
                                <div
                                  key={event.id}
                                  className="border border-line rounded-lg p-4"
                                >
                                  {editingEventId ===
                                  event.id ? (
                                    /* Edit Event */
                                    <form
                                      onSubmit={(e) =>
                                        handleEditEvent(
                                          e,
                                          c.id
                                        )
                                      }
                                      className="space-y-4"
                                    >
                                      <input
                                        required
                                        placeholder="Event title"
                                        value={
                                          editEventTitle
                                        }
                                        onChange={(e) =>
                                          setEditEventTitle(
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                                      />

                                      <input
                                        required
                                        type="date"
                                        value={
                                          editEventDate
                                        }
                                        onChange={(e) =>
                                          setEditEventDate(
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-ink border border-line rounded-lg px-4 py-3"
                                      />

                                      <textarea
                                        placeholder="Event description"
                                        value={
                                          editEventDescription
                                        }
                                        onChange={(e) =>
                                          setEditEventDescription(
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-ink border border-line rounded-lg px-4 py-3 min-h-[100px]"
                                      />

                                      <div className="flex gap-3">
                                        <button
                                          type="submit"
                                          disabled={
                                            editEventSaving
                                          }
                                          className="btn-primary"
                                        >
                                          {editEventSaving
                                            ? "Saving…"
                                            : "Save event"}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={
                                            cancelEditingEvent
                                          }
                                          className="btn-ghost"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    /* Event View */
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                      <div>
                                        <p className="label-tag mb-1">
                                          {new Date(
                                            event.event_date
                                          ).toLocaleDateString(
                                            "en-IN",
                                            {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            }
                                          )}
                                        </p>

                                        <h5 className="font-display text-lg">
                                          {event.title}
                                        </h5>

                                        {event.description && (
                                          <p className="text-mute text-sm mt-1">
                                            {
                                              event.description
                                            }
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex gap-3">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            startEditingEvent(
                                              event
                                            )
                                          }
                                          className="btn-ghost !px-3 !py-2 text-sm"
                                        >
                                          Edit
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteEvent(
                                              event.id,
                                              c.id
                                            )
                                          }
                                          className="text-mute hover:text-amber text-sm"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}