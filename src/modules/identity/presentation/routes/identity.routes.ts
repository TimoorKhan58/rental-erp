export const IDENTITY_ROUTES = {
  base: "/api/users",
  me: "/api/users/me",
  byId: (id: string) => `/api/users/${id}`,
  permissions: (id: string) => `/api/users/${id}/permissions`,
  resetPassword: (id: string) => `/api/users/${id}/reset-password`,
} as const;

export const ROLE_ROUTES = {
  base: "/api/roles",
} as const;
