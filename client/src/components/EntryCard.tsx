import { useState } from "react";
import { youtubeEmbedUrl, youtubeWatchUrl } from "../youtube";
import type { Entry } from "../types";

type Props = {
  entry: Entry;
  admin?: {
    onEdit: (entry: Entry) => void;
    onDelete: (id: string) => Promise<void>;
  };
};

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function EntryCard({ entry, admin }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performDelete() {
    if (!admin) return;
    setError(null);
    setBusy(true);
    try {
      await admin.onDelete(entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
      setBusy(false);
    }
  }

  const imgSrc = entry.imageFile ? `/uploads/${entry.imageFile}` : null;

  return (
    <div className="card entry">
      <div className="entry-head">
        <div className="entry-name">{entry.name}</div>
        <div className="entry-meta">added by {entry.username} · {formatDate(entry.createdAt)}</div>
        {entry.submittedBy && (
          <div className="entry-meta entry-meta--admin">auth user: {entry.submittedBy}</div>
        )}
      </div>
      <div className="entry-reason">{entry.reason}</div>
      {imgSrc && (
        <a className="entry-image-link" href={imgSrc} target="_blank" rel="noreferrer">
          <img className="entry-image" src={imgSrc} alt="" />
        </a>
      )}
      {entry.youtubeId && (
        <div className="entry-youtube">
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
        </div>
      )}
      {entry.medalEmbedUrl && (
        <div className="entry-youtube">
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
        </div>
      )}
      {admin && (
        <div className="row entry-actions">
          <button onClick={() => admin.onEdit(entry)} disabled={busy}>edit</button>
          {!confirmingDelete ? (
            <button
              className="danger"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
            >
              delete
            </button>
          ) : (
            <>
              <button className="danger" onClick={performDelete} disabled={busy}>
                {busy ? "deleting..." : "confirm"}
              </button>
              <button
                className="ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                cancel
              </button>
            </>
          )}
          {error && <span className="error">{error}</span>}
        </div>
      )}
    </div>
  );
}
