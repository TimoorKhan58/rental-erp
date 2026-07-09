export const RENTAL_INVOICE_ROUTES = {
  base: "/api/rental-invoices",
  byId: (id: string) => `/api/rental-invoices/${id}`,
  issue: (id: string) => `/api/rental-invoices/${id}/issue`,
  void: (id: string) => `/api/rental-invoices/${id}/void`,
} as const;

export type RentalInvoiceRouteKey = keyof typeof RENTAL_INVOICE_ROUTES;
