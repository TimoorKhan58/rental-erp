export const REQUEST_ID_HEADER = "x-request-id";
export const CORRELATION_ID_HEADER = "x-correlation-id";
export const TENANT_ID_HEADER = "x-tenant-id";

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function getRequestId(headers?: Headers): string {
  const existing = headers?.get(REQUEST_ID_HEADER)?.trim();

  if (existing) {
    return existing;
  }

  return generateRequestId();
}

/**
 * Correlation ID for distributed tracing across services.
 * Falls back to request ID when the inbound header is absent.
 */
export function getCorrelationId(
  headers?: Headers,
  fallbackRequestId?: string,
): string {
  const existing = headers?.get(CORRELATION_ID_HEADER)?.trim();

  if (existing) {
    return existing;
  }

  return fallbackRequestId ?? getRequestId(headers);
}

/**
 * Optional tenant identifier for future multi-tenant deployments.
 * Single-tenant deployments typically omit this header.
 */
export function getTenantId(headers?: Headers): string | undefined {
  const existing = headers?.get(TENANT_ID_HEADER)?.trim();
  return existing && existing.length > 0 ? existing : undefined;
}
