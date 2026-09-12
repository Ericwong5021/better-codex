export function updateVersionAllowed(version: string, channel: "stable" | "preview") {
  return (channel === "stable" ? /^\d+\.\d+\.\d+$/ : /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/).test(version);
}

export function canonicalUpdateJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalUpdateJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${canonicalUpdateJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
