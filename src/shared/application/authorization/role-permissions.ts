import type { UserRole } from "@/constants/roles";
import { USER_ROLES } from "@/constants/roles";

import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  type Permission,
} from "./permissions";

const READ_PERMISSIONS: Permission[] = [
  PERMISSIONS.identity.read,
  PERMISSIONS.customers.read,
  PERMISSIONS.suppliers.read,
  PERMISSIONS.warehouses.read,
  PERMISSIONS.products.read,
  PERMISSIONS.catalog.read,
  PERMISSIONS.inventory.read,
  PERMISSIONS.rentalOrders.read,
  PERMISSIONS.dispatch.read,
  PERMISSIONS.returns.read,
  PERMISSIONS.repairs.read,
  PERMISSIONS.payments.read,
  PERMISSIONS.expenses.read,
  PERMISSIONS.audit.read,
  PERMISSIONS.notifications.read,
];

const MANAGER_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (permission) => permission !== PERMISSIONS.settings.manage,
);

const WORKER_PERMISSIONS: Permission[] = [
  PERMISSIONS.customers.read,
  PERMISSIONS.suppliers.read,
  PERMISSIONS.warehouses.read,
  PERMISSIONS.products.read,
  PERMISSIONS.catalog.read,
  PERMISSIONS.inventory.read,
  PERMISSIONS.inventory.update,
  PERMISSIONS.inventory.adjust,
  PERMISSIONS.rentalOrders.read,
  PERMISSIONS.dispatch.read,
  PERMISSIONS.dispatch.create,
  PERMISSIONS.dispatch.update,
  PERMISSIONS.dispatch.deliver,
  PERMISSIONS.returns.read,
  PERMISSIONS.returns.create,
  PERMISSIONS.returns.update,
  PERMISSIONS.repairs.read,
  PERMISSIONS.repairs.create,
  PERMISSIONS.repairs.update,
  PERMISSIONS.notifications.read,
];

const ACCOUNTANT_PERMISSIONS: Permission[] = [
  ...READ_PERMISSIONS,
  PERMISSIONS.payments.record,
  PERMISSIONS.payments.refund,
  PERMISSIONS.expenses.create,
  PERMISSIONS.expenses.update,
];

export const ROLE_PERMISSIONS = {
  [USER_ROLES.OWNER]: ALL_PERMISSIONS,
  [USER_ROLES.MANAGER]: MANAGER_PERMISSIONS,
  [USER_ROLES.WORKER]: WORKER_PERMISSIONS,
  [USER_ROLES.ACCOUNTANT]: ACCOUNTANT_PERMISSIONS,
  [USER_ROLES.VIEWER]: READ_PERMISSIONS,
} as const satisfies Record<UserRole, readonly Permission[]>;
