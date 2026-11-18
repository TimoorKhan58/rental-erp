import { ROUTES } from "@/config/routes";
import type { NavigationGroup, NavigationItem } from "./navigation.types";
import {
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  PackageOpen,
  Receipt,
  ScrollText,
  Settings,
  Settings2,
  ShoppingCart,
  Tags,
  Truck,
  Undo2,
  UserCog,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

export type { NavigationGroup, NavigationItem } from "./navigation.types";

/**
 * Grouped by daily work, in plain words (usability revamp R5): rentals,
 * then money, then customers and stock, then buying and upkeep, then admin.
 */
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "Today",
    items: [{ label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard }],
  },
  {
    label: "Rentals",
    items: [
      { label: "Rental Orders", href: ROUTES.rentalOrders, icon: ClipboardList },
      { label: "Booking Calendar", href: ROUTES.rentalOrdersCalendar, icon: CalendarDays },
      { label: "Dispatches", href: ROUTES.dispatches, icon: Truck },
      { label: "Returns", href: ROUTES.returns, icon: Undo2 },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Invoices", href: ROUTES.rentalInvoices, icon: FileText },
      { label: "Payments", href: ROUTES.payments, icon: CreditCard },
      { label: "Expenses", href: ROUTES.expenses, icon: Receipt },
      { label: "Reports", href: ROUTES.reports, icon: BarChart3 },
      { label: "Accounting", href: ROUTES.accounting, icon: BookOpen },
    ],
  },
  {
    label: "Customers & stock",
    items: [
      { label: "Customers", href: ROUTES.customers, icon: Users },
      { label: "Inventory", href: ROUTES.inventory, icon: Package },
      { label: "Products", href: ROUTES.products, icon: Box },
      { label: "Catalog", href: ROUTES.catalog, icon: Tags },
      { label: "Warehouses", href: ROUTES.warehouses, icon: Warehouse },
    ],
  },
  {
    label: "Buying & upkeep",
    items: [
      { label: "Purchases", href: ROUTES.procurements, icon: ShoppingCart },
      { label: "Suppliers", href: ROUTES.suppliers, icon: Building2 },
      { label: "External Rentals", href: ROUTES.externalRentals, icon: PackageOpen },
      { label: "Repairs", href: ROUTES.repairs, icon: Wrench },
      { label: "Maintenance", href: ROUTES.maintenance, icon: Settings2 },
      { label: "Assets", href: ROUTES.assets, icon: Boxes },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", href: ROUTES.users, icon: UserCog },
      { label: "Activity Log", href: ROUTES.audit, icon: ScrollText },
      { label: "Notifications", href: ROUTES.notifications, icon: Bell },
      { label: "Settings", href: ROUTES.settings, icon: Settings },
    ],
  },
];

/** Flat list — backward compatible for consumers that expect a single array. */
export const NAVIGATION_ITEMS: NavigationItem[] = NAVIGATION_GROUPS.flatMap(
  (group) => group.items,
);
