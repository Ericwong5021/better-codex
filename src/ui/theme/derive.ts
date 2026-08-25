import { betterCodexDefaultHostTheme, type HostThemeInput, type HostThemeProfile } from "./contract.js";

export interface DerivedHostTheme {
  tokens: Record<string, string>;
  contrastAdjustedTokens: string[];
}

function channels(value: string) {
  const match = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) throw new Error(`invalid_theme_color:${value}`);
  return match.slice(1).map(channel => Number.parseInt(channel, 16));
}

function luminance(value: string) {
  const values = channels(value).map(channel => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}

function contrast(left: string, right: string) {
  const first = luminance(left);
  const second = luminance(right);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

function mixedColor(ink: string, canvas: string, percentage: number) {
  const foreground = channels(ink);
  const background = channels(canvas);
  const ratio = percentage / 100;
  return `#${foreground.map((channel, index) => Math.round(channel * ratio + background[index] * (1 - ratio)).toString(16).padStart(2, "0")).join("")}`;
}

function guardedProfile(mode: "light" | "dark", profile: HostThemeProfile, adjusted: string[]) {
  const fallback = betterCodexDefaultHostTheme[mode];
  const next = { ...profile };
  if (contrast(next.ink, next.surface) < 4.5) {
    next.ink = fallback.ink;
    adjusted.push(`${mode}.ink`);
  }
  if (contrast(next.accent, next.surface) < 2) {
    next.accent = fallback.accent;
    adjusted.push(`${mode}.accent`);
  }
  return next;
}

export function deriveHostTheme(input: HostThemeInput, colorMixSupported: boolean): DerivedHostTheme {
  const tokens: Record<string, string> = {};
  const contrastAdjustedTokens: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const profile = guardedProfile(mode, input[mode], contrastAdjustedTokens);
    const amount = (value: number) => Math.round(value * profile.contrast / 50 * 100) / 100;
    const layer = (value: number) => colorMixSupported
      ? `color-mix(in srgb, ${profile.ink} ${amount(value)}%, ${profile.surface})`
      : mixedColor(profile.ink, profile.surface, amount(value));
    const prefix = `--bc-host-${mode}-`;
    tokens[`${prefix}canvas`] = profile.surface;
    tokens[`${prefix}ink`] = profile.ink;
    tokens[`${prefix}accent`] = profile.accent;
    tokens[`${prefix}surface`] = layer(2.5);
    tokens[`${prefix}control`] = layer(5);
    tokens[`${prefix}raised`] = layer(7.5);
    tokens[`${prefix}hover`] = layer(9);
    tokens[`${prefix}pressed`] = layer(12);
    tokens[`${prefix}hairline`] = layer(11);
    tokens[`${prefix}font-ui`] = profile.uiFont;
  }
  return { tokens, contrastAdjustedTokens };
}
