import type { NextRequest } from "next/server";

export interface MockRequestOptions {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  json?: unknown;
}

export function createMockNextRequest(
  options: MockRequestOptions = {},
): NextRequest {
  const url = options.url ?? "http://localhost/api/inventory";
  const headers = new Headers(options.headers ?? {});

  return {
    headers,
    nextUrl: new URL(url),
    json: async () => options.json,
  } as NextRequest;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
