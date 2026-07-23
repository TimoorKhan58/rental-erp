export const RENTAL_INVOICE_ROUTES = {
  base: "/api/rental-invoices",
  generate: "/api/rental-invoices/generate",
  byId: (id: string) => `/api/rental-invoices/${id}`,
  issue: (id: string) => `/api/rental-invoices/${id}/issue`,
  void: (id: string) => `/api/rental-invoices/${id}/void`,
  convertMissingToLoss: (id: string) =>
    `/api/rental-invoices/${id}/convert-missing-to-loss`,
} as const;

export type RentalInvoiceRouteKey = keyof typeof RENTAL_INVOICE_ROUTES;
