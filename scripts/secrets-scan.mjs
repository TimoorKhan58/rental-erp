#!/usr/bin/env node
/**
 * Portable secret / credential pattern scan for tracked source (Phase 8-009).
 * Does not replace Gitleaks or GitHub Secret Scanning — use those in CI when available.
 *
 * Usage: npm run secrets:scan
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PATTERNS = [
  {
    name: "private-key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "aws-access-key",
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: "generic-api-key-assignment",
    regex:
      /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"]{16,}['"]/i,
  },
  {
    name: "password-assignment",
    regex: /(?:password|passwd)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  },
  {
    name: "postgres-url-with-credentials",
    regex: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i,
  },
];

const ALLOWED_PATH_FRAGMENTS = [
  ".env.example",
  ".env.staging.example",
  ".env.production.example",
  ".env.docker.example",
  "docs/",
  "package-lock.json",
  ".gitleaks.toml",
  "scripts/secrets-scan.mjs",
  "SECURITY_HARDENING.md",
  "env.test-fixture.ts",
  "env.validation.test.ts",
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  "fixtures.ts",
  "/tests/",
  "\\tests\\",
];

const ALLOWED_LINE_SNIPPETS = [
  "docker-build-placeholder",
  "replace-with-at-least-32-character-secret",
  "local-dev-placeholder",
  "local-development-secret",
  "test-secret-that-is-at-least-32",
  "postgresql://user:password@",
  "postgresql://rental:password@",
  "postgresql://test:test@",
  "postgresql://ci:ci@",
  "postgresql://build:build@",
  "password: \"super-secret\"",
  "password: 'secret'",
  'password: "secret"',
  "password: \"nope\"",
];

function listTrackedFiles() {
  try {
    const out = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    console.warn(
      "[secrets:scan] git ls-files unavailable — scanning common source roots",
    );
    return walk(["src", "nginx", "scripts", "prisma", ".github", "docs"]);
  }
}

function walk(dirs) {
  const files = [];
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk([rel]));
      } else {
        files.push(rel.replace(/\\/g, "/"));
      }
    }
  }
  return files;
}

function isAllowedPath(file) {
  const normalized = file.replace(/\\/g, "/");
  return ALLOWED_PATH_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}

function isAllowedLine(line) {
  return ALLOWED_LINE_SNIPPETS.some((snippet) => line.includes(snippet));
}

const findings = [];

for (const file of listTrackedFiles()) {
  if (isAllowedPath(file)) continue;
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|env|pem|key|md|sh|ps1|toml)$/i.test(file)) {
    continue;
  }

  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;

  let content;
  try {
    content = fs.readFileSync(abs, "utf8");
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isAllowedLine(line)) return;
    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          file,
          line: index + 1,
          pattern: pattern.name,
          preview: line.trim().slice(0, 120),
        });
      }
    }
  });
}

if (findings.length > 0) {
  console.error("[secrets:scan] Potential secrets detected:\n");
  for (const finding of findings) {
    console.error(
      `  ${finding.file}:${finding.line} [${finding.pattern}] ${finding.preview}`,
    );
  }
  process.exit(1);
}

console.log("[secrets:scan] No high-confidence secret patterns in scanned files.");
