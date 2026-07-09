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
  rentalOrders: {
    read: "rental-orders:read",
    create: "rental-orders:create",
    update: "rental-orders:update",
    approve: "rental-orders:approve",
    cancel: "rental-orders:cancel",
  },
  dispatch: {
    read: "dispatch:read",
    create: "dispatch:create",
    update: "dispatch:update",
    deliver: "dispatch:deliver",
  },
  returns: {
    read: "returns:read",
    create: "returns:create",
    update: "returns:update",
  },
  repairs: {
    read: "repairs:read",
    create: "repairs:create",
    update: "repairs:update",
  },
  payments: {
    read: "payments:read",
    record: "payments:record",
    refund: "payments:refund",
  },
  expenses: {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
  },
  audit: {
    read: "audit:read",
  },
  notifications: {
    read: "notifications:read",
    send: "notifications:send",
  },
  settings: {
    manage: "settings:manage",
  },
} as const;

export type Permission = {
  [Module in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[Module][keyof (typeof PERMISSIONS)[Module]];
}[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).flatMap(
  (modulePermissions) => Object.values(modulePermissions),
);
