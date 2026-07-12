import { NextResponse } from "next/server";

/**
 * @deprecated Phase 8-009 — UX authentication is enforced by root `proxy.ts`
 * (session validation via Better Auth). This legacy cookie-presence middleware
 * is disabled to prevent spoofable cookie checks from acting as a security gate.
 *
 * API authorization remains in `authenticateApiRequest` + RBAC.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
