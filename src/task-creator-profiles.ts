import { lstatSync, readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { betterCodexHome } from "./config.js";

/** IDs here identify private display profiles, never an official platform creator. */
export type TaskCreatorProfile = { id: string; name: string; avatar: string | null };
type Mapping = { provider: string; account_id: string; host_id: string; thread_id?: string; source_task_id?: string; scope?: "task" | "source"; profile_id: string };
type Configuration = { schema_version: 1; profiles: Array<{ id: string; name: string; avatar_file?: string }>; mappings: Mapping[] };
type Identity = { provider: string; account_id: string; host_id: string; thread_id: string | null; source_task_id?: string };
const sourceKey = (value: Pick<Identity, "provider" | "account_id" | "host_id">) => JSON.stringify([value.provider, value.account_id, value.host_id]);
const key = (value: Mapping) => JSON.stringify([sourceKey(value), value.scope || "task", value.source_task_id || value.thread_id || null]);
const safeText = (value: unknown, max: number) => typeof value === "string" && !!value.trim() && value.length <= max && !value.includes("\0");
const privateFile = (path: string, max: number) => {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max || (process.platform !== "win32" && (stat.mode & 0o077))) throw new Error("creator_profile_file_invalid");
  return stat;
};

export function taskCreatorPngDataUrl(bytes: Buffer): string {
  if (bytes.length < 45 || bytes.length > 300_000 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("creator_avatar_invalid");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width > 512 || height > 512 || width * height > 262_144) throw new Error("creator_avatar_dimensions_invalid");
  let offset = 8, image = false, end = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString("ascii", offset + 4, offset + 8);
    if (length > bytes.length - offset - 12) throw new Error("creator_avatar_invalid");
    if (["acTL", "fcTL", "fdAT"].includes(type)) throw new Error("creator_avatar_animation_unsupported");
    if (type === "IDAT") image = true;
    offset += 12 + length;
    if (type === "IEND") { end = length === 0 && offset === bytes.length; break; }
  }
  if (!image || !end) throw new Error("creator_avatar_invalid");
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** Runtime-owned, bounded private cache. Reports cannot write or select these mappings. */
export class TaskCreatorProfiles {
  private configStamp = "";
  private configuration: Configuration | null = null;
  private avatars = new Map<string, { stamp: string; value: string | null }>();
  error: string | null = null;
  constructor(private readonly path = process.env.BETTER_CODEX_TASK_CREATOR_PROFILES || join(betterCodexHome, "task-creator-profiles.json")) {}

  private load() {
    try {
      const stat = privateFile(this.path, 128_000);
      const stamp = `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
      if (stamp === this.configStamp) return;
      const value = JSON.parse(readFileSync(this.path, "utf8")) as Configuration;
      if (value.schema_version !== 1 || !Array.isArray(value.profiles) || value.profiles.length > 32 || !Array.isArray(value.mappings) || value.mappings.length > 1_000) throw new Error("creator_profile_configuration_invalid");
      const ids = new Set<string>(), sources = new Set<string>();
      for (const profile of value.profiles) {
        if (!safeText(profile.id, 80) || !/^[a-zA-Z0-9_-]+$/.test(profile.id) || ids.has(profile.id) || !safeText(profile.name, 160)
          || (profile.avatar_file !== undefined && (!safeText(profile.avatar_file, 4096) || !isAbsolute(profile.avatar_file)))) throw new Error("creator_profile_configuration_invalid");
        ids.add(profile.id);
      }
      for (const mapping of value.mappings) {
        if (![mapping.provider, mapping.account_id, mapping.host_id].every(item => safeText(item, 200)) || ![undefined, "task", "source"].includes(mapping.scope)
          || (mapping.scope === "source" ? mapping.thread_id !== undefined || mapping.source_task_id !== undefined : !safeText(mapping.source_task_id || mapping.thread_id, 200))
          || (mapping.thread_id !== undefined && mapping.source_task_id !== undefined) || !ids.has(mapping.profile_id) || sources.has(key(mapping))) throw new Error("creator_profile_configuration_invalid");
        sources.add(key(mapping));
      }
      this.configuration = value; this.configStamp = stamp; this.avatars.clear(); this.error = null;
    } catch (error) {
      this.configuration = null; this.configStamp = ""; this.avatars.clear();
      this.error = (error as NodeJS.ErrnoException).code === "ENOENT" ? null : "creator_profile_configuration_unavailable";
    }
  }
  resolve(identity: Identity) {
    this.load();
    const candidates = this.configuration?.mappings.filter(item => sourceKey(item) === sourceKey(identity)) || [];
    const mapping = candidates.find(item => item.scope !== "source" && (item.source_task_id ? item.source_task_id === identity.source_task_id : item.thread_id === identity.thread_id)) || candidates.find(item => item.scope === "source");
    const profile = mapping && this.configuration?.profiles.find(item => item.id === mapping.profile_id);
    return profile ? { name: profile.name, local_profile_id: profile.id, display_source: "user_mapping" as const } : null;
  }
  profiles(): TaskCreatorProfile[] {
    this.load();
    return (this.configuration?.profiles || []).map(profile => {
      let avatar: string | null = null;
      if (profile.avatar_file) {
        try {
          const stat = privateFile(profile.avatar_file, 300_000);
          const stamp = `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
          const cached = this.avatars.get(profile.id);
          avatar = cached?.stamp === stamp ? cached.value : taskCreatorPngDataUrl(readFileSync(profile.avatar_file));
          this.avatars.set(profile.id, { stamp, value: avatar });
        } catch { this.avatars.delete(profile.id); }
      }
      return { id: profile.id, name: profile.name, avatar };
    });
  }
}
