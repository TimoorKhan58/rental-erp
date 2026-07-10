export const IDENTITY_USER_SORT_FIELDS = [
  "name",
  "email",
  "createdAt",
  "isActive",
] as const;

export type IdentityUserSortField = (typeof IDENTITY_USER_SORT_FIELDS)[number];

export const IDENTITY_USER_SEARCH_FIELDS = ["name", "email"] as const;

export const IDENTITY_USER_DEFAULT_SORT_FIELD: IdentityUserSortField = "createdAt";

export const IDENTITY_USER_ENTITY_TYPE = "User";
