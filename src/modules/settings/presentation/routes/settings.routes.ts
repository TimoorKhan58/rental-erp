/**
 * Settings API route definitions.
 */

export const SETTINGS_ROUTES = {
  base: "/api/settings",
  sequences: "/api/document-sequences",
  sequenceById: (id: string) => `/api/document-sequences/${id}`,
  generate: (id: string) => `/api/document-sequences/${id}/generate`,
} as const;

export type SettingsRouteKey = keyof typeof SETTINGS_ROUTES;
