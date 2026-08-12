import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readHubSecret(fileVariable: string, valueVariable: string) {
  const file = process.env[fileVariable];
  return (file ? readFileSync(resolve(file), "utf8") : process.env[valueVariable] || "").trim();
}

export function validateWebPassword(password: string) {
  if (password.length < 12 || password.length > 1024 || password.includes("\0")) throw new Error("hub_web_password_invalid");
  return password;
}

export function validateWebUsername(usernameValue: string) {
  const username = usernameValue.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._@-]{2,63}$/.test(username)) throw new Error("hub_web_username_invalid");
  return username;
}

export function passwordHash(passwordValue: string) {
  const password = validateWebPassword(passwordValue);
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

export function passwordMatches(passwordValue: string, encoded: string) {
  try {
    const [algorithm, cost, blockSize, parallelism, saltValue, digestValue] = encoded.split("$");
    if (algorithm !== "scrypt" || !saltValue || !digestValue) return false;
    const password = validateWebPassword(passwordValue);
    const expected = Buffer.from(digestValue, "base64url");
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length, { N: Number(cost), r: Number(blockSize), p: Number(parallelism), maxmem: 64 * 1024 * 1024 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function cookies(header: string | undefined) {
  const result = new Map<string, string>();
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key && value) result.set(key, value);
  }
  return result;
}

export function webSessionCookie(token: string, secure = true, maxAgeSeconds = 12 * 60 * 60) {
  return `better_codex_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function clearWebSessionCookie(secure = true) {
  return `better_codex_session=deleted; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}
