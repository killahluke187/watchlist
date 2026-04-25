import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. The server cannot start without a Postgres connection.");
  console.error("Set DATABASE_URL in your environment (locally) or in Render's environment variables.");
  process.exit(1);
}

let useSsl = false;
try {
  const u = new URL(connectionString);
  // Render internal hostnames have no dots (e.g. dpg-xxxxx-a). External hosts do.
  // Internal connections inside Render do not need SSL; external ones do.
  useSsl = u.hostname.includes(".");
} catch {
  // ignore — fall through with useSsl=false; pool init will surface the real error
}

export const pool = new pg.Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  image_file TEXT,
  youtube_id TEXT,
  medal_embed_url TEXT,
  submitted_by TEXT,
  submitter_ip TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at DESC);
`;

export async function initSchema(): Promise<void> {
  await pool.query(SCHEMA_SQL);
}

export type Entry = {
  id: string;
  username: string;
  name: string;
  reason: string;
  imageFile: string | null;
  youtubeId: string | null;
  medalEmbedUrl: string | null;
  submittedBy: string | null;
  submitterIp: string | null;
  createdAt: number;
};

type EntryRow = {
  id: string;
  username: string;
  name: string;
  reason: string;
  image_file: string | null;
  youtube_id: string | null;
  medal_embed_url: string | null;
  submitted_by: string | null;
  submitter_ip: string | null;
  created_at: string;
};

function rowToEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    reason: r.reason,
    imageFile: r.image_file,
    youtubeId: r.youtube_id,
    medalEmbedUrl: r.medal_embed_url,
    submittedBy: r.submitted_by,
    submitterIp: r.submitter_ip,
    createdAt: Number(r.created_at),
  };
}

export async function selectEntriesSortedDesc(): Promise<Entry[]> {
  const r = await pool.query<EntryRow>(
    "SELECT * FROM entries ORDER BY created_at DESC"
  );
  return r.rows.map(rowToEntry);
}

export async function getEntryById(id: string): Promise<Entry | null> {
  const r = await pool.query<EntryRow>("SELECT * FROM entries WHERE id = $1", [id]);
  return r.rows[0] ? rowToEntry(r.rows[0]) : null;
}

export async function insertEntry(e: Entry): Promise<void> {
  await pool.query(
    `INSERT INTO entries
       (id, username, name, reason, image_file, youtube_id, medal_embed_url, submitted_by, submitter_ip, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      e.id, e.username, e.name, e.reason,
      e.imageFile, e.youtubeId, e.medalEmbedUrl,
      e.submittedBy, e.submitterIp, e.createdAt,
    ]
  );
}

export async function updateEntryRow(e: Entry): Promise<void> {
  await pool.query(
    `UPDATE entries SET
       username = $2,
       name = $3,
       reason = $4,
       image_file = $5,
       youtube_id = $6,
       medal_embed_url = $7,
       submitted_by = $8
     WHERE id = $1`,
    [
      e.id, e.username, e.name, e.reason,
      e.imageFile, e.youtubeId, e.medalEmbedUrl, e.submittedBy,
    ]
  );
}

export async function deleteEntryById(id: string): Promise<boolean> {
  const r = await pool.query("DELETE FROM entries WHERE id = $1", [id]);
  return (r.rowCount ?? 0) > 0;
}

export async function selectUsers(): Promise<string[]> {
  const r = await pool.query<{ username: string }>(
    "SELECT username FROM users ORDER BY username"
  );
  return r.rows.map((u) => u.username);
}

export async function findUserCanonical(name: string): Promise<string | null> {
  const r = await pool.query<{ username: string }>(
    "SELECT username FROM users WHERE LOWER(username) = LOWER($1)",
    [name.trim()]
  );
  return r.rows[0]?.username ?? null;
}

export type InsertUserResult =
  | { ok: true }
  | { ok: false; reason: "duplicate" };

export async function insertUser(name: string): Promise<InsertUserResult> {
  const existing = await findUserCanonical(name);
  if (existing) return { ok: false, reason: "duplicate" };
  await pool.query("INSERT INTO users (username) VALUES ($1)", [name]);
  return { ok: true };
}

export async function deleteUserByName(name: string): Promise<boolean> {
  const r = await pool.query(
    "DELETE FROM users WHERE LOWER(username) = LOWER($1)",
    [name.trim()]
  );
  return (r.rowCount ?? 0) > 0;
}
