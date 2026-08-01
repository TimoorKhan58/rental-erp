import { afterEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/config/routes";
import { AUTH_STORAGE_KEYS, tokenStorage } from "@/lib/auth/token-storage";
import { navigateToServerLogout } from "./navigate-to-server-logout";

describe("navigateToServerLogout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
      tokenStorage.removeItem(key);
    });
  });

  it("clears client auth storage and navigates to the server logout route", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign },
    });

    tokenStorage.setItem(AUTH_STORAGE_KEYS.lastEmail, "ada@example.com");
    tokenStorage.setItem(AUTH_STORAGE_KEYS.callbackUrl, "/dashboard");

    navigateToServerLogout();

    expect(tokenStorage.getItem(AUTH_STORAGE_KEYS.lastEmail)).toBeNull();
    expect(tokenStorage.getItem(AUTH_STORAGE_KEYS.callbackUrl)).toBeNull();
    expect(assign).toHaveBeenCalledWith(ROUTES.logout);
  });
});
