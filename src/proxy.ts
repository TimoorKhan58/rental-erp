import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findActivePlatformOwner } from "@/modules/platform/infrastructure/platform-owner.repository";
import { resolveSessionUser } from "@/shared/infrastructure/auth/resolve-session-user";
import { ensureActiveErpUser } from "@/shared/infrastructure/auth/ensure-active-erp-user";
import {
  decidePageAccess,
  type SignedInKind,
} from "@/shared/infrastructure/http/page-access";

/**
 * API routes authenticate themselves (authenticateApiRequest) and answer
 * with a JSON 401/403. Redirecting them to the HTML login page here would
 * break API clients, so the proxy only gates pages.
 */
function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Who is signed in: an active business user, an active platform owner, or nobody. */
async function getSignedInKind(): Promise<SignedInKind> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const resolved = resolveSessionUser(session);

  if (resolved === null) {
    // No ERP user: only an active platform owner may be signed in.
    const owner = await findActivePlatformOwner(prisma, session.user.id).catch(() => null);
    return owner === null ? null : "platform";
  }

  try {
    await ensureActiveErpUser(resolved.erpUserId);
    return "business";
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiPath(pathname) || pathname === "/logout") {
    return NextResponse.next();
  }

  const decision = decidePageAccess(
    pathname,
    await getSignedInKind(),
    process.env.NODE_ENV === "development",
  );

  if (decision.action === "next") {
    return NextResponse.next();
  }

  const target = new URL(decision.to, request.url);
  if (decision.callbackUrl !== undefined) {
    target.searchParams.set("callbackUrl", decision.callbackUrl);
  }
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
