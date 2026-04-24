import { useEffect, useRef, useState } from "react";
import { extractYouTubeId, youtubeEmbedUrl, youtubeWatchUrl } from "../youtube";
import { isMedalUrl } from "../medal";
import type { MediaInput } from "../types";

type Props = {
  value: MediaInput | null;
  onChange: (m: MediaInput | null) => void;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PasteMedia({ value, onChange }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              const url = await fileToDataUrl(file);
              onChange({ kind: "image", dataUrl: url });
              setHint(null);
              return;
            }
          }
        }
      }
      const text = e.clipboardData?.getData("text");
      if (text) {
        const yt = extractYouTubeId(text);
        if (yt) {
          e.preventDefault();
          onChange({ kind: "youtube", url: text.trim(), id: yt });
          setHint(null);
          return;
        }
        if (isMedalUrl(text)) {
          e.preventDefault();
          onChange({ kind: "medal", url: text.trim() });
          setHint(null);
          return;
        }
        e.preventDefault();
        setHint("paste an image, youtube link, or medal clip link");
      }
    };
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [onChange]);

  return (
    <div
      ref={zoneRef}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`paste-zone${focused ? " paste-zone--focused" : ""}`}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {value?.kind === "image" && (
        <div className="paste-preview">
          <img src={value.dataUrl} alt="pasted screenshot" />
          <button
            type="button"
            className="paste-remove"
            onClick={() => { onChange(null); setHint(null); }}
          >
            remove
          </button>
        </div>
      )}
      {value?.kind === "youtube" && (
        <div className="paste-preview">
          <div className="youtube-frame">
            <iframe
              src={youtubeEmbedUrl(value.id)}
              title="YouTube video"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          </div>
          <a className="youtube-link" href={youtubeWatchUrl(value.id)} target="_blank" rel="noreferrer">
            {youtubeWatchUrl(value.id)}
          </a>
          <button
            type="button"
            className="paste-remove"
            onClick={() => { onChange(null); setHint(null); }}
          >
            remove
          </button>
        </div>
      )}
      {value?.kind === "medal" && (
        <div className="paste-preview">
          <div className="paste-hint" style={{ padding: 8 }}>
            medal clip detected — player will appear after saving
          </div>
          <a className="youtube-link" href={value.url} target="_blank" rel="noreferrer">
            {value.url}
          </a>
          <button
            type="button"
            className="paste-remove"
            onClick={() => { onChange(null); setHint(null); }}
          >
            remove
          </button>
        </div>
      )}
      {!value && (
        <div className="paste-hint">
          click here, then paste an image, youtube link, or medal clip link
          {hint && <div className="error" style={{ marginTop: 6 }}>{hint}</div>}
        </div>
      )}
    </div>
  );
}
