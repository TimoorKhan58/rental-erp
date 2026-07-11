/**
 * Frontend API configuration.
 * Backend base URL is same-origin; cookies carry the session.
 */
export const apiConfig = {
  baseUrl: "/api",
  timeout: 30_000,
  withCredentials: true,
} as const;

export type ApiConfig = typeof apiConfig;
