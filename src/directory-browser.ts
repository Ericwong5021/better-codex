import { readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, parse } from "node:path";
import type { DirectoryBrowserResult } from "./sync-contract.js";

const maxDirectoryEntries = 500;

function requestedDirectory(value: unknown) {
  if (value === undefined || value === null || value === "") return homedir();
  if (typeof value !== "string" || value.length > 4096 || value.includes("\0")) throw new Error("invalid_directory_path");
  const trimmed = value.trim();
  const expanded = trimmed === "~"
    ? homedir()
    : trimmed.startsWith("~/") || trimmed.startsWith("~\\")
      ? join(homedir(), trimmed.slice(2))
      : trimmed;
  if (!isAbsolute(expanded)) throw new Error("invalid_directory_path");
  return expanded;
}

export async function browseDirectory(value: unknown): Promise<DirectoryBrowserResult> {
  try {
    const path = await realpath(requestedDirectory(value));
    if (!(await stat(path)).isDirectory()) throw new Error("directory_unavailable");
    const entries = await readdir(path, { withFileTypes: true });
    const candidates = entries
      .filter(entry => entry.isDirectory() || entry.isSymbolicLink())
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
    const inspected = candidates.slice(0, maxDirectoryEntries * 2);
    const directories = (await Promise.all(inspected.map(async entry => {
      const entryPath = join(path, entry.name);
      if (entry.isSymbolicLink()) {
        try {
          if (!(await stat(entryPath)).isDirectory()) return null;
        } catch {
          return null;
        }
      }
      return { name: entry.name, path: entryPath };
    })))
      .filter((entry): entry is { name: string; path: string } => Boolean(entry));
    const parent = dirname(path);
    const homePath = await realpath(homedir()).catch(() => homedir());
    return {
      path,
      parent_path: parent === path ? null : parent,
      home_path: homePath,
      root_path: parse(path).root,
      directories: directories.slice(0, maxDirectoryEntries),
      truncated: directories.length > maxDirectoryEntries || candidates.length > inspected.length,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_directory_path") throw error;
    throw new Error("directory_unavailable");
  }
}
