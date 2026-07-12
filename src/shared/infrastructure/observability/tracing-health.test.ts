import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  getRequestDurationMs,
} from "@/shared/application/context/request-context";
import {
  getCorrelationId,
  getRequestId,
} from "@/shared/infrastructure/http/headers";
import { toJsonResponse } from "@/shared/infrastructure/http/to-json-response";
import { checkStartupHealth } from "@/shared/infrastructure/observability/application-health";
import { enterRequestTrace } from "@/shared/infrastructure/observability/request-trace-als";
import { createAppLogger } from "@/shared/infrastructure/logging/create-app-logger";

describe("request tracing", () => {
  it("propagates request and correlation ids", () => {
    const headers = new Headers({
      "x-request-id": "req-fixed-001",
      "x-correlation-id": "corr-fixed-001",
      "x-tenant-id": "tenant-a",
    });

    const requestId = getRequestId(headers);
    const correlationId = getCorrelationId(headers, requestId);
    expect(requestId).toBe("req-fixed-001");
    expect(correlationId).toBe("corr-fixed-001");

    const ctx = createRequestContext({
      requestId,
      correlationId,
      tenantId: "tenant-a",
      route: "/api/demo",
      httpMethod: "GET",
    });

    expect(ctx.tenantId).toBe("tenant-a");
    expect(getRequestDurationMs(ctx)).toBeGreaterThanOrEqual(0);

    enterRequestTrace({
      requestId,
      correlationId,
      tenantId: "tenant-a",
      route: "/api/demo",
      httpMethod: "GET",
      startedAtMs: ctx.startedAtMs,
    });

    const response = toJsonResponse({
      status: 200,
      body: { data: { ok: true }, requestId },
    });

    expect(response.headers.get("x-request-id")).toBe("req-fixed-001");
    expect(response.headers.get("x-correlation-id")).toBe("corr-fixed-001");
  });
});

describe("startup health", () => {
  it("reports configuration and prisma checks", () => {
    const snapshot = checkStartupHealth();
    expect(snapshot.service).toBe("rental-erp");
    expect(snapshot.checks.configuration).toBeDefined();
    expect(snapshot.checks.prisma).toBeDefined();
  });
});

describe("app logger", () => {
  it("creates a logger that accepts structured meta", () => {
    const logger = createAppLogger({ level: "error", format: "json" });
    expect(() =>
      logger.error("validation", new Error("boom"), { password: "secret" }),
    ).not.toThrow();
  });
});
