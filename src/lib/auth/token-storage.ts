/**
 * Token storage abstraction.
 * Better Auth uses HTTP-only cookies; this layer supports optional client-side keys.
 */
export type TokenStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export const AUTH_STORAGE_KEYS = {
  callbackUrl: "rental-erp:callback-url",
  lastEmail: "rental-erp:last-email",
} as const;

function createMemoryStorage(): TokenStorage {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function createBrowserStorage(kind: "local" | "session"): TokenStorage {
  const storage = kind === "local" ? window.localStorage : window.sessionStorage;

  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => {
      storage.setItem(key, value);
    },
    removeItem: (key) => {
      storage.removeItem(key);
    },
  };
}

export function createTokenStorage(preferred: "session" | "local" | "memory" = "session"): TokenStorage {
  if (typeof window === "undefined" || preferred === "memory") {
    return createMemoryStorage();
  }

  try {
    return createBrowserStorage(preferred);
  } catch {
    return createMemoryStorage();
  }
}

export const tokenStorage = createTokenStorage("session");

export function clearAuthStorage(): void {
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    tokenStorage.removeItem(key);
  });
}
