import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Status colours must stay readable in both themes (usability revamp R1).
 * Badges and cards draw `text-<kind>` or `text-<kind>-foreground` on
 * `bg-<kind>-muted`; in dark mode the warning text was once the same dark
 * brown as its background, which hid every warning.
 */
const css = readFileSync(path.resolve(process.cwd(), "src/styles/semantic.css"), "utf8");
const globals = readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block`);
  return source.slice(start, source.indexOf("}", start));
}

function tokens(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of source.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    result[match[1]!] = match[2]!.trim();
  }
  return result;
}

function resolve(name: string, palette: Record<string, string>): string {
  let value = palette[name];
  for (let depth = 0; value?.startsWith("var(--") && depth < 5; depth += 1) {
    value = palette[value.slice(6, -1)];
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`Cannot resolve --${name}: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const light = { ...tokens(block(globals, ":root")), ...tokens(block(css, ":root")) };
const dark = { ...light, ...tokens(block(globals, ".dark")), ...tokens(block(css, ".dark")) };

describe("status colours stay readable (usability revamp R1)", () => {
  for (const [theme, palette] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    for (const kind of ["warning", "success", "info", "error"]) {
      it(`${theme}: ${kind} text on its tinted background meets WCAG AA (4.5:1)`, () => {
        const background = resolve(`${kind}-muted`, palette);
        expect(contrast(resolve(kind, palette), background)).toBeGreaterThanOrEqual(4.5);
        if (kind === "warning") {
          expect(contrast(resolve(`${kind}-foreground`, palette), background)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});
