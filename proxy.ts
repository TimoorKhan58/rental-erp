import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { ROUTES } from "@/config/routes";
import { auth } from "@/lib/auth";
import {
  resolveActiveSessionUser,
} from "@/shared/infrastructure/auth";
import { isProxyPublicPath } from "@/shared/infrastructure/auth/proxy-public-path";

async function redirectToLogin(
  request: NextRequest,
  pathname: string,
  options?: { clearSession?: boolean },
): Promise<NextResponse> {
  const loginUrl = new URL(ROUTES.login, request.url);

  if (pathname !== ROUTES.login && pathname !== ROUTES.logout) {
    loginUrl.searchParams.set("callbackUrl", pathname);
  }

  const response = NextResponse.redirect(loginUrl);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Pragma", "no-cache");

  if (options?.clearSession) {
    const signOutResponse = await auth.api.signOut({
      headers: await headers(),
      asResponse: true,
    });

    for (const cookie of signOutResponse.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProxyPublicPath(pathname)) {
    if (pathname === ROUTES.login) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session) {
        const activeUser = await resolveActiveSessionUser(session);

        if (activeUser !== null) {
          return NextResponse.redirect(new URL(ROUTES.dashboard, request.url));
        }

        // Stale inactive/unlinked session must not bounce to the app shell.
        return redirectToLogin(request, pathname, { clearSession: true });
      }
    }

    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirectToLogin(request, pathname);
  }

  const activeUser = await resolveActiveSessionUser(session);

  if (activeUser === null) {
    return redirectToLogin(request, pathname, { clearSession: true });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
