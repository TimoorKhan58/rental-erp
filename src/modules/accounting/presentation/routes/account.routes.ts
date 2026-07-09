export const ACCOUNT_ROUTES = {
  base: "/api/accounts",
  byId: (id: string) => `/api/accounts/${id}`,
} as const;

export const JOURNAL_ENTRY_ROUTES = {
  base: "/api/journal-entries",
  byId: (id: string) => `/api/journal-entries/${id}`,
  post: (id: string) => `/api/journal-entries/${id}/post`,
  void: (id: string) => `/api/journal-entries/${id}/void`,
} as const;
