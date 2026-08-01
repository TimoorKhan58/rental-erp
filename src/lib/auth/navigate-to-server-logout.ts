import { ROUTES } from "@/config/routes";
import { clearAuthStorage } from "@/lib/auth/token-storage";

/**
 * Single UI logout entry: navigate to the server `/logout` route handler,
 * which clears Better Auth session cookies and redirects to login.
 */
export function navigateToServerLogout(): void {
  clearAuthStorage();

  // Full navigation (not client router): drops in-memory caches and lets the
  // route handler set Set-Cookie headers that RSC/client signOut can miss.
  window.location.assign(ROUTES.logout);
}
