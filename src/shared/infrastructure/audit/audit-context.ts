import type { AuditContext } from "./audit-logger.interface";

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAuditContext(context: Partial<AuditContext>): AuditContext {
  const normalized: AuditContext = {};

  const userId = normalizeOptionalString(context.userId);
  const moduleName = normalizeOptionalString(context.module);
  const ipAddress = normalizeOptionalString(context.ipAddress);
  const userAgent = normalizeOptionalString(context.userAgent);
  const requestId = normalizeOptionalString(context.requestId);
  const httpMethod = normalizeOptionalString(context.httpMethod);
  const route = normalizeOptionalString(context.route);

  if (userId !== undefined) {
    normalized.userId = userId;
  }

  if (moduleName !== undefined) {
    normalized.module = moduleName;
  }

  if (ipAddress !== undefined) {
    normalized.ipAddress = ipAddress;
  }

  if (userAgent !== undefined) {
    normalized.userAgent = userAgent;
  }

  if (requestId !== undefined) {
    normalized.requestId = requestId;
  }

  if (httpMethod !== undefined) {
    normalized.httpMethod = httpMethod;
  }

  if (route !== undefined) {
    normalized.route = route;
  }

  return normalized;
}

export function createAuditContext(
  input: Partial<AuditContext> = {},
): AuditContext {
  return normalizeAuditContext(input);
}

export function mergeAuditContext(
  base: AuditContext,
  override: Partial<AuditContext>,
): AuditContext {
  return normalizeAuditContext({
    ...base,
    ...override,
  });
}
