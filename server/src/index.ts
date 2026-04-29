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
  updateEntryFields,
  setEntryImage,
  clearEntryImage,
  getImageByFilename,
  deleteEntryById,
  selectUsers,
  findUserCanonical,
  insertUser,
  deleteUserByName,
  type Entry,
  type ImageBytes,
} from "./db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const CLIENT_DIST = path.resolve(ROOT, "..", "client", "dist");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const PORT = Number(process.env.PORT) || 3001;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

function parseImageDataUrl(dataUrl: string): ImageBytes | null {
  const match = /^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const subtype = match[1].toLowerCase();
  const ext = subtype.replace("jpeg", "jpg");
  const mime = `image/${subtype === "jpg" ? "jpeg" : subtype}`;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  const filename = `${crypto.randomUUID()}.${ext}`;
  return { filename, data: buffer, mime };
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

app.get("/uploads/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const result = await getImageByFilename(filename);
  if (!result) return res.status(404).type("text/plain").send("image not found");
  res.setHeader("Content-Type", result.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(result.data);
});

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

  let image: ImageBytes | null = null;
  let youtubeId: string | null = null;
  let medalEmbedUrl: string | null = null;
  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/")) {
    image = parseImageDataUrl(imageDataUrl);
    if (!image) return res.status(400).json({ error: "invalid image" });
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
    imageFile: image?.filename ?? null,
    youtubeId,
    medalEmbedUrl,
    submittedBy: resolvedSubmittedBy,
    submitterIp: getClientIp(req),
    createdAt: Date.now(),
  };

  await insertEntry(entry, image);
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

  let action:
    | { kind: "none" }
    | { kind: "clear" }
    | { kind: "set-image"; image: ImageBytes }
    | { kind: "set-youtube"; id: string }
    | { kind: "set-medal"; url: string } = { kind: "none" };

  if (removeImage) action = { kind: "clear" };
  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/")) {
    const parsed = parseImageDataUrl(imageDataUrl);
    if (!parsed) return res.status(400).json({ error: "invalid image" });
    action = { kind: "set-image", image: parsed };
  } else if (typeof youtubeUrl === "string" && youtubeUrl.trim()) {
    const vid = extractYouTubeId(youtubeUrl);
    if (!vid) return res.status(400).json({ error: "invalid youtube url" });
    action = { kind: "set-youtube", id: vid };
  } else if (typeof medalUrl === "string" && medalUrl.trim()) {
    const resolved = await resolveMedalEmbedUrl(medalUrl);
    if (!resolved) return res.status(400).json({ error: "invalid medal url" });
    action = { kind: "set-medal", url: resolved };
  }

  // apply field changes
  await updateEntryFields(next);

  // apply media change
  switch (action.kind) {
    case "clear":
      await clearEntryImage(id);
      next.imageFile = null;
      next.youtubeId = null;
      next.medalEmbedUrl = null;
      break;
    case "set-image":
      await setEntryImage(id, action.image);
      next.imageFile = action.image.filename;
      // youtubeId/medal stay in DB columns until cleared via fields update — clear them too
      await pool.query(
        "UPDATE entries SET youtube_id = NULL, medal_embed_url = NULL WHERE id = $1",
        [id]
      );
      next.youtubeId = null;
      next.medalEmbedUrl = null;
      break;
    case "set-youtube":
      await clearEntryImage(id);
      await pool.query(
        "UPDATE entries SET youtube_id = $2, medal_embed_url = NULL WHERE id = $1",
        [id, action.id]
      );
      next.imageFile = null;
      next.youtubeId = action.id;
      next.medalEmbedUrl = null;
      break;
    case "set-medal":
      await clearEntryImage(id);
      await pool.query(
        "UPDATE entries SET youtube_id = NULL, medal_embed_url = $2 WHERE id = $1",
        [id, action.url]
      );
      next.imageFile = null;
      next.youtubeId = null;
      next.medalEmbedUrl = action.url;
      break;
  }

  res.json(adminEntryView(next));
});

app.delete("/api/entries/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const current = await getEntryById(id);
  if (!current) return res.status(404).json({ error: "not found" });
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
