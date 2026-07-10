import type { NextRequest } from "next/server";

export interface MockRequestOptions {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  json?: unknown;
}

export function createMockNextRequest(
  options: MockRequestOptions | string = {},
): NextRequest {
  const normalized =
    typeof options === "string" ? { url: options } : options;
  const url = normalized.url ?? "http://localhost/api/users";
  const headers = new Headers(normalized.headers ?? {});

  return {
    headers,
    nextUrl: new URL(url),
    json: async () => normalized.json,
  } as NextRequest;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
