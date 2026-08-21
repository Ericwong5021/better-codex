import { passwordHash, passwordMatches, readHubSecret, validateWebPassword, validateWebUsername } from "./hub-auth.js";

export { passwordHash, passwordMatches, readHubSecret, validateWebPassword, validateWebUsername };

export function relaySessionCookie(token: string, secure = true, maxAgeSeconds?: number) {
  const lifetime = typeof maxAgeSeconds === "number" ? `; Max-Age=${Math.max(1, Math.floor(maxAgeSeconds))}` : "";
  return `better_codex_relay_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict${lifetime}${secure ? "; Secure" : ""}`;
}

export function clearRelaySessionCookie(secure = true) {
  return `better_codex_relay_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function parseCookies(header: string | undefined) {
  const values = new Map<string, string>();
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    try { values.set(key, decodeURIComponent(part.slice(index + 1).trim())); } catch {}
  }
  return values;
}
