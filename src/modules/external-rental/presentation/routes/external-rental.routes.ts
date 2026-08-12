export const EXTERNAL_RENTAL_ROUTES = {
  base: "/api/external-rentals",
  byId: (id: string) => `/api/external-rentals/${id}`,
  confirm: (id: string) => `/api/external-rentals/${id}/confirm`,
  receive: (id: string) => `/api/external-rentals/${id}/receive`,
  allocate: (id: string) => `/api/external-rentals/${id}/allocate`,
  returnToSupplier: (id: string) =>
    `/api/external-rentals/${id}/return-to-supplier`,
  settle: (id: string) => `/api/external-rentals/${id}/settle`,
  cancel: (id: string) => `/api/external-rentals/${id}/cancel`,
} as const;

export type ExternalRentalRouteKey = keyof typeof EXTERNAL_RENTAL_ROUTES;
