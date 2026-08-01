import {
  PUBLIC_API_EXACT_PATHS,
  PUBLIC_API_PATH_PREFIXES,
  PUBLIC_ROUTES,
} from "@/config/routes";

const PUBLIC_PAGE_PATHS = new Set<string>(PUBLIC_ROUTES);

function matchesPublicApiPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Path policy for root `proxy.ts` UX gate.
 * Page allowlist comes from `PUBLIC_ROUTES` (single source of truth).
 * API allowlist comes from `PUBLIC_API_PATH_PREFIXES` / `PUBLIC_API_EXACT_PATHS`.
 */
export function isProxyPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    return true;
  }

  for (const prefix of PUBLIC_API_PATH_PREFIXES) {
    if (matchesPublicApiPrefix(pathname, prefix)) {
      return true;
    }
  }

  for (const exact of PUBLIC_API_EXACT_PATHS) {
    if (pathname === exact) {
      return true;
    }
  }

  return false;
}
