import { ROUTES } from "@/config/routes";
import type { NavigationGroup, NavigationItem } from "./navigation.types";
import {
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  Settings2,
  ShoppingCart,
  Truck,
  Undo2,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

export type { NavigationGroup, NavigationItem } from "./navigation.types";

/** Grouped application navigation — organized by business domain. */
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
    ],
  },
  {
    label: "Master Data",
    items: [
      { label: "Customers", href: ROUTES.customers, icon: Users },
      { label: "Suppliers", href: ROUTES.suppliers, icon: Building2 },
      { label: "Warehouses", href: ROUTES.warehouses, icon: Warehouse },
      { label: "Products", href: ROUTES.products, icon: Box },
      { label: "Inventory", href: ROUTES.inventory, icon: Package },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Procurement", href: ROUTES.procurements, icon: ShoppingCart },
      { label: "Rental Orders", href: ROUTES.rentalOrders, icon: ClipboardList },
      {
        label: "Reservation Calendar",
        href: ROUTES.rentalOrdersCalendar,
        icon: CalendarDays,
      },
      { label: "Deliveries", href: ROUTES.dispatches, icon: Truck },
      { label: "Returns", href: ROUTES.returns, icon: Undo2 },
      { label: "Repairs", href: ROUTES.repairs, icon: Wrench },
      { label: "Maintenance", href: ROUTES.maintenance, icon: Settings2 },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Rental Invoices", href: ROUTES.rentalInvoices, icon: FileText },
      { label: "Payments", href: ROUTES.payments, icon: CreditCard },
      { label: "Accounting", href: ROUTES.accounting, icon: BookOpen },
      { label: "Reports", href: ROUTES.reports, icon: BarChart3 },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Audit", href: ROUTES.audit, icon: ScrollText },
      { label: "Notifications", href: ROUTES.notifications, icon: Bell },
      { label: "Settings", href: ROUTES.settings, icon: Settings },
    ],
  },
];

/** Flat list — backward compatible for consumers that expect a single array. */
export const NAVIGATION_ITEMS: NavigationItem[] = NAVIGATION_GROUPS.flatMap(
  (group) => group.items,
);
