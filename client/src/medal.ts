export function isMedalUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.hostname.replace(/^www\./, "") === "medal.tv";
  } catch {
    return false;
  }
}
