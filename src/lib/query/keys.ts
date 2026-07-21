/**
 * Generic query key factory helpers.
 * Module-specific keys should extend these patterns in future phases.
 */
export const queryKeys = {
  all: ["app"] as const,
  auth: {
    all: ["app", "auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  lists: () => [...queryKeys.all, "list"] as const,
  list: (resource: string, params?: Record<string, unknown>) =>
    [...queryKeys.lists(), resource, params ?? {}] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (resource: string, id: string) =>
    [...queryKeys.details(), resource, id] as const,
  dashboard: {
    all: ["app", "dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all, "summary"] as const,
    metrics: () => [...queryKeys.dashboard.all, "metrics"] as const,
    activity: () => [...queryKeys.dashboard.all, "activity"] as const,
    notifications: () => [...queryKeys.dashboard.all, "notifications"] as const,
    tasks: () => [...queryKeys.dashboard.all, "tasks"] as const,
    revenue: () => [...queryKeys.dashboard.all, "revenue"] as const,
    rentalTrends: () => [...queryKeys.dashboard.all, "rental-trends"] as const,
    inventory: () => [...queryKeys.dashboard.all, "inventory"] as const,
    financial: () => [...queryKeys.dashboard.all, "financial"] as const,
    systemStatus: () => [...queryKeys.dashboard.all, "system-status"] as const,
    quickActions: () => [...queryKeys.dashboard.all, "quick-actions"] as const,
  },
  customers: {
    all: ["app", "customers"] as const,
    lists: () => [...queryKeys.customers.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.customers.lists(), params ?? {}] as const,
    details: () => [...queryKeys.customers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  suppliers: {
    all: ["app", "suppliers"] as const,
    lists: () => [...queryKeys.suppliers.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.suppliers.lists(), params ?? {}] as const,
    details: () => [...queryKeys.suppliers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
  },
  warehouses: {
    all: ["app", "warehouses"] as const,
    lists: () => [...queryKeys.warehouses.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.warehouses.lists(), params ?? {}] as const,
    details: () => [...queryKeys.warehouses.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.warehouses.details(), id] as const,
  },
  products: {
    all: ["app", "products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.products.lists(), params ?? {}] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    catalog: {
      categories: () => [...queryKeys.products.all, "catalog", "categories"] as const,
      brands: () => [...queryKeys.products.all, "catalog", "brands"] as const,
      units: () => [...queryKeys.products.all, "catalog", "units"] as const,
    },
  },
  inventory: {
    all: ["app", "inventory"] as const,
    lists: () => [...queryKeys.inventory.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.inventory.lists(), params ?? {}] as const,
    details: () => [...queryKeys.inventory.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.inventory.details(), id] as const,
  },
  procurement: {
    all: ["app", "procurement"] as const,
    lists: () => [...queryKeys.procurement.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.procurement.lists(), params ?? {}] as const,
    details: () => [...queryKeys.procurement.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.procurement.details(), id] as const,
  },
  rentalOrders: {
    all: ["app", "rental-orders"] as const,
    lists: () => [...queryKeys.rentalOrders.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.rentalOrders.lists(), params ?? {}] as const,
    details: () => [...queryKeys.rentalOrders.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.rentalOrders.details(), id] as const,
  },
  dispatches: {
    all: ["app", "dispatches"] as const,
    lists: () => [...queryKeys.dispatches.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.dispatches.lists(), params ?? {}] as const,
    details: () => [...queryKeys.dispatches.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.dispatches.details(), id] as const,
  },
  returns: {
    all: ["app", "returns"] as const,
    lists: () => [...queryKeys.returns.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.returns.lists(), params ?? {}] as const,
    details: () => [...queryKeys.returns.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.returns.details(), id] as const,
  },
  repairs: {
    all: ["app", "repairs"] as const,
    lists: () => [...queryKeys.repairs.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.repairs.lists(), params ?? {}] as const,
    details: () => [...queryKeys.repairs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.repairs.details(), id] as const,
  },
  maintenances: {
    all: ["app", "maintenances"] as const,
    lists: () => [...queryKeys.maintenances.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.maintenances.lists(), params ?? {}] as const,
    details: () => [...queryKeys.maintenances.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.maintenances.details(), id] as const,
  },
  rentalInvoices: {
    all: ["app", "rental-invoices"] as const,
    lists: () => [...queryKeys.rentalInvoices.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.rentalInvoices.lists(), params ?? {}] as const,
    details: () => [...queryKeys.rentalInvoices.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.rentalInvoices.details(), id] as const,
  },
  payments: {
    all: ["app", "payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.payments.lists(), params ?? {}] as const,
    details: () => [...queryKeys.payments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
  },
  accounting: {
    all: ["app", "accounting"] as const,
    summary: (params?: Record<string, unknown>) =>
      [...queryKeys.accounting.all, "summary", params ?? {}] as const,
    accounts: {
      all: () => [...queryKeys.accounting.all, "accounts"] as const,
      lists: () => [...queryKeys.accounting.accounts.all(), "list"] as const,
      list: (params?: Record<string, unknown>) =>
        [...queryKeys.accounting.accounts.lists(), params ?? {}] as const,
    },
    journalEntries: {
      all: () => [...queryKeys.accounting.all, "journal-entries"] as const,
      lists: () => [...queryKeys.accounting.journalEntries.all(), "list"] as const,
      list: (params?: Record<string, unknown>) =>
        [...queryKeys.accounting.journalEntries.lists(), params ?? {}] as const,
      details: () => [...queryKeys.accounting.journalEntries.all(), "detail"] as const,
      detail: (id: string) =>
        [...queryKeys.accounting.journalEntries.details(), id] as const,
    },
    trialBalance: (params?: Record<string, unknown>) =>
      [...queryKeys.accounting.all, "trial-balance", params ?? {}] as const,
    generalLedger: (params?: Record<string, unknown>) =>
      [...queryKeys.accounting.all, "general-ledger", params ?? {}] as const,
  },
  financialReports: {
    all: ["app", "financial-reports"] as const,
    profitLoss: (params?: Record<string, unknown>) =>
      [...queryKeys.financialReports.all, "profit-loss", params ?? {}] as const,
    balanceSheet: (params?: Record<string, unknown>) =>
      [...queryKeys.financialReports.all, "balance-sheet", params ?? {}] as const,
    cashFlow: (params?: Record<string, unknown>) =>
      [...queryKeys.financialReports.all, "cash-flow", params ?? {}] as const,
    revenue: (params?: Record<string, unknown>) =>
      [...queryKeys.financialReports.all, "revenue", params ?? {}] as const,
    expenses: (params?: Record<string, unknown>) =>
      [...queryKeys.financialReports.all, "expenses", params ?? {}] as const,
  },
  reports: {
    all: ["app", "reports"] as const,
    rentals: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "rentals", params ?? {}] as const,
    inventory: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "inventory", params ?? {}] as const,
    customers: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "customers", params ?? {}] as const,
    products: (params?: Record<string, unknown>) =>
      [...queryKeys.reports.all, "products", params ?? {}] as const,
  },
  audit: {
    all: ["app", "audit"] as const,
    lists: () => [...queryKeys.audit.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.audit.lists(), params ?? {}] as const,
    details: () => [...queryKeys.audit.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.audit.details(), id] as const,
  },
  notifications: {
    all: ["app", "notifications"] as const,
    lists: () => [...queryKeys.notifications.all, "list"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.notifications.lists(), params ?? {}] as const,
    details: () => [...queryKeys.notifications.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.notifications.details(), id] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unread-count"] as const,
  },
  settings: {
    all: ["app", "settings"] as const,
    detail: () => [...queryKeys.settings.all, "detail"] as const,
    profile: () => [...queryKeys.settings.all, "profile"] as const,
  },
  permissions: {
    me: () => ["app", "permissions", "me"] as const,
  },
} as const;

export type QueryKeyFactory = typeof queryKeys;
