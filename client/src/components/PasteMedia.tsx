import { useEffect, useRef, useState } from "react";
import { extractYouTubeId, youtubeEmbedUrl, youtubeWatchUrl } from "../youtube";
import { isMedalUrl } from "../medal";
import type { MediaInput } from "../types";

type Props = {
  value: MediaInput | null;
  onChange: (m: MediaInput | null) => void;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

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
              if (file.size > MAX_IMAGE_BYTES) {
                setHint("image too large (max 8 MB)");
                return;
              }
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

  function tryAcceptUrl(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const yt = extractYouTubeId(trimmed);
    if (yt) {
      onChange({ kind: "youtube", url: trimmed, id: yt });
      return true;
    }
    if (isMedalUrl(trimmed)) {
      onChange({ kind: "medal", url: trimmed });
      return true;
    }
    return false;
  }

  function onUrlChange(text: string) {
    setUrlInput(text);
    setUrlError(null);
    if (tryAcceptUrl(text)) setUrlInput("");
  }

  function onUrlAddClick() {
    if (!tryAcceptUrl(urlInput)) {
      setUrlError("not a youtube or medal link");
    } else {
      setUrlInput("");
    }
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setHint("not an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setHint("image too large (max 8 MB)");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    onChange({ kind: "image", dataUrl });
    setHint(null);
  }

  if (value) {
    return (
      <div className="paste-zone paste-zone--filled">
        {value.kind === "image" && (
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
        {value.kind === "youtube" && (
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
        {value.kind === "medal" && (
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
      </div>
    );
  }

  return (
    <div className="paste-media">
      <div
        ref={zoneRef}
        tabIndex={0}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`paste-zone${focused ? " paste-zone--focused" : ""}`}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <div className="paste-hint">
          desktop: click here, then paste (ctrl+v / right-click)
          {hint && <div className="error" style={{ marginTop: 6 }}>{hint}</div>}
        </div>
      </div>

      <div className="paste-alt">
        <div className="paste-alt-row">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="paste a youtube or medal link"
            inputMode="url"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="button" onClick={onUrlAddClick} disabled={!urlInput.trim()}>
            add link
          </button>
        </div>
        {urlError && <div className="error">{urlError}</div>}

        <button
          type="button"
          className="paste-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          upload an image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onFilePicked}
        />
      </div>
    </div>
  );
}
