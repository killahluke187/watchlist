import { useState } from "react";
import PasteMedia from "./PasteMedia";
import { updateEntry } from "../api";
import { youtubeEmbedUrl, youtubeWatchUrl } from "../youtube";
import type { Entry, MediaInput } from "../types";

type Props = {
  entry: Entry;
  password: string;
  onSaved: (entry: Entry) => void;
  onCancel: () => void;
};

export default function EditEntryForm({ entry, password, onSaved, onCancel }: Props) {
  const [username, setUsername] = useState(entry.username);
  const [name, setName] = useState(entry.name);
  const [reason, setReason] = useState(entry.reason);
  const [newMedia, setNewMedia] = useState<MediaInput | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExisting = Boolean(entry.imageFile || entry.youtubeId || entry.medalEmbedUrl);
  const showCurrent = hasExisting && !removeExisting && !newMedia;
  const showPasteZone = !hasExisting || removeExisting || Boolean(newMedia);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !name.trim() || !reason.trim()) {
      setError("username, name and reason are required");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await updateEntry(entry.id, password, {
        username: username.trim(),
        name: name.trim(),
        reason: reason.trim(),
        imageDataUrl: newMedia?.kind === "image" ? newMedia.dataUrl : undefined,
        youtubeUrl: newMedia?.kind === "youtube" ? newMedia.url : undefined,
        medalUrl: newMedia?.kind === "medal" ? newMedia.url : undefined,
        removeImage: removeExisting && !newMedia,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <label>
        <span>username</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={80}
        />
      </label>
      <label>
        <span>name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
      </label>
      <label>
        <span>reason</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={4000}
        />
      </label>
      <label>
        <span>screenshot, youtube link, or medal clip</span>
        {showCurrent && (
          <div className="paste-preview">
            {entry.imageFile && <img src={`/uploads/${entry.imageFile}`} alt="" />}
            {entry.youtubeId && (
              <>
                <div className="youtube-frame">
                  <iframe
                    src={youtubeEmbedUrl(entry.youtubeId)}
                    title="YouTube video"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                  />
                </div>
                <a
                  className="youtube-link"
                  href={youtubeWatchUrl(entry.youtubeId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {youtubeWatchUrl(entry.youtubeId)}
                </a>
              </>
            )}
            {entry.medalEmbedUrl && (
              <>
                <div className="youtube-frame">
                  <iframe
                    src={entry.medalEmbedUrl}
                    title="Medal clip"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <a
                  className="youtube-link"
                  href={entry.medalEmbedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {entry.medalEmbedUrl}
                </a>
              </>
            )}
            <button
              type="button"
              className="paste-remove"
              onClick={() => setRemoveExisting(true)}
            >
              remove current
            </button>
          </div>
        )}
        {showPasteZone && <PasteMedia value={newMedia} onChange={setNewMedia} />}
      </label>
      {error && <div className="error">{error}</div>}
      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? "saving..." : "save"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>
          cancel
        </button>
      </div>
    </form>
  );
}
