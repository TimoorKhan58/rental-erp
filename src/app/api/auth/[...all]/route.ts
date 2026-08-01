import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, private");
  headers.set("Pragma", "no-cache");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: Request): Promise<Response> {
  const response = await handlers.GET(request);
  return withNoStore(response);
}

export async function POST(request: Request): Promise<Response> {
  const response = await handlers.POST(request);
  return withNoStore(response);
}
