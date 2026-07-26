import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/config/routes";
import { auth } from "@/lib/auth";

/**
 * Must be a Route Handler, not a page: Next.js silently drops cookie writes
 * during a Server Component render, so `signOut` would delete the database
 * session while leaving the session cookie (and its cache) intact.
 */
export async function GET(request: NextRequest) {
  const signOutResponse = await auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  });

  const response = NextResponse.redirect(new URL(ROUTES.login, request.url));

  for (const cookie of signOutResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export const POST = GET;
