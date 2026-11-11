import { ROUTES } from "@/config/routes";
import { PERMISSIONS, type Permission } from "@/shared/application/authorization/permissions";
import type { NavigationGroup } from "./navigation.types";

/**
 * Presentation-only visibility map.
 * Matches the :read (or equivalent) gate already used by each destination page.
 * API authorization remains authoritative.
 */
export const NAV_ITEM_REQUIRED_ANY: Record<string, readonly Permission[]> = {
  [ROUTES.dashboard]: [PERMISSIONS.dashboard.read],
  [ROUTES.rentalOrders]: [PERMISSIONS.rentalOrders.read],
  [ROUTES.rentalOrdersCalendar]: [PERMISSIONS.rentalOrders.read],
  [ROUTES.dispatches]: [PERMISSIONS.dispatches.read],
  [ROUTES.returns]: [PERMISSIONS.returns.read],
  [ROUTES.externalRentals]: [PERMISSIONS.externalRentals.read],
  [ROUTES.procurements]: [PERMISSIONS.purchaseOrders.read],
  [ROUTES.repairs]: [PERMISSIONS.repairs.read],
  [ROUTES.maintenance]: [PERMISSIONS.maintenances.read],
  [ROUTES.customers]: [PERMISSIONS.customers.read],
  [ROUTES.inventory]: [PERMISSIONS.inventory.read],
  [ROUTES.products]: [PERMISSIONS.products.read],
  [ROUTES.catalog]: [PERMISSIONS.catalog.read],
  [ROUTES.assets]: [PERMISSIONS.assets.read],
  [ROUTES.warehouses]: [PERMISSIONS.warehouses.read],
  [ROUTES.suppliers]: [PERMISSIONS.suppliers.read],
  [ROUTES.rentalInvoices]: [PERMISSIONS.rentalInvoices.read],
  [ROUTES.payments]: [PERMISSIONS.payments.read],
  [ROUTES.expenses]: [PERMISSIONS.expenses.read],
  [ROUTES.accounting]: [
    PERMISSIONS.accounts.read,
    PERMISSIONS.journalEntries.read,
    PERMISSIONS.financialReports.read,
  ],
  [ROUTES.reports]: [PERMISSIONS.financialReports.read, PERMISSIONS.reports.read],
  [ROUTES.users]: [PERMISSIONS.identity.read],
  [ROUTES.audit]: [PERMISSIONS.audit.read],
  [ROUTES.notifications]: [PERMISSIONS.notifications.read],
  [ROUTES.settings]: [PERMISSIONS.settings.read, PERMISSIONS.identity.read],
};

export const QUICK_ACTION_REQUIRED_ANY: Record<string, readonly Permission[]> = {
  [ROUTES.rentalOrdersNew]: [PERMISSIONS.rentalOrders.create],
  [ROUTES.customersNew]: [PERMISSIONS.customers.create],
  [ROUTES.paymentsNew]: [PERMISSIONS.payments.create],
};

export function canAccessWithPermissions(
  requiredAny: readonly Permission[] | undefined,
  permissions: readonly string[],
): boolean {
  if (requiredAny === undefined || requiredAny.length === 0) {
    return true;
  }

  return requiredAny.some((permission) => permissions.includes(permission));
}

export function canAccessNavHref(
  href: string,
  permissions: readonly string[],
): boolean {
  return canAccessWithPermissions(NAV_ITEM_REQUIRED_ANY[href], permissions);
}

export function filterNavigationGroups(
  groups: readonly NavigationGroup[],
  permissions: readonly string[],
): NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavHref(item.href, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}
