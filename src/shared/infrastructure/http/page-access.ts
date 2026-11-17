/**
 * Which pages a visitor may open (SaaS phase 3b). Pure, so it is unit
 * tested; src/proxy.ts supplies who is signed in.
 *
 * - business: a signed-in, active business user (the ERP app)
 * - platform: a signed-in, active platform owner (only /platform)
 * - null: nobody signed in
 *
 * Business users opening /platform are let through to the page, which
 * answers "not found" itself, so the platform area does not reveal itself.
 */
export type SignedInKind = "business" | "platform" | null;

export type PageAccessDecision =
  | { readonly action: "next" }
  | { readonly action: "redirect"; readonly to: string; readonly callbackUrl?: string };

const PUBLIC_PATHS = new Set(["/", "/login", "/logout", "/unauthorized"]);
const PLATFORM_HOME = "/platform";

export function isPlatformPath(pathname: string): boolean {
  return pathname === PLATFORM_HOME || pathname.startsWith(`${PLATFORM_HOME}/`);
}

export function isPublicPagePath(pathname: string, isDevelopment = false): boolean {
  return PUBLIC_PATHS.has(pathname) || (isDevelopment && pathname === "/dev/fluid-grid-qa");
}

export function decidePageAccess(
  pathname: string,
  kind: SignedInKind,
  isDevelopment = false,
): PageAccessDecision {
  if (kind === "platform") {
    if (isPlatformPath(pathname) || pathname === "/logout" || pathname === "/unauthorized") {
      return { action: "next" };
    }
    // Everything else (the business app, the login page, "/") belongs to
    // business users: send platform owners home.
    return { action: "redirect", to: PLATFORM_HOME };
  }

  if (isPublicPagePath(pathname, isDevelopment)) {
    if (pathname === "/login" && kind === "business") {
      return { action: "redirect", to: "/" };
    }
    return { action: "next" };
  }

  if (kind === null) {
    return { action: "redirect", to: "/login", callbackUrl: pathname };
  }

  return { action: "next" };
}
