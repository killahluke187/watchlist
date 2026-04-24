import { useState } from "react";
import PasteMedia from "./PasteMedia";
import { createEntry } from "../api";
import type { Entry, MediaInput } from "../types";

type Props = {
  onAdded: (entry: Entry) => void;
};

export default function AddEntryForm({ onAdded }: Props) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [media, setMedia] = useState<MediaInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !name.trim() || !reason.trim()) {
      setError("username, name and reason are required");
      return;
    }
    setBusy(true);
    try {
      const entry = await createEntry({
        username: username.trim(),
        name: name.trim(),
        reason: reason.trim(),
        imageDataUrl: media?.kind === "image" ? media.dataUrl : null,
        youtubeUrl: media?.kind === "youtube" ? media.url : null,
        medalUrl: media?.kind === "medal" ? media.url : null,
      });
      onAdded(entry);
      setName("");
      setReason("");
      setMedia(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <label>
        <span>your username</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="who is adding this"
          maxLength={80}
        />
      </label>
      <label>
        <span>name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="person / thing being added"
          maxLength={200}
        />
      </label>
      <label>
        <span>reason</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="why are they on the watchlist"
          rows={4}
          maxLength={4000}
        />
      </label>
      <label>
        <span>screenshot, youtube link, or medal clip (optional)</span>
        <PasteMedia value={media} onChange={setMedia} />
      </label>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={busy}>
        {busy ? "adding..." : "add entry"}
      </button>
    </form>
  );
}
