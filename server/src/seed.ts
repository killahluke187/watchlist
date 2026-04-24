import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "..", "data", "entries.json");
const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");

const usernames = [
  "modmaster", "watchdog", "reporter1", "ghostrider", "zero_cool",
  "nullbyte", "spectre", "anon_user", "admin_luke", "sentinel",
  "overseer", "redlight", "nightowl", "crash_test", "lurker",
];

const names = [
  "scammer_jim", "toxicplayer99", "ragequit_dan", "smurfqueen",
  "botnet_steve", "afk_champion", "salty_tony", "teamkiller42",
  "griefer_kev", "spam_master", "phish_hunter", "alt_account_17",
  "lag_switcher", "ddos_dave", "edgelord", "name_caller",
  "serial_reporter", "chat_flooder", "micspammer", "hacker_anon",
  "exploit_user", "cheater_5000", "account_seller", "key_logger",
  "farm_bot_x", "troll_king", "slur_thrower", "report_abuser",
  "match_fixer", "stat_padder", "leaderboard_fraud", "ranked_dodger",
  "queue_dodger", "boost_seller", "wall_hacker", "aim_botter",
  "discord_raider", "server_hopper", "ban_evader", "false_flagger",
];

const reasons = [
  "scammed me out of 3 items during a trade, blocked me right after",
  "using a wallhack, confirmed by the killcam - shooting through walls the entire match",
  "spamming slurs in voice chat, muted by 4 different people in the same game",
  "team killed everyone in spawn for three matches in a row",
  "ddosing the lobby whenever they start losing, massive lag spikes",
  "account trading - caught selling logins on the unofficial discord",
  "macro / autofire detected, fire rate is physically impossible",
  "queue dodging every time they get matched against good players",
  "aimbot, tracks through smoke every single engagement",
  "mass reporting innocent players to get them banned",
  "harassing new players in chat, told multiple people to uninstall",
  "account boosting service, openly advertising in lobby chat",
  "exploiting the map geometry to get under the floor",
  "confirmed alt of a previously banned account, same username pattern",
  "stream sniping, admitted it on their own twitch chat",
  "deliberately throwing ranked games to derank and stomp lower elo",
  "chat flooding to break the in-game chat for everyone else",
  "griefing objectives every round, standing in spawn and not moving",
  "doxxed another player in the lobby, posted irl name and city",
  "running a cheat marketplace - caught selling subscriptions",
  "mic spamming loud audio / ear rape for the entire match",
  "abusing a known exploit to duplicate currency",
  "match fixing with a friend on the enemy team to farm rewards",
  "selling accounts on third-party sites, posts updated weekly",
  "using a modified client to see through smokes",
  "bullying a minor in voice, did not stop after being asked",
  "using hate symbols as their profile picture and clan tag",
  "rage quitting every game they are losing and ruining it for teammates",
  "aimlock confirmed by two separate killcam reviews",
  "phishing attempt - sent me a fake login link claiming to be support",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const palettes = [
  { bg: "#1a1a2e", panel: "#0f1024", accent: "#e94560", text: "#f4f4f4" },
  { bg: "#16213e", panel: "#0b152a", accent: "#f39c12", text: "#f4f4f4" },
  { bg: "#2d1b4e", panel: "#1a0f2f", accent: "#9b59b6", text: "#f4f4f4" },
  { bg: "#1e3a5f", panel: "#112338", accent: "#3498db", text: "#f4f4f4" },
  { bg: "#2c2c2c", panel: "#1a1a1a", accent: "#e67e22", text: "#f4f4f4" },
  { bg: "#3a1c3a", panel: "#24122b", accent: "#ff6b81", text: "#f4f4f4" },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function makeScreenshotSvg(name: string, reason: string): string {
  const p = pick(palettes);
  const muted = "rgba(255,255,255,0.55)";
  const lines = wrapLine(reason, 44).slice(0, 4);
  const timestamp = `${Math.floor(Math.random() * 12) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")} ${Math.random() > 0.5 ? "PM" : "AM"}`;
  const safeName = xmlEscape(name);
  const safeLines = lines.map(xmlEscape);

  let y = 110;
  const lineEls = safeLines
    .map((l) => {
      const el = `<text x="80" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="${p.text}">${l}</text>`;
      y += 26;
      return el;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <rect width="640" height="360" fill="${p.bg}"/>
  <rect x="0" y="0" width="640" height="48" fill="${p.panel}"/>
  <circle cx="24" cy="24" r="6" fill="${p.accent}"/>
  <circle cx="44" cy="24" r="6" fill="${muted}"/>
  <circle cx="64" cy="24" r="6" fill="${muted}"/>
  <text x="90" y="30" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="${muted}">chat · #general</text>
  <circle cx="48" cy="92" r="18" fill="${p.accent}"/>
  <text x="80" y="86" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="600" fill="${p.accent}">${safeName}</text>
  <text x="${80 + safeName.length * 9 + 12}" y="86" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="${muted}">today at ${timestamp}</text>
  ${lineEls}
  <rect x="20" y="310" width="600" height="36" fill="${p.panel}" rx="6"/>
  <text x="36" y="333" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="${muted}">message #general</text>
</svg>`;
}

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

for (const f of fs.readdirSync(UPLOAD_DIR)) {
  if (f.endsWith(".seed.svg")) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch { /* ignore */ }
  }
}

const TOTAL = 83;
const IMAGE_RATE = 0.2;
const now = Date.now();
const MONTH = 30 * 24 * 60 * 60 * 1000;

const imageIndices = new Set<number>();
const targetWithImages = Math.round(TOTAL * IMAGE_RATE);
while (imageIndices.size < targetWithImages) {
  imageIndices.add(Math.floor(Math.random() * TOTAL));
}

const entries = Array.from({ length: TOTAL }, (_, i) => {
  const name = pick(names);
  const reason = pick(reasons);
  let imageFile: string | null = null;
  if (imageIndices.has(i)) {
    const filename = `${crypto.randomUUID()}.seed.svg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), makeScreenshotSvg(name, reason));
    imageFile = filename;
  }
  return {
    id: crypto.randomUUID(),
    username: pick(usernames),
    name,
    reason,
    imageFile,
    youtubeId: null,
    medalEmbedUrl: null,
    createdAt: now - Math.floor(Math.random() * MONTH) - i * 1000,
  };
});

fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
console.log(`seeded ${entries.length} entries (${imageIndices.size} with images) -> ${DATA_FILE}`);
