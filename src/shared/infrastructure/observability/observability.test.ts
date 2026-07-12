import { describe, expect, it } from "vitest";

import {
  formatStructuredLogLine,
  isSensitiveLogKey,
  redactSensitiveFields,
} from "@/shared/infrastructure/logging/log-redaction";
import { getMetricsRegistry } from "@/shared/infrastructure/observability/prometheus-registry";

describe("log redaction", () => {
  it("detects sensitive keys", () => {
    expect(isSensitiveLogKey("password")).toBe(true);
    expect(isSensitiveLogKey("BETTER_AUTH_SECRET")).toBe(true);
    expect(isSensitiveLogKey("route")).toBe(false);
  });

  it("redacts secrets and connection strings", () => {
    const redacted = redactSensitiveFields({
      route: "/api/customers",
      password: "super-secret",
      database_url: "postgresql://user:pass@localhost:5432/db",
      nested: { apiKey: "abc" },
    });

    expect(redacted.route).toBe("/api/customers");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.database_url).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).apiKey).toBe(
      "[REDACTED]",
    );
  });

  it("emits a single-line JSON log", () => {
    const line = formatStructuredLogLine({
      level: "info",
      message: "hello",
      bindings: { requestId: "req-1", password: "nope" },
    });
    const parsed = JSON.parse(line) as Record<string, unknown>;

    expect(parsed.message).toBe("hello");
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("prometheus registry", () => {
  it("renders http and process metrics", () => {
    const registry = getMetricsRegistry();
    registry.observeHttpRequest({
      method: "GET",
      route: "/api/health",
      status: 200,
      durationMs: 12,
    });

    const text = registry.renderPrometheus();
    expect(text).toContain("http_requests_total");
    expect(text).toContain("process_uptime_seconds");
    expect(text).toContain('route="/api/health"');
  });
});
