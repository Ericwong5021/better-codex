import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const designRoot = join(sourceRoot, "ui", "design");
const baselineFile = join(root, "scripts", "design-literal-baseline.json");
const extensions = new Set([".css", ".html", ".js", ".mjs", ".ts"]);
const registryFiles = new Set([
  join(designRoot, "foundation.ts"),
  join(designRoot, "codex-semantic.ts"),
  join(designRoot, "product-semantic.ts"),
  join(designRoot, "brand.ts"),
  join(designRoot, "component.ts"),
  join(designRoot, "aliases.ts"),
]);
const colorPrimitiveFiles = new Set([...registryFiles].filter(file => !file.endsWith("component.ts") && !file.endsWith("aliases.ts")));
const debtRules = {
  spacing: /(?:^|[;{]\s*)(?<property>gap|row-gap|column-gap|margin(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?|padding(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left)\s*:\s*(?<value>[^;}\n]+)/gim,
  fontSize: /(?:^|[;{]\s*)(?<property>font-size)\s*:\s*(?<value>[^;}\n]+)/gim,
  lineHeight: /(?:^|[;{]\s*)(?<property>line-height)\s*:\s*(?<value>[^;}\n]+)/gim,
  radius: /(?:^|[;{]\s*)(?<property>border-radius)\s*:\s*(?<value>[^;}\n]+)/gim,
  shadow: /(?:^|[;{]\s*)(?<property>box-shadow)\s*:\s*(?<value>[^;}\n]+)/gim,
  duration: /(?:^|[;{]\s*)(?<property>transition(?:-duration)?|animation(?:-duration)?)\s*:\s*(?<value>[^;}\n]+)/gim,
  zIndex: /(?:^|[;{]\s*)(?<property>z-index)\s*:\s*(?<value>[^;}\n]+)/gim,
};

function files(path) {
  return readdirSync(path).flatMap(name => {
    const target = join(path, name);
    if (statSync(target).isDirectory()) return name === "generated" ? [] : files(target);
    const extension = name.slice(name.lastIndexOf("."));
    return extensions.has(extension) ? [target] : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function normalized(value) {
  return value.trim().replace(/\s+/g, " ");
}

function isDesignLiteral(category, value) {
  if (category === "shadow") return !/^(?:none|initial|inherit|var\(--bc-[^)]+\))$/i.test(value);
  if (category === "duration") return /(?:\d*\.)?\d+m?s\b/i.test(value);
  if (category === "zIndex") return /-?\d+/.test(value);
  if (category === "lineHeight") return /(?:\d*\.)?\d+(?:px|rem|em|%)?\b/i.test(value);
  return /(?:\d*\.)?\d+(?:px|rem|em|vh|vw|dvh|dvw)\b/i.test(value);
}

const sourceFiles = files(sourceRoot);
const errors = [];
const definitionList = [...registryFiles].flatMap(file => [...readFileSync(file, "utf8").matchAll(/name:\s*"(--bc-[a-z0-9-]+)"/gi)].map(match => match[1]));
const definitions = new Set(definitionList);
if (definitionList.length !== definitions.size) errors.push("src/ui/design duplicate_design_token_name");
const aliasSource = readFileSync(join(designRoot, "aliases.ts"), "utf8");
const aliases = new Set([...aliasSource.matchAll(/name:\s*"(--bc-[a-z0-9-]+)"/gi)].map(match => match[1]));
for (const file of registryFiles) {
  if (file.endsWith("aliases.ts")) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/var\((--bc-[a-z0-9-]+)/gi)) {
    if (aliases.has(match[1])) errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} canonical_token_depends_on_legacy_alias ${match[1]}`);
  }
}
const debt = Object.fromEntries(Object.keys(debtRules).map(category => [category, new Map()]));

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/gi)) {
    if (!colorPrimitiveFiles.has(file)) errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} hardcoded_color ${match[0]}`);
  }
  for (const match of source.matchAll(/(--bc-[a-z0-9-]+)\s*:/gi)) {
    if (!file.startsWith(`${designRoot}/`)) {
      errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} token_definition_outside_design_registry ${match[1]}`);
    } else if (!definitions.has(match[1])) {
      errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} unregistered_design_token ${match[1]}`);
    }
  }
  for (const match of source.matchAll(/var\((--bc-[a-z0-9-]+)/gi)) {
    if (!definitions.has(match[1]) && !match[1].startsWith("--bc-host-")) {
      errors.push(`${relative(root, file)}:${lineNumber(source, match.index)} undefined_design_token ${match[1]}`);
    }
  }
  if (registryFiles.has(file)) continue;
  for (const [category, pattern] of Object.entries(debtRules)) {
    for (const match of source.matchAll(pattern)) {
      const value = normalized(match.groups.value);
      if (!isDesignLiteral(category, value)) continue;
      const signature = `${match.groups.property}:${value}`;
      const current = debt[category].get(signature) ?? { count: 0, location: "" };
      current.count += 1;
      if (!current.location) current.location = `${relative(root, file)}:${lineNumber(source, match.index)}`;
      debt[category].set(signature, current);
    }
  }
}

if (!existsSync(baselineFile)) {
  errors.push(`${relative(root, baselineFile)} missing_design_literal_baseline`);
} else {
  const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
  for (const [category, signatures] of Object.entries(debt)) {
    const allowed = baseline[category] ?? {};
    if (typeof allowed !== "object" || Array.isArray(allowed)) {
      errors.push(`${relative(root, baselineFile)} invalid_design_literal_category ${category}`);
      continue;
    }
    for (const [signature, count] of Object.entries(allowed)) {
      if (!Number.isInteger(count) || count < 1) errors.push(`${relative(root, baselineFile)} invalid_design_literal_count ${category} ${signature}`);
    }
    for (const [signature, value] of signatures) {
      if (value.count > (allowed[signature] ?? 0)) {
        errors.push(`${value.location} new_design_literal ${category} ${signature} count=${value.count} allowed=${allowed[signature] ?? 0}`);
      }
    }
  }
}

if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
}
