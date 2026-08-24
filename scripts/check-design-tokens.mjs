import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const tokenFile = join(sourceRoot, "design-system.ts");
const extensions = new Set([".css", ".html", ".js", ".mjs", ".ts"]);

function files(path) {
  return readdirSync(path).flatMap(name => {
    const target = join(path, name);
    if (statSync(target).isDirectory()) return files(target);
    const extension = name.slice(name.lastIndexOf("."));
    return extensions.has(extension) ? [target] : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

const tokenSource = readFileSync(tokenFile, "utf8");
const definitions = new Set([...tokenSource.matchAll(/(--bc-[a-z0-9-]+)\s*:/gi)].map(match => match[1]));
const tokenPreludeEnd = tokenSource.indexOf("export function betterCodexDesignTokensCss");
const errors = [];

for (const file of files(sourceRoot)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/gi)) {
    const lineStart = source.lastIndexOf("\n", match.index) + 1;
    const lineEnd = source.indexOf("\n", match.index);
    const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd);
    const isTokenPrimitive = file === tokenFile && (match.index < tokenPreludeEnd || /--bc-[a-z0-9-]+\s*:/i.test(line));
    if (!isTokenPrimitive) {
      errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} hardcoded_color ${match[0]}`);
    }
  }
  if (file !== tokenFile) {
    for (const match of source.matchAll(/(--bc-[a-z0-9-]+)\s*:/gi)) {
      errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} token_definition_outside_design_system ${match[1]}`);
    }
  }
  for (const match of source.matchAll(/var\((--bc-[a-z0-9-]+)/gi)) {
    if (!definitions.has(match[1]) && !match[1].startsWith("--bc-host-")) {
      errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} undefined_design_token ${match[1]}`);
    }
  }
}

if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
}
