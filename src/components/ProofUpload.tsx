"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProofUpload({ winnerId }: { winnerId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const path = `${winnerId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("winner-proofs").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("winner-proofs").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("winners")
      .update({ proof_url: pub.publicUrl, review_state: "submitted" })
      .eq("id", winnerId);

    setUploading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-mute"
      />
      <button onClick={handleUpload} disabled={!file || uploading} className="btn-ghost">
        {uploading ? "Uploading…" : "Upload proof screenshot"}
      </button>
      {error && <p className="text-amber text-sm w-full">{error}</p>}
    </div>
  );
}
