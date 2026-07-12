import type { LogLevel } from "@/shared/config/env.schema";

/**
 * Redact sensitive keys from log metadata before emission.
 * Never log secrets, tokens, passwords, or full connection strings.
 */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|api[_-]?key|cookie|set-cookie|database_url|connectionstring|private[_-]?key|credit[_-]?card|ssn)/i;

const REDACTED = "[REDACTED]";

export function isSensitiveLogKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function redactSensitiveValue(key: string, value: unknown): unknown {
  if (isSensitiveLogKey(key)) {
    return REDACTED;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      redactSensitiveValue(String(index), item),
    );
  }

  if (typeof value === "object") {
    return redactSensitiveFields(value as Record<string, unknown>);
  }

  if (typeof value === "string" && looksLikeConnectionString(value)) {
    return REDACTED;
  }

  return value;
}

export function redactSensitiveFields(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    output[key] = redactSensitiveValue(key, value);
  }

  return output;
}

function looksLikeConnectionString(value: string): boolean {
  return (
    /^postgres(ql)?:\/\//i.test(value) ||
    /^mongodb(\+srv)?:\/\//i.test(value) ||
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i.test(value)
  );
}

export function serializeErrorForLog(
  error: unknown,
): Record<string, unknown> | undefined {
  if (error === undefined) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return { errorValue: error };
}

export type LogFormat = "json" | "pretty";

export function formatStructuredLogLine(input: {
  level: LogLevel | string;
  message: string;
  timestamp?: string;
  service?: string;
  bindings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: unknown;
}): string {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const payload = redactSensitiveFields({
    ...(input.bindings ?? {}),
    ...(input.meta ?? {}),
    ...(serializeErrorForLog(input.error) ?? {}),
  });

  return JSON.stringify({
    timestamp,
    level: String(input.level).toLowerCase(),
    service: input.service ?? "rental-erp",
    message: input.message,
    ...payload,
  });
}
