import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type CodexUserProfile = {
  id: string;
  name: string;
  email: string;
  handle: string;
  initials: string;
  color: string;
};

const defaultAuthPath = join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json");

const AVATAR_COLORS = [
  "#16a34a",
  "#2563eb",
  "#db2777",
  "#ea580c",
  "#7c3aed",
  "#0d9488",
  "#ca8a04",
  "#dc2626",
];

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const value = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function emailLocalPart(email: string) {
  const at = email.indexOf("@");
  return (at > 0 ? email.slice(0, at) : email).trim();
}

function openaiAuthClaim(payload: Record<string, unknown> | null) {
  const claim = payload?.["https://api.openai.com/auth"];
  return claim && typeof claim === "object" && !Array.isArray(claim) ? claim as Record<string, unknown> : null;
}

export function avatarInitials(name: string) {
  const source = name.trim();
  if (!source) return "?";
  const latin = source.match(/[A-Za-z]+/g);
  if (latin && latin.length >= 2) return (latin[0][0] + latin[1][0]).toUpperCase();
  if (latin && latin[0].length >= 2) return latin[0].slice(0, 2).toUpperCase();
  if (latin) return latin[0][0].toUpperCase();
  const chars = Array.from(source.replace(/\s+/g, ""));
  if (chars.length >= 2) return chars.slice(0, 2).join("");
  return chars[0] || "?";
}

export function avatarColor(seed: string) {
  let hash = 13;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] || AVATAR_COLORS[0];
}

export function readCodexUserProfile(path = defaultAuthPath): CodexUserProfile {
  const fallback: CodexUserProfile = {
    id: "",
    name: "你",
    email: "",
    handle: "",
    initials: "你",
    color: AVATAR_COLORS[0],
  };
  if (!existsSync(path)) return fallback;
  try {
    const auth = JSON.parse(readFileSync(path, "utf8")) as {
      tokens?: { id_token?: unknown; account_id?: unknown };
    };
    const token = typeof auth.tokens?.id_token === "string" ? auth.tokens.id_token : "";
    const payload = token ? decodeJwtPayload(token) : null;
    const openai = openaiAuthClaim(payload);
    const email = cleanName(payload?.email).toLowerCase();
    const name = cleanName(payload?.name) || emailLocalPart(email) || fallback.name;
    const handle = emailLocalPart(email);
    const id = cleanName(openai?.chatgpt_user_id)
      || cleanName(openai?.user_id)
      || cleanName(openai?.chatgpt_account_id)
      || cleanName(auth.tokens?.account_id)
      || handle;
    return {
      id,
      name,
      email,
      handle,
      initials: avatarInitials(name),
      color: avatarColor(email || name || id),
    };
  } catch {
    return fallback;
  }
}
