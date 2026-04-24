export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    const ok = (id: string) => /^[a-zA-Z0-9_-]{6,20}$/.test(id);
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0] || "";
      return ok(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v") || "";
        return ok(id) ? id : null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "embed", "v", "live"].includes(parts[0])) {
        return ok(parts[1]) ? parts[1] : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}
