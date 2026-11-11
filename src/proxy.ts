import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveSessionUser } from "@/shared/infrastructure/auth/resolve-session-user";
import { ensureActiveErpUser } from "@/shared/infrastructure/auth/ensure-active-erp-user";

const PUBLIC_PATHS = new Set(["/", "/login", "/logout", "/unauthorized"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  // Dev-only layout QA harness (no session) — presentation verification.
  if (
    process.env.NODE_ENV === "development" &&
    pathname === "/dev/fluid-grid-qa"
  ) {
    return true;
  }

  return false;
}

/**
 * API routes authenticate themselves (authenticateApiRequest) and answer
 * with a JSON 401/403. Redirecting them to the HTML login page here would
 * break API clients, so the proxy only gates pages.
 */
function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

async function hasActiveSession(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return false;
  }

  const resolved = resolveSessionUser(session);

  if (resolved === null) {
    return false;
  }

  try {
    await ensureActiveErpUser(resolved.erpUserId);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiPath(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if (pathname === "/login") {
      if (await hasActiveSession()) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return NextResponse.next();
  }

  if (!(await hasActiveSession())) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
