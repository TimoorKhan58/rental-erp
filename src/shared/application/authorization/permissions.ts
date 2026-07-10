export const PERMISSIONS = {
  identity: {
    read: "identity:read",
    create: "identity:create",
    update: "identity:update",
    delete: "identity:delete",
  },
  customers: {
    read: "customers:read",
    create: "customers:create",
    update: "customers:update",
    delete: "customers:delete",
  },
  suppliers: {
    read: "suppliers:read",
    create: "suppliers:create",
    update: "suppliers:update",
    delete: "suppliers:delete",
  },
  warehouses: {
    read: "warehouses:read",
    create: "warehouses:create",
    update: "warehouses:update",
    delete: "warehouses:delete",
  },
  products: {
    read: "products:read",
    create: "products:create",
    update: "products:update",
    delete: "products:delete",
  },
  catalog: {
    read: "catalog:read",
    create: "catalog:create",
    update: "catalog:update",
    delete: "catalog:delete",
  },
  inventory: {
    read: "inventory:read",
    create: "inventory:create",
    update: "inventory:update",
    delete: "inventory:delete",
    adjust: "inventory:adjust",
  },
  stockMovements: {
    read: "stock-movements:read",
    create: "stock-movements:create",
  },
  purchaseOrders: {
    read: "purchase-orders:read",
    create: "purchase-orders:create",
    update: "purchase-orders:update",
    approve: "purchase-orders:approve",
    receive: "purchase-orders:receive",
    cancel: "purchase-orders:cancel",
  },
  rentalOrders: {
    read: "rental-orders:read",
    create: "rental-orders:create",
    update: "rental-orders:update",
    confirm: "rental-orders:confirm",
    reserve: "rental-orders:reserve",
    cancel: "rental-orders:cancel",
  },
  dispatches: {
    read: "dispatches:read",
    create: "dispatches:create",
    update: "dispatches:update",
    complete: "dispatches:complete",
    cancel: "dispatches:cancel",
  },
  returns: {
    read: "returns:read",
    create: "returns:create",
    update: "returns:update",
    receive: "returns:receive",
    inspect: "returns:inspect",
    complete: "returns:complete",
    cancel: "returns:cancel",
  },
  repairs: {
    read: "repairs:read",
    create: "repairs:create",
    update: "repairs:update",
    start: "repairs:start",
    complete: "repairs:complete",
    cancel: "repairs:cancel",
  },
  maintenances: {
    read: "maintenances:read",
    create: "maintenances:create",
    update: "maintenances:update",
    start: "maintenances:start",
    complete: "maintenances:complete",
    cancel: "maintenances:cancel",
  },
  rentalInvoices: {
    read: "rental-invoices:read",
    create: "rental-invoices:create",
    update: "rental-invoices:update",
    issue: "rental-invoices:issue",
    void: "rental-invoices:void",
  },
  payments: {
    read: "payments:read",
    create: "payments:create",
    update: "payments:update",
    post: "payments:post",
    void: "payments:void",
  },
  accounts: {
    read: "accounts:read",
    create: "accounts:create",
    update: "accounts:update",
  },
  journalEntries: {
    read: "journal-entries:read",
    create: "journal-entries:create",
    update: "journal-entries:update",
    post: "journal-entries:post",
    void: "journal-entries:void",
  },
  financialReports: {
    read: "financial-reports:read",
  },
  reports: {
    read: "reports:read",
  },
  assets: {
    read: "assets:read",
    create: "assets:create",
    update: "assets:update",
    transfer: "assets:transfer",
    dispose: "assets:dispose",
    maintenance: "assets:maintenance",
  },
  assetCategories: {
    read: "asset-categories:read",
    create: "asset-categories:create",
    update: "asset-categories:update",
    delete: "asset-categories:delete",
  },
  expenses: {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
    approve: "expenses:approve",
    reject: "expenses:reject",
    pay: "expenses:pay",
  },
  audit: {
    read: "audit:read",
  },
  notifications: {
    read: "notifications:read",
    send: "notifications:send",
  },
  dashboard: {
    read: "dashboard:read",
    update: "dashboard:update",
  },
  settings: {
    read: "settings:read",
    update: "settings:update",
  },
  sequences: {
    read: "sequences:read",
    update: "sequences:update",
  },
} as const;

export type Permission = {
  [Module in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[Module][keyof (typeof PERMISSIONS)[Module]];
}[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).flatMap(
  (modulePermissions) => Object.values(modulePermissions),
);
