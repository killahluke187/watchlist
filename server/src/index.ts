import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "entries.json");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const CLIENT_DIST = path.resolve(ROOT, "..", "client", "dist");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const PORT = Number(process.env.PORT) || 3001;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

type Entry = {
  id: string;
  username: string;
  name: string;
  reason: string;
  imageFile: string | null;
  youtubeId: string | null;
  medalEmbedUrl: string | null;
  submitterIp: string | null;
  createdAt: number;
};

type PublicEntry = Omit<Entry, "submitterIp">;

function publicView(e: Entry): PublicEntry {
  const { submitterIp: _ip, ...rest } = e;
  return rest;
}

function getClientIp(req: Request): string | null {
  return req.ip || null;
}

function readEntries(): Entry[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e: Partial<Entry>) => ({
      id: e.id!,
      username: e.username!,
      name: e.name!,
      reason: e.reason!,
      imageFile: e.imageFile ?? null,
      youtubeId: e.youtubeId ?? null,
      medalEmbedUrl: e.medalEmbedUrl ?? null,
      submitterIp: e.submitterIp ?? null,
      createdAt: e.createdAt!,
    }));
  } catch {
    return [];
  }
}

async function resolveMedalEmbedUrl(inputUrl: string): Promise<string | null> {
  try {
    const u = new URL(inputUrl.trim());
    if (u.hostname.replace(/^www\./, "") !== "medal.tv") return null;
    const endpoint = `https://api-v2.medal.tv/oembed?url=${encodeURIComponent(inputUrl.trim())}`;
    const res = await fetch(endpoint, { headers: { "User-Agent": "watchlist/1.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: unknown };
    if (typeof data.url !== "string") return null;
    const canonical = new URL(data.url);
    if (canonical.hostname.replace(/^www\./, "") !== "medal.tv") return null;
    return canonical.toString();
  } catch {
    return null;
  }
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    const isValid = (id: string) => /^[a-zA-Z0-9_-]{6,20}$/.test(id);
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0] || "";
      return isValid(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v") || "";
        return isValid(id) ? id : null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "embed", "v", "live"].includes(parts[0])) {
        return isValid(parts[1]) ? parts[1] : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeEntries(entries: Entry[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

function saveImageFromDataUrl(dataUrl: string): string | null {
  const match = /^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const ext = match[1].toLowerCase().replace("jpeg", "jpg");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) return null;
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

function deleteImage(filename: string | null) {
  if (!filename) return;
  const safe = path.basename(filename);
  const full = path.join(UPLOAD_DIR, safe);
  if (fs.existsSync(full)) {
    try { fs.unlinkSync(full); } catch { /* ignore */ }
  }
}

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-admin-password");
  if (header && header === ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: "unauthorized" });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body ?? {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  return res.status(401).json({ ok: false });
});

app.get("/api/entries", (_req, res) => {
  const entries = readEntries().sort((a, b) => b.createdAt - a.createdAt);
  res.json(entries.map(publicView));
});

app.post("/api/entries", async (req, res) => {
  const { username, name, reason, imageDataUrl, youtubeUrl, medalUrl } = req.body ?? {};
  if (typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ error: "username required" });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name required" });
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "reason required" });
  }
  let imageFile: string | null = null;
  let youtubeId: string | null = null;
  let medalEmbedUrl: string | null = null;
  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/")) {
    imageFile = saveImageFromDataUrl(imageDataUrl);
    if (!imageFile) return res.status(400).json({ error: "invalid image" });
  } else if (typeof youtubeUrl === "string" && youtubeUrl.trim()) {
    youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) return res.status(400).json({ error: "invalid youtube url" });
  } else if (typeof medalUrl === "string" && medalUrl.trim()) {
    medalEmbedUrl = await resolveMedalEmbedUrl(medalUrl);
    if (!medalEmbedUrl) return res.status(400).json({ error: "invalid medal url" });
  }
  const entry: Entry = {
    id: crypto.randomUUID(),
    username: username.trim().slice(0, 80),
    name: name.trim().slice(0, 200),
    reason: reason.trim().slice(0, 4000),
    imageFile,
    youtubeId,
    medalEmbedUrl,
    submitterIp: getClientIp(req),
    createdAt: Date.now(),
  };
  const entries = readEntries();
  entries.push(entry);
  writeEntries(entries);
  res.status(201).json(publicView(entry));
});

app.put("/api/entries/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, name, reason, imageDataUrl, youtubeUrl, medalUrl, removeImage } = req.body ?? {};
  const entries = readEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  const current = entries[idx];
  const next: Entry = { ...current };
  if (typeof username === "string" && username.trim()) next.username = username.trim().slice(0, 80);
  if (typeof name === "string" && name.trim()) next.name = name.trim().slice(0, 200);
  if (typeof reason === "string" && reason.trim()) next.reason = reason.trim().slice(0, 4000);
  if (removeImage) {
    deleteImage(current.imageFile);
    next.imageFile = null;
    next.youtubeId = null;
    next.medalEmbedUrl = null;
  }
  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/")) {
    const saved = saveImageFromDataUrl(imageDataUrl);
    if (!saved) return res.status(400).json({ error: "invalid image" });
    deleteImage(current.imageFile);
    next.imageFile = saved;
    next.youtubeId = null;
    next.medalEmbedUrl = null;
  } else if (typeof youtubeUrl === "string" && youtubeUrl.trim()) {
    const vid = extractYouTubeId(youtubeUrl);
    if (!vid) return res.status(400).json({ error: "invalid youtube url" });
    deleteImage(current.imageFile);
    next.imageFile = null;
    next.youtubeId = vid;
    next.medalEmbedUrl = null;
  } else if (typeof medalUrl === "string" && medalUrl.trim()) {
    const resolved = await resolveMedalEmbedUrl(medalUrl);
    if (!resolved) return res.status(400).json({ error: "invalid medal url" });
    deleteImage(current.imageFile);
    next.imageFile = null;
    next.youtubeId = null;
    next.medalEmbedUrl = resolved;
  }
  entries[idx] = next;
  writeEntries(entries);
  res.json(publicView(next));
});

app.delete("/api/entries/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const entries = readEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  deleteImage(entries[idx].imageFile);
  entries.splice(idx, 1);
  writeEntries(entries);
  res.json({ ok: true });
});

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`watchlist server on http://localhost:${PORT}`);
  console.log(`admin password: ${ADMIN_PASSWORD}`);
});
