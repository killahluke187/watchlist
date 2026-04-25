import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import {
  pool,
  initSchema,
  selectEntriesSortedDesc,
  getEntryById,
  insertEntry,
  updateEntryRow,
  deleteEntryById,
  selectUsers,
  findUserCanonical,
  insertUser,
  deleteUserByName,
  type Entry,
} from "./db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const CLIENT_DIST = path.resolve(ROOT, "..", "client", "dist");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const PORT = Number(process.env.PORT) || 3001;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

type PublicEntry = Omit<Entry, "submitterIp" | "submittedBy">;
type AdminEntry = Omit<Entry, "submitterIp">;

function publicView(e: Entry): PublicEntry {
  const { submitterIp: _ip, submittedBy: _by, ...rest } = e;
  return rest;
}

function adminEntryView(e: Entry): AdminEntry {
  const { submitterIp: _ip, ...rest } = e;
  return rest;
}

function getClientIp(req: Request): string | null {
  return req.ip || null;
}

function isAdminAuth(req: Request): boolean {
  return req.header("x-admin-password") === ADMIN_PASSWORD;
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

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (isAdminAuth(req)) return next();
  return res.status(401).json({ error: "unauthorized" });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body ?? {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  return res.status(401).json({ ok: false });
});

app.post("/api/auth/check", async (req, res) => {
  const { username } = req.body ?? {};
  if (typeof username !== "string") return res.status(401).json({ ok: false });
  const canonical = await findUserCanonical(username);
  if (!canonical) return res.status(401).json({ ok: false });
  return res.json({ ok: true });
});

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  res.json(await selectUsers());
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const { username } = req.body ?? {};
  if (typeof username !== "string") {
    return res.status(400).json({ error: "username required" });
  }
  const normalized = username.trim();
  if (!normalized) return res.status(400).json({ error: "username required" });
  if (normalized.length > 40) return res.status(400).json({ error: "username too long" });
  if (!/^[a-zA-Z0-9_.\-]+$/.test(normalized)) {
    return res.status(400).json({ error: "letters, digits, dot, dash, underscore only" });
  }
  const result = await insertUser(normalized);
  if (!result.ok) return res.status(409).json({ error: "user already exists" });
  res.status(201).json(await selectUsers());
});

app.delete("/api/admin/users/:username", requireAdmin, async (req, res) => {
  const removed = await deleteUserByName(req.params.username);
  if (!removed) return res.status(404).json({ error: "not found" });
  res.json(await selectUsers());
});

app.get("/api/entries", async (req, res) => {
  const entries = await selectEntriesSortedDesc();
  const view = isAdminAuth(req) ? adminEntryView : publicView;
  res.json(entries.map(view));
});

app.post("/api/entries", async (req, res) => {
  const { username, name, reason, imageDataUrl, youtubeUrl, medalUrl, submittedBy } = req.body ?? {};
  if (typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ error: "username required" });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name required" });
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "reason required" });
  }

  let resolvedSubmittedBy: string | null = null;
  if (isAdminAuth(req)) {
    resolvedSubmittedBy = typeof submittedBy === "string" && submittedBy.trim()
      ? submittedBy.trim().slice(0, 40)
      : "admin";
  } else {
    if (typeof submittedBy !== "string") {
      return res.status(403).json({ error: "user not authorized" });
    }
    const canonical = await findUserCanonical(submittedBy);
    if (!canonical) return res.status(403).json({ error: "user not authorized" });
    resolvedSubmittedBy = canonical;
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
    submittedBy: resolvedSubmittedBy,
    submitterIp: getClientIp(req),
    createdAt: Date.now(),
  };

  await insertEntry(entry);
  const view = isAdminAuth(req) ? adminEntryView : publicView;
  res.status(201).json(view(entry));
});

app.put("/api/entries/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, name, reason, imageDataUrl, youtubeUrl, medalUrl, removeImage } = req.body ?? {};
  const current = await getEntryById(id);
  if (!current) return res.status(404).json({ error: "not found" });
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
  await updateEntryRow(next);
  res.json(adminEntryView(next));
});

app.delete("/api/entries/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const current = await getEntryById(id);
  if (!current) return res.status(404).json({ error: "not found" });
  deleteImage(current.imageFile);
  await deleteEntryById(id);
  res.json({ ok: true });
});

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

(async () => {
  try {
    await initSchema();
    console.log("postgres schema ready");
  } catch (err) {
    console.error("failed to initialize database:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`watchlist server on http://localhost:${PORT}`);
    console.log(`admin password: ${ADMIN_PASSWORD === "admin" ? "admin (CHANGE THIS!)" : "[set via env]"}`);
  });
})();

// graceful shutdown so the pool drains on SIGTERM (Render sends SIGTERM on redeploy)
function shutdown() {
  pool.end().finally(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
