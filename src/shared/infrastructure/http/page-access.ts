/**
 * Which pages a visitor may open (SaaS phase 3b). Pure, so it is unit
 * tested; src/proxy.ts supplies who is signed in.
 *
 * - business: a signed-in, active business user (the ERP app)
 * - business_password_change: a business user with a temporary password
 *   (SaaS phase 3c); only /change-password until they choose their own
 * - platform: a signed-in, active platform owner (only /platform)
 * - null: nobody signed in
 *
 * Business users opening /platform are let through to the page, which
 * answers "not found" itself, so the platform area does not reveal itself.
 */
export type SignedInKind = "business" | "business_password_change" | "platform" | null;

export type PageAccessDecision =
  | { readonly action: "next" }
  | { readonly action: "redirect"; readonly to: string; readonly callbackUrl?: string };

const PUBLIC_PATHS = new Set(["/", "/login", "/logout", "/unauthorized"]);
const PLATFORM_HOME = "/platform";
export const CHANGE_PASSWORD_PATH = "/change-password";

export function isPlatformPath(pathname: string): boolean {
  return pathname === PLATFORM_HOME || pathname.startsWith(`${PLATFORM_HOME}/`);
}

export function isPublicPagePath(pathname: string, isDevelopment = false): boolean {
  return PUBLIC_PATHS.has(pathname) || (isDevelopment && pathname === "/dev/fluid-grid-qa");
}

/** Where signed-in business users land. */
export const BUSINESS_HOME = "/dashboard";

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

  if (kind === "business_password_change") {
    if (pathname === CHANGE_PASSWORD_PATH || pathname === "/logout") {
      return { action: "next" };
    }
    return { action: "redirect", to: CHANGE_PASSWORD_PATH };
  }

  if (pathname === CHANGE_PASSWORD_PATH && kind === null) {
    return { action: "redirect", to: "/login", callbackUrl: pathname };
  }

  // "/" only redirects to the dashboard; doing that here avoids a blank
  // page while the app shell waits for a redirect that never draws (QA V2).
  if (pathname === "/" && kind === "business") {
    return { action: "redirect", to: BUSINESS_HOME };
  }

  if (isPublicPagePath(pathname, isDevelopment)) {
    if (pathname === "/login" && kind === "business") {
      return { action: "redirect", to: BUSINESS_HOME };
    }
    return { action: "next" };
  }

  if (kind === null) {
    return { action: "redirect", to: "/login", callbackUrl: pathname };
  }

  return { action: "next" };
}
