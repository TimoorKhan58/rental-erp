import { headers } from "next/headers";
import { ROUTES } from "@/config/routes";
import { auth } from "@/lib/auth";

/**
 * Must be a Route Handler, not a page: Next.js silently drops cookie writes
 * during a Server Component render, so `signOut` would delete the database
 * session while leaving the session cookie (and its cache) intact.
 */
export async function GET() {
  const signOutResponse = await auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  });

  // A relative address keeps people on the site they used. request.url
  // carries the server's own host name (e.g. localhost), which sent people
  // signing out from another address to the wrong place (QA X6).
  const response = new Response(null, {
    status: 307,
    headers: { location: ROUTES.login },
  });

  for (const cookie of signOutResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export const POST = GET;
