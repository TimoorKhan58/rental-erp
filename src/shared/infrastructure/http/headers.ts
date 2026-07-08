export const REQUEST_ID_HEADER = "x-request-id";

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
